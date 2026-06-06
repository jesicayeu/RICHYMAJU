<?php

namespace App\Http\Controllers;

use App\Models\StockMovement;
use App\Services\EncryptedFieldSearch;
use App\Services\EncryptedQuery;
use App\Services\GoogleSheetsSyncService;
use App\Services\WhatsappNotificationService;
use App\Support\Audit;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class StockController extends Controller
{
    public function index(Request $request): Response
    {
        $filters = $request->only([
            'search',
            'date',
            'item_name',
            'type',
            'status',
            'quantity',
            'sort',
            'direction',
            'per_page',
        ]);

        $baseQuery = StockMovement::query()->with('user')->latest('occurred_at');

        if (! $request->user()->isAdmin()) {
            $baseQuery->where('user_id', $request->user()->id);
        }

        $filteredQuery = clone $baseQuery;
        $this->applyFilters($filteredQuery, $filters);

        $sort = ($filters['sort'] ?? 'occurred_at') === 'occurred_at' ? 'occurred_at' : 'occurred_at';
        $direction = ($filters['direction'] ?? 'desc') === 'asc' ? 'asc' : 'desc';
        $perPage = in_array((int) ($filters['per_page'] ?? 10), [8, 10, 25, 50, 100], true)
            ? (int) ($filters['per_page'] ?? ($request->user()->isAdmin() ? 10 : 8))
            : ($request->user()->isAdmin() ? 10 : 8);

        $movements = EncryptedQuery::paginate(
            clone $filteredQuery,
            $perPage,
            $sort,
            $direction,
        );

        $isAdmin = $request->user()->isAdmin();

        $payload = [
            'movements' => $movements,
            'filters' => $filters,
            'isAdmin' => $isAdmin,
        ];

        if ($isAdmin) {
            $payload['summary'] = $this->buildSummary($filteredQuery);
        }

        return Inertia::render('Stocks/Index', $payload);
    }

    public function create(Request $request): Response
    {
        return Inertia::render('Stocks/Form', [
            'movement' => null,
            'defaultType' => $request->query('type', 'masuk'),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $this->validated($request);

        $movement = DB::transaction(function () use ($request, $data) {
            $movement = StockMovement::create([
                ...$data,
                'code' => 'STK-'.now()->format('Ymd').'-'.Str::upper(Str::random(6)),
                'user_id' => $request->user()->id,
                'occurred_at' => now(),
            ]);
            Audit::record($movement, 'tambah', [], $movement->toArray(), 'Pergerakan stok baru.');

            return $movement;
        });

        app(WhatsappNotificationService::class)->dispatch(
            'stok_tambah',
            $request->user(),
            $movement,
        );

        app(GoogleSheetsSyncService::class)->upsert($movement);

        return redirect()->route('stocks.show', $movement)->with('success', 'Stok tersimpan.');
    }

    public function show(StockMovement $stock, Request $request): Response
    {
        $this->authorizeStock($stock, $request);

        return Inertia::render('Stocks/Show', [
            'movement' => $stock->load(['user', 'audits.user']),
            'isAdmin' => $request->user()->isAdmin(),
        ]);
    }

    public function edit(StockMovement $stock, Request $request): Response
    {
        $this->authorizeStock($stock, $request);

        return Inertia::render('Stocks/Form', [
            'movement' => $stock,
            'defaultType' => $stock->type,
        ]);
    }

    public function update(StockMovement $stock, Request $request): RedirectResponse
    {
        $this->authorizeStock($stock, $request);
        $data = $this->validated($request);
        $before = $stock->toArray();
        $stock->update($data);
        $stock->refresh();
        Audit::record($stock, 'edit', $before, $stock->toArray(), 'Stok diperbarui.');

        app(WhatsappNotificationService::class)->dispatch(
            'stok_ubah',
            $request->user(),
            $stock,
        );

        app(GoogleSheetsSyncService::class)->upsert($stock);

        return redirect()->route('stocks.show', $stock)->with('success', 'Stok diperbarui.');
    }

    public function destroy(StockMovement $stock, Request $request): RedirectResponse
    {
        abort_unless($request->user()->isAdmin(), 403);

        DB::transaction(function () use ($stock, $request) {
            $before = $stock->toArray();
            Audit::record($stock, 'hapus', $before, [], 'Data stok dihapus oleh admin.');

            app(WhatsappNotificationService::class)->dispatch(
                'stok_hapus',
                $request->user(),
                $stock,
            );

            $stock->delete();
            app(GoogleSheetsSyncService::class)->syncModule('stocks');
        });

        return redirect()->route('stocks.index')->with('success', 'Data stok dihapus.');
    }

    public function export(Request $request)
    {
        abort_unless($request->user()->isAdmin(), 403);

        $filters = $request->only(['search', 'date', 'item_name', 'type', 'status', 'quantity']);

        $filteredQuery = StockMovement::query()->with('user')->latest('occurred_at');
        $this->applyFilters($filteredQuery, $filters);

        $movements = (clone $filteredQuery)->get();

        Carbon::setLocale('id');

        return Pdf::loadView('pdf.stocks', [
            'movements' => $movements,
            'summary' => $this->buildSummary($filteredQuery),
            'periodRange' => $this->periodRangeForPdf($filteredQuery, $filters),
            'printedBy' => $request->user()->display_name ?? $request->user()->name,
            'printedAt' => now(),
            'total' => $movements->count(),
        ])->download('laporan-stok-barang-richy-maju.pdf');
    }

    private function validated(Request $request): array
    {
        if ($request->has('quantity')) {
            $request->merge(['quantity' => $this->normalizeQuantity($request->input('quantity'))]);
        }

        return $request->validate([
            'item_name' => ['required', 'string', 'max:255'],
            'type' => ['required', 'in:masuk,keluar'],
            'quantity' => ['required', 'numeric', 'min:0.01'],
            'unit' => ['required', 'string', 'max:30'],
            'status' => ['required', 'in:selesai,diproses'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);
    }

    private function applyFilters(Builder $query, array $filters): void
    {
        $query->when($filters['search'] ?? null, function (Builder $q, string $v) {
            $encryptedIds = EncryptedFieldSearch::matchingIds($q, $v, ['item_name', 'notes', 'code', 'quantity', 'unit']);

            if ($encryptedIds === []) {
                $q->whereRaw('0 = 1');

                return;
            }

            $q->whereIn('id', $encryptedIds);
        });
        $query->when($filters['item_name'] ?? null, function (Builder $q, string $v) {
            $ids = EncryptedFieldSearch::matchingIds($q, $v, ['item_name']);
            $q->whereIn('id', $ids !== [] ? $ids : [-1]);
        });
        $query->when($filters['type'] ?? null, fn ($q, $v) => EncryptedQuery::applyExactFilter($q, 'type', $v));
        $query->when($filters['status'] ?? null, fn ($q, $v) => EncryptedQuery::applyExactFilter($q, 'status', $v));
        $query->when($filters['date'] ?? null, fn ($q, $v) => $q->whereDate('occurred_at', $v));
        $query->when($filters['quantity'] ?? null, fn ($q, $v) => EncryptedQuery::applyExactFilter($q, 'quantity', $v));
    }

    private function authorizeStock(StockMovement $stock, Request $request): void
    {
        if (! $request->user()->isAdmin() && $stock->user_id !== $request->user()->id) {
            abort(403);
        }
    }

    private function buildSummary(Builder $query): array
    {
        return [
            'itemTypes' => (clone $query)->get()->pluck('item_name')->filter()->unique()->count(),
            'incoming' => EncryptedQuery::countWhere($query, 'type', 'masuk'),
            'outgoing' => EncryptedQuery::countWhere($query, 'type', 'keluar'),
            'count' => (int) (clone $query)->count(),
        ];
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

    private function normalizeQuantity(mixed $value): float|string
    {
        $raw = trim((string) $value);

        if ($raw === '') {
            return '';
        }

        if (str_contains($raw, ',')) {
            $raw = str_replace('.', '', $raw);
            $raw = str_replace(',', '.', $raw);
        } else {
            $parts = explode('.', $raw);
            if (count($parts) > 2) {
                $decimal = array_pop($parts);
                $raw = implode('', $parts).'.'.$decimal;
            }
        }

        return round((float) $raw, 2);
    }
}
