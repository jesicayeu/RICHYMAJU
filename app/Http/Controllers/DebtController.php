<?php

namespace App\Http\Controllers;

use App\Models\Debt;
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
use Inertia\Inertia;
use Inertia\Response;

class DebtController extends Controller
{
    public function index(Request $request): Response
    {
        $filters = $request->only([
            'search',
            'status',
            'verification_status',
            'party_type',
            'date',
            'from',
            'to',
            'user_id',
            'amount',
            'item_name',
            'party_name',
            'sort',
            'direction',
            'per_page',
            'total_period',
            'unpaid_period',
        ]);

        $baseQuery = Debt::query()->with(['user', 'verifier'])->latest('occurred_at');

        if (! $request->user()->isAdmin()) {
            $baseQuery->where('user_id', $request->user()->id);
        }

        $filteredQuery = clone $baseQuery;
        $this->applyFilters($filteredQuery, $filters);

        $sort = in_array($filters['sort'] ?? '', ['occurred_at', 'amount', 'status', 'party_name', 'item_name'], true)
            ? $filters['sort']
            : 'occurred_at';
        $direction = ($filters['direction'] ?? 'desc') === 'asc' ? 'asc' : 'desc';
        $perPage = in_array((int) ($filters['per_page'] ?? 10), [10, 25, 50, 100], true)
            ? (int) ($filters['per_page'] ?? 10)
            : 10;

        $debts = (clone $filteredQuery)
            ->orderBy($sort, $direction)
            ->paginate($perPage)
            ->withQueryString();

        $isAdmin = $request->user()->isAdmin();

        $payload = [
            'debts' => $debts,
            'filters' => $filters,
            'cashiers' => User::where('role', 'kasir')->orderBy('name')->get(['id', 'name', 'display_name', 'username']),
            'isAdmin' => $isAdmin,
        ];

        if ($isAdmin) {
            $totalPeriod = $this->normalizePeriod($filters['total_period'] ?? '1m', ['1d', '3d', '1w', '1m', '3m', '6m', '1y', '2y']);
            $unpaidPeriod = $this->normalizePeriod($filters['unpaid_period'] ?? '1m', ['1d', '3d', '1w', '1m', '3m', '6m', '1y', '2y']);

            $payload['summary'] = $this->buildSummary($filteredQuery);
            $payload['chartTotal'] = $this->buildChart(clone $baseQuery, null, $totalPeriod);
            $payload['chartUnpaid'] = $this->buildChart(clone $baseQuery, 'belum_selesai', $unpaidPeriod);
            $payload['totalPeriod'] = $totalPeriod;
            $payload['unpaidPeriod'] = $unpaidPeriod;
        }

        return Inertia::render('Debts/Index', $payload);
    }

    public function show(Debt $debt, Request $request): Response
    {
        $this->authorizeView($debt, $request);

        return Inertia::render('Debts/Show', [
            'debt' => $debt->load(['user', 'verifier', 'audits.user']),
            'isAdmin' => $request->user()->isAdmin(),
        ]);
    }

    public function edit(Debt $debt, Request $request): Response
    {
        $this->authorizeView($debt, $request);

        return Inertia::render('Debts/Form', ['debt' => $debt]);
    }

    public function update(Debt $debt, Request $request): RedirectResponse
    {
        $this->authorizeView($debt, $request);
        $data = $this->validated($request);
        $before = $debt->toArray();
        if ($path = $this->storeEvidence($request)) {
            $data['evidence_path'] = $path;
        }
        $debt->update($data);
        $debt->refresh();
        Audit::record($debt, 'edit', $before, $debt->toArray(), 'Utang diperbarui.');

        app(WhatsappNotificationService::class)->dispatch(
            'utang_ubah',
            $request->user(),
            $debt,
        );

        return redirect()->route('debts.show', $debt)->with('success', 'Utang diperbarui.');
    }

    public function destroy(Debt $debt, Request $request): RedirectResponse
    {
        abort_unless($request->user()->isAdmin(), 403);

        DB::transaction(function () use ($debt, $request) {
            $before = $debt->toArray();
            Audit::record($debt, 'hapus', $before, [], 'Utang dihapus oleh admin.');

            app(WhatsappNotificationService::class)->dispatch(
                'utang_hapus',
                $request->user(),
                $debt,
            );

            if ($debt->evidence_path) {
                Storage::disk('public')->delete($debt->evidence_path);
            }
            $debt->delete();
        });

        return redirect()->route('debts.index')->with('success', 'Utang dihapus.');
    }

    public function verify(Debt $debt, Request $request): RedirectResponse
    {
        abort_unless($request->user()->isAdmin(), 403);
        $data = $request->validate([
            'verification_status' => ['required', 'in:disetujui,ditolak'],
            'verification_note' => ['nullable', 'string', 'max:1000'],
        ]);
        $before = $debt->toArray();
        $debt->update([
            ...$data,
            'verified_by' => $request->user()->id,
            'verified_at' => now(),
        ]);
        Audit::record($debt, 'verifikasi', $before, $debt->fresh()->toArray(), $data['verification_note'] ?? null);

        return back()->with('success', 'Verifikasi utang tersimpan.');
    }

    public function export(Request $request)
    {
        abort_unless($request->user()->isAdmin(), 403);

        $filters = $request->only([
            'search',
            'status',
            'verification_status',
            'party_type',
            'date',
            'from',
            'to',
            'user_id',
            'amount',
            'item_name',
            'party_name',
        ]);

        $filteredQuery = Debt::query();
        $this->applyFilters($filteredQuery, $filters);

        $debts = (clone $filteredQuery)
            ->with('user')
            ->latest('occurred_at')
            ->get();

        Carbon::setLocale('id');

        return Pdf::loadView('pdf.debts', [
            'summary' => $this->buildSummary($filteredQuery),
            'debts' => $debts,
            'periodRange' => $this->periodRangeForPdf($filteredQuery, $filters),
            'printedBy' => $request->user()->display_name ?? $request->user()->name,
            'printedAt' => now(),
            'total' => $debts->count(),
        ])->download('laporan-utang-richy-maju.pdf');
    }

    private function validated(Request $request): array
    {
        return $request->validate([
            'party_name' => ['required', 'string', 'max:255'],
            'party_type' => ['required', 'in:kita_ke_orang,orang_ke_kita'],
            'item_name' => ['required', 'string', 'max:255'],
            'amount' => ['required', 'integer', 'min:1'],
            'status' => ['required', 'in:belum_selesai,sudah_selesai'],
            'evidence' => ['nullable', 'image', 'mimes:jpg,jpeg,png', 'max:5120'],
        ]);
    }

    private function storeEvidence(Request $request): ?string
    {
        if (! $request->hasFile('evidence')) {
            return null;
        }

        $folder = 'debts';
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

    private function authorizeView(Debt $debt, Request $request): void
    {
        abort_unless($request->user()->isAdmin() || $debt->user_id === $request->user()->id, 403);
    }

    private function applyFilters(Builder $query, array $filters): void
    {
        $query->when($filters['search'] ?? null, fn ($q, $v) => $q->where(fn ($qq) => $qq
            ->where('party_name', 'like', "%{$v}%")
            ->orWhere('item_name', 'like', "%{$v}%")
            ->orWhere('code', 'like', "%{$v}%")));
        $query->when($filters['party_name'] ?? null, fn ($q, $v) => $q->where('party_name', 'like', "%{$v}%"));
        $query->when($filters['item_name'] ?? null, fn ($q, $v) => $q->where('item_name', 'like', "%{$v}%"));
        $query->when($filters['status'] ?? null, fn ($q, $v) => $q->where('status', $v));
        $query->when($filters['verification_status'] ?? null, fn ($q, $v) => $q->where('verification_status', $v));
        $query->when($filters['party_type'] ?? null, fn ($q, $v) => $q->where('party_type', $v));
        $query->when($filters['user_id'] ?? null, fn ($q, $v) => $q->where('user_id', $v));
        $query->when($filters['amount'] ?? null, fn ($q, $v) => $q->where('amount', $v));
        $query->when($filters['date'] ?? null, fn ($q, $v) => $q->whereDate('occurred_at', $v));
        $query->when($filters['from'] ?? null, fn ($q, $v) => $q->whereDate('occurred_at', '>=', $v));
        $query->when($filters['to'] ?? null, fn ($q, $v) => $q->whereDate('occurred_at', '<=', $v));
    }

    private function buildSummary(Builder $query): array
    {
        $total = (int) (clone $query)->sum('amount');
        $paid = (int) (clone $query)->where('status', 'sudah_selesai')->sum('amount');
        $unpaid = (int) (clone $query)->where('status', 'belum_selesai')->sum('amount');

        return [
            'total' => $total,
            'paid' => $paid,
            'unpaid' => $unpaid,
            'count' => (clone $query)->count(),
            'cashierCount' => (clone $query)->distinct('user_id')->count('user_id'),
            'activeCashiers' => User::where('role', 'kasir')->where('status', 'aktif')->count(),
        ];
    }

    private function buildChart(Builder $baseQuery, ?string $status, string $period): array
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
        $previousStart = (clone $start)->subDays($days + 1);
        $previousEnd = (clone $start)->subDay();

        $points = collect(range($days, 0))->map(function (int $offset) use ($baseQuery, $status, $start) {
            $date = (clone $start)->addDays($offset);
            $dayQuery = (clone $baseQuery)->whereDate('occurred_at', $date);
            if ($status) {
                $dayQuery->where('status', $status);
            }

            return [
                'label' => $date->format('d M'),
                'value' => (int) $dayQuery->sum('amount'),
            ];
        })->values();

        $rangeQuery = (clone $baseQuery)->whereDate('occurred_at', '>=', $start);
        if ($status) {
            $rangeQuery->where('status', $status);
        }

        $currentTotal = (int) $rangeQuery->sum('amount');

        $previousQuery = (clone $baseQuery)
            ->whereDate('occurred_at', '>=', $previousStart)
            ->whereDate('occurred_at', '<=', $previousEnd);
        if ($status) {
            $previousQuery->where('status', $status);
        }
        $previousTotal = (int) $previousQuery->sum('amount');

        $changePercent = $previousTotal > 0
            ? (int) round((($currentTotal - $previousTotal) / $previousTotal) * 100)
            : ($currentTotal > 0 ? 100 : 0);

        return [
            'total' => $currentTotal,
            'points' => $points,
            'period' => $period,
            'changePercent' => $changePercent,
        ];
    }

    private function normalizePeriod(string $period, array $allowed): string
    {
        return in_array($period, $allowed, true) ? $period : $allowed[0];
    }

    private function periodRangeForPdf(Builder $query, array $filters): string
    {
        if (! empty($filters['date'])) {
            return Carbon::parse($filters['date'])->locale('id')->translatedFormat('d F Y');
        }

        if (! empty($filters['from']) || ! empty($filters['to'])) {
            $from = ! empty($filters['from'])
                ? Carbon::parse($filters['from'])->locale('id')->translatedFormat('d F Y')
                : 'Awal';
            $to = ! empty($filters['to'])
                ? Carbon::parse($filters['to'])->locale('id')->translatedFormat('d F Y')
                : 'Sekarang';

            return "{$from} - {$to}";
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
