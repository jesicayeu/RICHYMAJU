<?php

namespace App\Http\Controllers;

use App\Models\Debt;
use App\Models\Transaction;
use App\Models\User;
use App\Services\WhatsappNotificationService;
use App\Support\Audit;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class TransactionController extends Controller
{
    public function index(Request $request): Response
    {
        $filters = $request->only([
            'type',
            'ui_status',
            'verification_status',
            'date',
            'amount',
            'user_id',
            'search',
            'sort',
            'direction',
            'per_page',
            'income_period',
            'expense_period',
        ]);

        $baseQuery = Transaction::query()->with(['user', 'verifier']);

        if (! $request->user()->isAdmin()) {
            $baseQuery->where('user_id', $request->user()->id);
        }

        $filteredQuery = clone $baseQuery;
        $this->applyFilters($filteredQuery, $filters);
        $this->applySearch($filteredQuery, $filters['search'] ?? null);

        $sort = in_array($filters['sort'] ?? '', ['occurred_at', 'amount', 'type', 'ui_status'], true)
            ? $filters['sort']
            : 'occurred_at';
        $direction = ($filters['direction'] ?? 'desc') === 'asc' ? 'asc' : 'desc';
        $perPage = in_array((int) ($filters['per_page'] ?? 10), [10, 25, 50, 100], true)
            ? (int) ($filters['per_page'] ?? 10)
            : 10;

        $transactions = (clone $filteredQuery)
            ->orderBy($sort, $direction)
            ->paginate($perPage)
            ->withQueryString();

        $isAdmin = $request->user()->isAdmin();

        $payload = [
            'transactions' => $transactions,
            'filters' => $filters,
            'cashiers' => User::where('role', 'kasir')->orderBy('name')->get(['id', 'name', 'display_name', 'username']),
            'isAdmin' => $isAdmin,
        ];

        if ($isAdmin) {
            $incomePeriod = $this->normalizePeriod($filters['income_period'] ?? '1m', ['1d', '1w', '1m', '3m', '1y']);
            $expensePeriod = $this->normalizePeriod($filters['expense_period'] ?? '1m', ['1d', '3d', '1w', '1m', '3m', '6m', '1y', '2y']);

            $payload['summary'] = $this->buildSummary($filteredQuery);
            $payload['chartIncome'] = $this->buildChart(clone $baseQuery, 'pemasukan', $incomePeriod);
            $payload['chartExpense'] = $this->buildChart(clone $baseQuery, 'pengeluaran', $expensePeriod);
            $payload['incomePeriod'] = $incomePeriod;
            $payload['expensePeriod'] = $expensePeriod;
        }

        return Inertia::render('Transactions/Index', $payload);
    }

    public function create(): Response
    {
        return Inertia::render('Transactions/Form', ['transaction' => null]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $this->validated($request);

        if ($data['type'] === 'pengeluaran' && ($data['expense_target'] ?? 'toko') === 'utang') {
            $debt = DB::transaction(function () use ($request, $data) {
                $debt = Debt::create([
                    'code' => $this->nextCode('UTG'),
                    'user_id' => $request->user()->id,
                    'party_name' => $data['party_name'],
                    'party_type' => 'kita_ke_orang',
                    'item_name' => $data['item_name'],
                    'amount' => $data['amount'],
                    'status' => $data['ui_status'] === 'selesai' ? 'sudah_selesai' : 'belum_selesai',
                    'evidence_path' => $this->storeEvidence($request, 'debts'),
                    'occurred_at' => now(),
                ]);
                Audit::record($debt, 'tambah', [], $debt->toArray(), 'Utang baru dibuat dari form transaksi.');

                return $debt;
            });

            app(WhatsappNotificationService::class)->dispatch(
                'utang_tambah',
                $request->user(),
                $debt,
            );

            return redirect()->route('debts.show', $debt)->with('success', 'Utang tersimpan.');
        }

        unset($data['expense_target'], $data['party_name'], $data['item_name']);

        $transaction = DB::transaction(function () use ($request, $data) {
            $transaction = Transaction::create([
                ...$data,
                'code' => $this->nextCode('TRX'),
                'user_id' => $request->user()->id,
                'evidence_path' => $this->storeEvidence($request, 'transactions'),
                'occurred_at' => now(),
            ]);
            Audit::record($transaction, 'tambah', [], $transaction->toArray(), 'Transaksi baru dibuat.');

            return $transaction;
        });

        app(WhatsappNotificationService::class)->dispatch(
            'transaksi_tambah',
            $request->user(),
            $transaction,
            ['expense_target' => $request->input('expense_target', 'toko')],
        );

        return redirect()->route('transactions.show', $transaction)->with('success', 'Transaksi tersimpan.');
    }

    public function show(Transaction $transaction, Request $request): Response
    {
        $this->authorizeView($transaction, $request);

        return Inertia::render('Transactions/Show', [
            'transaction' => $transaction->load(['user', 'verifier', 'audits.user']),
            'isAdmin' => $request->user()->isAdmin(),
        ]);
    }

    public function edit(Transaction $transaction, Request $request): Response
    {
        $this->authorizeView($transaction, $request);

        return Inertia::render('Transactions/Form', ['transaction' => $transaction]);
    }

    public function update(Transaction $transaction, Request $request): RedirectResponse
    {
        $this->authorizeView($transaction, $request);
        $data = $this->validated($request);
        $before = $transaction->toArray();
        if ($path = $this->storeEvidence($request, 'transactions')) {
            $data['evidence_path'] = $path;
        }
        $transaction->update($data);
        $transaction->refresh();
        Audit::record($transaction, 'edit', $before, $transaction->toArray(), 'Transaksi diperbarui.');

        app(WhatsappNotificationService::class)->dispatch(
            'transaksi_ubah',
            $request->user(),
            $transaction,
        );

        return redirect()->route('transactions.show', $transaction)->with('success', 'Transaksi diperbarui.');
    }

    public function markPaid(Transaction $transaction, Request $request): RedirectResponse
    {
        $this->authorizeView($transaction, $request);
        abort_unless($transaction->type === 'pengeluaran', 422, 'Hanya transaksi pengeluaran yang dapat dilunaskan.');

        $before = $transaction->toArray();
        $transaction->update(['type' => 'pemasukan', 'ui_status' => 'selesai']);
        Audit::record($transaction, 'lunas', $before, $transaction->fresh()->toArray(), 'Pengeluaran ditandai lunas dan berubah menjadi pemasukan.');

        return back()->with('success', 'Transaksi berhasil ditandai lunas.');
    }

    public function destroy(Transaction $transaction, Request $request): RedirectResponse
    {
        abort_unless($request->user()->isAdmin(), 403);

        DB::transaction(function () use ($transaction, $request) {
            $before = $transaction->toArray();
            Audit::record($transaction, 'hapus', $before, [], 'Transaksi dihapus oleh admin.');

            app(WhatsappNotificationService::class)->dispatch(
                'transaksi_hapus',
                $request->user(),
                $transaction,
            );

            if ($transaction->evidence_path) {
                Storage::disk('public')->delete($transaction->evidence_path);
            }
            $transaction->delete();
        });

        return redirect()->route('transactions.index')->with('success', 'Transaksi dihapus.');
    }

    public function verify(Transaction $transaction, Request $request): RedirectResponse
    {
        abort_unless($request->user()->isAdmin(), 403);
        $data = $request->validate([
            'verification_status' => ['required', 'in:disetujui,ditolak'],
            'verification_note' => ['nullable', 'string', 'max:1000'],
        ]);
        $before = $transaction->toArray();
        $transaction->update([
            ...$data,
            'verified_by' => $request->user()->id,
            'verified_at' => now(),
        ]);
        Audit::record($transaction, 'verifikasi', $before, $transaction->fresh()->toArray(), $data['verification_note'] ?? null);

        return back()->with('success', 'Verifikasi transaksi tersimpan.');
    }

    public function export(Request $request)
    {
        abort_unless($request->user()->isAdmin(), 403);

        $filters = $request->only([
            'type',
            'ui_status',
            'verification_status',
            'date',
            'amount',
            'user_id',
            'search',
            'sort',
            'direction',
        ]);

        $filteredQuery = Transaction::query();
        $this->applyFilters($filteredQuery, $filters);
        $this->applySearch($filteredQuery, $filters['search'] ?? null);

        [$sort, $direction] = $this->sortFromFilters($filters);

        $transactions = (clone $filteredQuery)
            ->with('user')
            ->orderBy($sort, $direction)
            ->get();

        Carbon::setLocale('id');

        return Pdf::loadView('pdf.transactions', [
            'transactions' => $transactions,
            'summary' => $this->buildSummary($filteredQuery),
            'periodRange' => $this->periodRangeForPdf($filteredQuery, $filters),
            'printedBy' => $request->user()->display_name ?? $request->user()->name,
            'printedAt' => now(),
            'total' => $transactions->count(),
        ])->download('laporan-transaksi-richy-maju.pdf');
    }

    public function exportSummary(Request $request)
    {
        abort_unless($request->user()->isAdmin(), 403);

        $filters = $request->only([
            'type',
            'ui_status',
            'verification_status',
            'date',
            'amount',
            'user_id',
            'search',
            'per_page',
            'income_period',
            'expense_period',
            'sort',
            'direction',
            'page',
        ]);

        $filteredQuery = Transaction::query();
        $this->applyFilters($filteredQuery, $filters);
        $this->applySearch($filteredQuery, $filters['search'] ?? null);

        $incomePeriod = $this->normalizePeriod($filters['income_period'] ?? '1m', ['1d', '1w', '1m', '3m', '1y']);

        $perPage = in_array((int) ($filters['per_page'] ?? 10), [10, 25, 50, 100], true)
            ? (int) ($filters['per_page'] ?? 10)
            : 10;

        $page = max(1, (int) ($filters['page'] ?? 1));
        [$sort, $direction] = $this->sortFromFilters($filters);

        $transactions = (clone $filteredQuery)
            ->with('user')
            ->orderBy($sort, $direction)
            ->paginate($perPage, ['*'], 'page', $page);

        $summary = $this->buildSummary($filteredQuery);
        $summary['activeCashiers'] = User::where('role', 'kasir')->where('status', 'aktif')->count();

        Carbon::setLocale('id');

        return Pdf::loadView('pdf.transactions-summary', [
            'summary' => $summary,
            'transactions' => $transactions,
            'periodLabel' => $this->periodLabelForPdf($filters, $incomePeriod),
            'printedBy' => $request->user()->name,
        ])->download('laporan-ringkasan-transaksi-richy-maju.pdf');
    }

    private function validated(Request $request): array
    {
        if ($request->has('amount')) {
            $request->merge(['amount' => $this->normalizeAmount($request->input('amount'))]);
        }

        $isDebtExpense = $request->input('type') === 'pengeluaran'
            && $request->input('expense_target') === 'utang'
            && ! $request->route('transaction');

        $rules = [
            'type' => ['required', 'in:pemasukan,pengeluaran'],
            'amount' => ['required', 'integer', 'min:1'],
            'ui_status' => ['required', 'in:belum_selesai,selesai'],
            'evidence' => ['nullable', 'image', 'mimes:jpg,jpeg,png', 'max:5120'],
        ];

        if ($request->isMethod('post') && ! $request->route('transaction')) {
            $rules['expense_target'] = ['required_if:type,pengeluaran', 'in:toko,utang'];
            $rules['party_name'] = ['required_if:expense_target,utang', 'nullable', 'string', 'max:255'];
            $rules['item_name'] = ['required_if:expense_target,utang', 'nullable', 'string', 'max:255'];
            $rules['description'] = [$isDebtExpense ? 'nullable' : 'required', 'nullable', 'string', 'max:2000'];
        } else {
            $rules['description'] = ['required', 'string', 'max:2000'];
        }

        return $request->validate($rules, [
            'type.required' => 'Jenis transaksi wajib dipilih.',
            'amount.required' => 'Nominal wajib diisi.',
            'amount.integer' => 'Nominal harus berupa angka bulat.',
            'amount.min' => 'Nominal minimal Rp 1.',
            'ui_status.required' => 'Status wajib dipilih.',
            'description.required' => 'Keterangan wajib diisi.',
            'party_name.required_if' => 'Nama pihak wajib diisi untuk utang.',
            'item_name.required_if' => 'Nama barang wajib diisi untuk utang.',
            'expense_target.required_if' => 'Jenis pengeluaran wajib dipilih.',
            'evidence.image' => 'Gambar harus berupa file gambar.',
            'evidence.max' => 'Ukuran gambar maksimal 5 MB.',
        ]);
    }

    private function storeEvidence(Request $request, string $folder): ?string
    {
        if (! $request->hasFile('evidence')) {
            return null;
        }

        $file = $request->file('evidence');
        $filename = $this->uniqueOriginalFilename($file, $folder);

        return $file->storeAs($folder, $filename, 'public');
    }

    private function uniqueOriginalFilename(UploadedFile $file, string $folder): string
    {
        $original = basename($file->getClientOriginalName());
        $extension = strtolower($file->getClientOriginalExtension() ?: $file->guessExtension() ?: 'jpg');
        $basename = pathinfo($original, PATHINFO_FILENAME);
        $safe = preg_replace('/[^a-zA-Z0-9._-]/', '_', $basename) ?: 'gambar';
        $filename = "{$safe}.{$extension}";
        $disk = Storage::disk('public');
        $counter = 1;

        while ($disk->exists("{$folder}/{$filename}")) {
            $filename = "{$safe}-{$counter}.{$extension}";
            $counter++;
        }

        return $filename;
    }

    private function normalizeAmount(mixed $value): int|string
    {
        $digits = preg_replace('/\D/', '', (string) $value);

        return $digits === '' ? '' : (int) $digits;
    }

    private function nextCode(string $prefix): string
    {
        return $prefix.'-'.now()->format('Ymd').'-'.Str::upper(Str::random(6));
    }

    private function authorizeView(Transaction $transaction, Request $request): void
    {
        abort_unless($request->user()->isAdmin() || $transaction->user_id === $request->user()->id, 403);
    }

    private function sortFromFilters(array $filters): array
    {
        $sort = in_array($filters['sort'] ?? '', ['occurred_at', 'amount', 'type', 'ui_status'], true)
            ? $filters['sort']
            : 'occurred_at';
        $direction = ($filters['direction'] ?? 'desc') === 'asc' ? 'asc' : 'desc';

        return [$sort, $direction];
    }

    private function applyFilters(Builder $query, array $filters): void
    {
        $query->when($filters['type'] ?? null, fn ($q, $v) => $q->where('type', $v));
        $query->when($filters['ui_status'] ?? null, fn ($q, $v) => $q->where('ui_status', $v));
        $query->when($filters['verification_status'] ?? null, fn ($q, $v) => $q->where('verification_status', $v));
        $query->when($filters['user_id'] ?? null, fn ($q, $v) => $q->where('user_id', $v));
        $query->when($filters['date'] ?? null, fn ($q, $v) => $q->whereDate('occurred_at', $v));
        $query->when($filters['amount'] ?? null, fn ($q, $v) => $q->where('amount', $v));
    }

    private function applySearch(Builder $query, ?string $search): void
    {
        if (! $search) {
            return;
        }

        $query->where(function (Builder $q) use ($search) {
            $q->where('code', 'like', "%{$search}%")
                ->orWhere('description', 'like', "%{$search}%")
                ->orWhere('amount', 'like', "%{$search}%")
                ->orWhereHas('user', function (Builder $userQuery) use ($search) {
                    $userQuery->where('name', 'like', "%{$search}%")
                        ->orWhere('display_name', 'like', "%{$search}%")
                        ->orWhere('username', 'like', "%{$search}%");
                });
        });
    }

    private function buildSummary(Builder $query): array
    {
        $income = (clone $query)->where('type', 'pemasukan')->sum('amount');
        $expense = (clone $query)->where('type', 'pengeluaran')->sum('amount');

        return [
            'income' => (int) $income,
            'expense' => (int) $expense,
            'balance' => (int) $income - (int) $expense,
            'count' => (clone $query)->count(),
            'cashierCount' => (clone $query)->distinct('user_id')->count('user_id'),
            'activeCashiers' => User::where('role', 'kasir')->where('status', 'aktif')->count(),
        ];
    }

    private function buildChart(Builder $baseQuery, string $type, string $period): array
    {
        $days = match ($period) {
            '1d' => 0,
            '3d' => 2,
            '1w' => 6,
            '1m' => 29,
            '3m' => 89,
            '6m' => 179,
            '1y' => 364,
            '2y' => 729,
            default => 29,
        };

        $start = Carbon::today()->subDays($days);
        $points = collect(range($days, 0))->map(function (int $offset) use ($baseQuery, $type, $start) {
            $date = (clone $start)->addDays($offset);

            return [
                'label' => $date->format('d M'),
                'value' => (int) (clone $baseQuery)
                    ->where('type', $type)
                    ->whereDate('occurred_at', $date)
                    ->sum('amount'),
            ];
        })->values();

        $rangeQuery = (clone $baseQuery)
            ->where('type', $type)
            ->whereDate('occurred_at', '>=', $start);

        return [
            'total' => (int) $rangeQuery->sum('amount'),
            'points' => $points->values()->all(),
            'period' => $period,
        ];
    }

    private function normalizePeriod(string $period, array $allowed): string
    {
        return in_array($period, $allowed, true) ? $period : $allowed[0];
    }

    private function periodLabelForPdf(array $filters, string $incomePeriod): string
    {
        if (! empty($filters['date'])) {
            return Carbon::parse($filters['date'])->locale('id')->translatedFormat('d F Y');
        }

        return match ($incomePeriod) {
            '1d' => 'Hari ini',
            '1w' => '7 hari terakhir',
            '3m' => '3 bulan terakhir',
            '1y' => '12 bulan terakhir',
            default => now()->locale('id')->translatedFormat('F Y'),
        };
    }

    private function periodRangeForPdf(Builder $query, array $filters): string
    {
        if (! empty($filters['date'])) {
            return Carbon::parse($filters['date'])->locale('id')->translatedFormat('d F Y');
        }

        $min = (clone $query)->min('occurred_at');
        $max = (clone $query)->max('occurred_at');

        if ($min && $max) {
            $from = Carbon::parse($min)->locale('id')->translatedFormat('d F Y');
            $to = Carbon::parse($max)->locale('id')->translatedFormat('d F Y');

            return $from === $to ? $from : "{$from} - {$to}";
        }

        return 'Semua periode';
    }
}
