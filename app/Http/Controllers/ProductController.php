<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\StockMovement;
use App\Services\EncryptedFieldSearch;
use App\Services\GoogleSheetsSyncService;
use App\Services\ProductStockService;
use App\Services\WhatsappNotificationService;
use App\Support\Audit;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class ProductController extends Controller
{
    public function __construct(
        private ProductStockService $stockService,
    ) {}

    public function index(Request $request): Response
    {
        $filters = $request->only([
            'search',
            'name',
            'barcode',
            'stock_status',
            'sort',
            'direction',
            'per_page',
        ]);

        $baseQuery = Product::query()->where('is_active', true);
        $filteredQuery = clone $baseQuery;
        $this->applyFilters($filteredQuery, $filters);

        $direction = ($filters['direction'] ?? 'asc') === 'desc' ? 'desc' : 'asc';
        $sort = ($filters['sort'] ?? 'name') === 'barcode' ? 'barcode' : 'name';
        $perPage = in_array((int) ($filters['per_page'] ?? 10), [8, 10, 25, 50, 100], true)
            ? (int) ($filters['per_page'] ?? ($request->user()->isAdmin() ? 10 : 8))
            : ($request->user()->isAdmin() ? 10 : 8);

        $products = $this->paginateProducts(
            $filteredQuery,
            $filters,
            $sort,
            $direction,
            $perPage,
            $request,
        );

        $isAdmin = $request->user()->isAdmin();

        return Inertia::render('Products/Index', [
            'products' => $products,
            'filters' => $filters,
            'isAdmin' => $isAdmin,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        abort_unless($request->user()->isAdmin(), 403);

        if ($request->has('initial_quantity')) {
            $request->merge([
                'initial_quantity' => $this->normalizeQuantity($request->input('initial_quantity')),
            ]);
        }

        $data = $request->validate([
            'barcode' => ['required', 'string', 'max:64'],
            'name' => ['required', 'string', 'max:255'],
            'unit' => ['required', 'string', 'max:30'],
            'sell_price' => ['required', 'integer', 'min:1'],
            'buy_price' => ['required', 'integer', 'min:0'],
            'initial_quantity' => ['nullable', 'numeric', 'min:0'],
        ]);

        $data['barcode'] = trim($data['barcode']);
        $initialQuantity = round((float) ($data['initial_quantity'] ?? 0), 2);
        unset($data['initial_quantity']);

        if ($this->barcodeExists($data['barcode'])) {
            throw ValidationException::withMessages([
                'barcode' => 'Barcode sudah digunakan produk lain.',
            ]);
        }

        DB::transaction(function () use ($request, $data, $initialQuantity) {
            $product = Product::create($data);

            if ($initialQuantity <= 0) {
                return;
            }

            $movement = StockMovement::create([
                'code' => 'STK-'.now()->format('Ymd').'-'.Str::upper(Str::random(6)),
                'user_id' => $request->user()->id,
                'product_id' => $product->id,
                'item_name' => $product->name,
                'type' => 'masuk',
                'quantity' => $initialQuantity,
                'unit' => $product->unit,
                'status' => 'selesai',
                'notes' => 'Stok awal saat produk didaftarkan.',
                'occurred_at' => now(),
            ]);

            Audit::record($movement, 'tambah', [], $movement->toArray(), 'Stok awal produk baru.');

            app(WhatsappNotificationService::class)->dispatch(
                'stok_tambah',
                $request->user(),
                $movement,
            );

            app(GoogleSheetsSyncService::class)->upsert($movement);
        });

        app(GoogleSheetsSyncService::class)->syncModule('products');

        return back()->with('success', 'Produk berhasil ditambahkan.');
    }

    public function update(Product $product, Request $request): RedirectResponse
    {
        abort_unless($request->user()->isAdmin(), 403);

        $data = $request->validate([
            'barcode' => ['required', 'string', 'max:64'],
            'name' => ['required', 'string', 'max:255'],
            'unit' => ['required', 'string', 'max:30'],
            'sell_price' => ['required', 'integer', 'min:1'],
            'buy_price' => ['required', 'integer', 'min:0'],
            'is_active' => ['required', 'boolean'],
        ]);

        $data['barcode'] = trim($data['barcode']);

        if ($this->barcodeExists($data['barcode'], $product->id)) {
            throw ValidationException::withMessages([
                'barcode' => 'Barcode sudah digunakan produk lain.',
            ]);
        }

        $product->update($data);

        app(GoogleSheetsSyncService::class)->upsert($product->fresh());

        return back()->with('success', 'Produk berhasil diperbarui.');
    }

    public function destroy(Product $product, Request $request): RedirectResponse
    {
        abort_unless($request->user()->isAdmin(), 403);

        $product->delete();

        app(GoogleSheetsSyncService::class)->syncModule('products');

        return back()->with('success', 'Produk berhasil dihapus.');
    }

    public function lookup(string $barcode): JsonResponse
    {
        $product = $this->findByBarcode($barcode);

        if (! $product || ! $product->is_active) {
            return response()->json(['message' => 'Produk tidak ditemukan.'], 404);
        }

        return response()->json($this->serializeProduct($product));
    }

    public function checkBarcode(string $barcode): JsonResponse
    {
        $product = $this->findByBarcode($barcode);

        if (! $product) {
            return response()->json(['registered' => false]);
        }

        return response()->json([
            'registered' => true,
            'is_active' => (bool) $product->is_active,
            'product' => $this->serializeProduct($product),
        ]);
    }

    private function findByBarcode(string $barcode): ?Product
    {
        $needle = trim($barcode);

        if ($needle === '') {
            return null;
        }

        return Product::query()
            ->get()
            ->first(fn (Product $product) => (string) $product->barcode === $needle);
    }

    private function barcodeExists(string $barcode, ?int $exceptId = null): bool
    {
        $product = $this->findByBarcode($barcode);

        if (! $product) {
            return false;
        }

        return $exceptId === null || $product->id !== $exceptId;
    }

    private function serializeProduct(Product $product): array
    {
        return [
            'id' => $product->id,
            'barcode' => $product->barcode,
            'name' => $product->name,
            'unit' => $product->unit,
            'sell_price' => (int) $product->sell_price,
            'buy_price' => (int) ($product->buy_price ?? 0),
            'stock' => $this->stockService->availableStock($product),
            'is_active' => $product->is_active,
        ];
    }

    private function applyFilters(Builder $query, array $filters): void
    {
        $query->when($filters['search'] ?? null, function (Builder $q, string $value) {
            $encryptedIds = EncryptedFieldSearch::matchingIds($q, $value, ['name', 'barcode']);

            if ($encryptedIds === []) {
                $q->whereRaw('0 = 1');

                return;
            }

            $q->whereIn('id', $encryptedIds);
        });

        $query->when($filters['name'] ?? null, function (Builder $q, string $value) {
            $ids = EncryptedFieldSearch::matchingIds($q, $value, ['name']);
            $q->whereIn('id', $ids !== [] ? $ids : [-1]);
        });

        $query->when($filters['barcode'] ?? null, function (Builder $q, string $value) {
            $ids = EncryptedFieldSearch::matchingIds($q, $value, ['barcode']);
            $q->whereIn('id', $ids !== [] ? $ids : [-1]);
        });
    }

    /**
     * @return LengthAwarePaginator<int, array<string, mixed>>
     */
    private function paginateProducts(
        Builder $query,
        array $filters,
        string $sort,
        string $direction,
        int $perPage,
        Request $request,
    ): LengthAwarePaginator {
        $products = $query->get()
            ->map(fn (Product $product) => $this->serializeProduct($product));

        $stockStatus = $filters['stock_status'] ?? '';

        if ($stockStatus === 'available') {
            $products = $products->filter(fn (array $product) => $product['stock'] > 0);
        } elseif ($stockStatus === 'empty') {
            $products = $products->filter(fn (array $product) => $product['stock'] <= 0);
        }

        $sorted = $direction === 'asc'
            ? $products->sortBy($sort, SORT_NATURAL)->values()
            : $products->sortByDesc($sort, SORT_NATURAL)->values();

        $page = max(1, (int) $request->query('page', 1));
        $total = $sorted->count();
        $slice = $sorted->slice(($page - 1) * $perPage, $perPage)->values();

        return (new LengthAwarePaginator(
            $slice,
            $total,
            $perPage,
            $page,
            ['path' => $request->url(), 'query' => $request->query()],
        ))->withQueryString();
    }

    private function normalizeQuantity(mixed $value): float|string
    {
        $raw = trim((string) $value);

        if ($raw === '') {
            return 0;
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
