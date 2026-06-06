<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\HandlesAdminVerification;
use App\Models\Debt;
use App\Models\User;
use App\Services\EncryptedFieldSearch;
use App\Services\EncryptedQuery;
use App\Services\GoogleDriveService;
use App\Services\GoogleSheetsSyncService;
use App\Services\WhatsappNotificationService;
use App\Support\Audit;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class DebtController extends Controller
{
    use HandlesAdminVerification;

    public function __construct(
        private GoogleDriveService $drive,
    ) {}
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

        $sort = in_array($filters['sort'] ?? '', ['occurred_at', 'amount', 'status'], true)
            ? $filters['sort']
            : 'occurred_at';
        $direction = ($filters['direction'] ?? 'desc') === 'asc' ? 'asc' : 'desc';
        $perPage = in_array((int) ($filters['per_page'] ?? 10), [10, 25, 50, 100], true)
            ? (int) ($filters['per_page'] ?? 10)
            : 10;

        $debts = EncryptedQuery::paginate(
            clone $filteredQuery,
            $perPage,
            $sort,
            $direction,
        );

        $isAdmin = $request->user()->isAdmin();

        $payload = [
            'debts' => $debts,
            'filters' => $filters,
            'cashiers' => User::where('role', 'kasir')->get(['id', 'name', 'display_name', 'username'])->sortBy('name')->values(),
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

    public function edit(Debt $debt, Request $request): Response|RedirectResponse
    {
        $this->authorizeView($debt, $request);
        if ($redirect = $this->blockedByVerificationLock($debt, 'debts.show')) {
            return $redirect;
        }

        return Inertia::render('Debts/Form', ['debt' => $debt]);
    }

    public function update(Debt $debt, Request $request): RedirectResponse
    {
        $this->authorizeView($debt, $request);
        if ($redirect = $this->blockedByVerificationLock($debt)) {
            return $redirect;
        }
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

        app(GoogleSheetsSyncService::class)->upsert($debt);

        return redirect()->route('debts.show', $debt)->with('success', 'Utang diperbarui.');
    }

    public function destroy(Debt $debt, Request $request): RedirectResponse
    {
        abort_unless($request->user()->isAdmin(), 403);
        if ($redirect = $this->blockedByVerificationLock($debt)) {
            return $redirect;
        }

        DB::transaction(function () use ($debt, $request) {
            $before = $debt->toArray();
            Audit::record($debt, 'hapus', $before, [], 'Utang dihapus oleh admin.');

            app(WhatsappNotificationService::class)->dispatch(
                'utang_hapus',
                $request->user(),
                $debt,
            );

            if ($debt->evidence_path) {
                $this->drive->delete($debt->evidence_path);
            }
            $debt->delete();
            app(GoogleSheetsSyncService::class)->syncModule('debts');
        });

        return redirect()->route('debts.index')->with('success', 'Utang dihapus.');
    }

    public function verify(Debt $debt, Request $request): RedirectResponse
    {
        abort_unless($request->user()->isAdmin(), 403);
        if ($redirect = $this->blockedByVerificationLock($debt)) {
            return $redirect;
        }
        if ($redirect = $this->blockedByPendingVerification($debt)) {
            return $redirect;
        }

        $data = $request->validate([
            'verification_status' => ['required', 'in:disetujui,ditolak'],
            'verification_note' => ['nullable', 'string', 'max:1000'],
        ]);

        if ($data['verification_status'] === 'ditolak') {
            return $this->rejectAndDeleteRecord(
                $debt,
                $request,
                $data,
                'debts.index',
                'Utang',
                'utang_hapus',
            );
        }

        $before = $debt->toArray();
        $debt->update([
            ...$data,
            'verified_by' => $request->user()->id,
            'verified_at' => now(),
        ]);
        Audit::record($debt, 'verifikasi', $before, $debt->fresh()->toArray(), $data['verification_note'] ?? null);

        app(GoogleSheetsSyncService::class)->upsert($debt->fresh());

        return back()->with('success', 'Utang disetujui dan terkunci permanen.');
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

        return $this->drive->upload($request->file('evidence'), 'debts');
    }

    private function authorizeView(Debt $debt, Request $request): void
    {
        abort_unless($request->user()->isAdmin() || $debt->user_id === $request->user()->id, 403);
    }

    private function applyFilters(Builder $query, array $filters): void
    {
        $query->when($filters['search'] ?? null, function (Builder $q, string $v) {
            $encryptedIds = EncryptedFieldSearch::matchingIds($q, $v, ['party_name', 'item_name', 'code', 'amount']);

            if ($encryptedIds === []) {
                $q->whereRaw('0 = 1');

                return;
            }

            $q->whereIn('id', $encryptedIds);
        });
        $query->when($filters['party_name'] ?? null, function (Builder $q, string $v) {
            $ids = EncryptedFieldSearch::matchingIds($q, $v, ['party_name']);
            $q->whereIn('id', $ids !== [] ? $ids : [-1]);
        });
        $query->when($filters['item_name'] ?? null, function (Builder $q, string $v) {
            $ids = EncryptedFieldSearch::matchingIds($q, $v, ['item_name']);
            $q->whereIn('id', $ids !== [] ? $ids : [-1]);
        });
        $query->when($filters['status'] ?? null, fn ($q, $v) => EncryptedQuery::applyExactFilter($q, 'status', $v));
        $query->when($filters['verification_status'] ?? null, fn ($q, $v) => EncryptedQuery::applyExactFilter($q, 'verification_status', $v));
        $query->when($filters['party_type'] ?? null, fn ($q, $v) => EncryptedQuery::applyExactFilter($q, 'party_type', $v));
        $query->when($filters['user_id'] ?? null, fn ($q, $v) => $q->where('user_id', $v));
        $query->when($filters['amount'] ?? null, fn ($q, $v) => EncryptedQuery::applyExactFilter($q, 'amount', $v));
        $query->when($filters['date'] ?? null, fn ($q, $v) => $q->whereDate('occurred_at', $v));
        $query->when($filters['from'] ?? null, fn ($q, $v) => $q->whereDate('occurred_at', '>=', $v));
        $query->when($filters['to'] ?? null, fn ($q, $v) => $q->whereDate('occurred_at', '<=', $v));
    }

    private function buildSummary(Builder $query): array
    {
        $total = (int) EncryptedQuery::sum($query, 'amount');
        $paid = (int) EncryptedQuery::sum($query, 'amount', fn (Debt $debt) => $debt->status === 'sudah_selesai');
        $unpaid = (int) EncryptedQuery::sum($query, 'amount', fn (Debt $debt) => $debt->status === 'belum_selesai');

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
            $filter = $status ? fn (Debt $debt) => $debt->status === $status : null;

            return [
                'label' => $date->format('d M'),
                'value' => (int) EncryptedQuery::sum($dayQuery, 'amount', $filter),
            ];
        })->values();

        $rangeQuery = (clone $baseQuery)->whereDate('occurred_at', '>=', $start);
        $rangeFilter = $status ? fn (Debt $debt) => $debt->status === $status : null;
        $currentTotal = (int) EncryptedQuery::sum($rangeQuery, 'amount', $rangeFilter);

        $previousQuery = (clone $baseQuery)
            ->whereDate('occurred_at', '>=', $previousStart)
            ->whereDate('occurred_at', '<=', $previousEnd);
        $previousFilter = $status ? fn (Debt $debt) => $debt->status === $status : null;
        $previousTotal = (int) EncryptedQuery::sum($previousQuery, 'amount', $previousFilter);

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
