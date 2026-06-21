<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Services\EncryptedFieldSearch;
use App\Services\GoogleSheetsSyncService;
use App\Services\ProductStockService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
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

        $payload = [
            'products' => $products,
            'filters' => $filters,
            'isAdmin' => $isAdmin,
        ];

        if ($isAdmin) {
            $payload['summary'] = $this->buildSummary($baseQuery);
        }

        return Inertia::render('Products/Index', $payload);
    }

    public function store(Request $request): RedirectResponse
    {
        abort_unless($request->user()->isAdmin(), 403);

        $data = $request->validate([
            'barcode' => ['required', 'string', 'max:64'],
            'name' => ['required', 'string', 'max:255'],
            'unit' => ['required', 'string', 'max:30'],
            'sell_price' => ['required', 'integer', 'min:1'],
            'buy_price' => ['required', 'integer', 'min:0'],
        ]);

        $data['barcode'] = trim($data['barcode']);

        if ($this->barcodeExists($data['barcode'])) {
            throw ValidationException::withMessages([
                'barcode' => 'Barcode sudah digunakan produk lain.',
            ]);
        }

        Product::create($data);

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

    /**
     * @return array{total: int, available: int, empty: int}
     */
    private function buildSummary(Builder $query): array
    {
        $products = $query->get()->map(fn (Product $product) => $this->serializeProduct($product));

        return [
            'total' => $products->count(),
            'available' => $products->filter(fn (array $product) => $product['stock'] > 0)->count(),
            'empty' => $products->filter(fn (array $product) => $product['stock'] <= 0)->count(),
        ];
    }
}
