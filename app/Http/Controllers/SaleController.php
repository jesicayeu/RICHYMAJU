<?php

namespace App\Http\Controllers;

use App\Models\PaymentSetting;
use App\Models\Product;
use App\Models\Sale;
use App\Models\StockMovement;
use App\Services\EncryptedFieldSearch;
use App\Services\EncryptedQuery;
use App\Services\GoogleSheetsSyncService;
use App\Services\ProductStockService;
use App\Services\QrisPaymentService;
use App\Services\SaleTransactionSyncService;
use App\Support\Audit;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class SaleController extends Controller
{
    public function __construct(
        private ProductStockService $stockService,
        private QrisPaymentService $qrisPaymentService,
        private SaleTransactionSyncService $saleTransactionSync,
    ) {}

    public function index(Request $request): Response
    {
        $filters = $request->only([
            'search',
            'date',
            'payment_status',
            'sort',
            'direction',
            'per_page',
        ]);

        $baseQuery = Sale::query()->with(['user', 'items'])->latest('occurred_at');

        if (! $request->user()->isAdmin()) {
            $baseQuery->where('user_id', $request->user()->id);
        }

        $filteredQuery = clone $baseQuery;
        $this->applyFilters($filteredQuery, $filters);

        $sort = ($filters['sort'] ?? 'occurred_at') === 'total_amount' ? 'total_amount' : 'occurred_at';
        $direction = ($filters['direction'] ?? 'desc') === 'asc' ? 'asc' : 'desc';
        $perPage = in_array((int) ($filters['per_page'] ?? 10), [8, 10, 25, 50, 100], true)
            ? (int) ($filters['per_page'] ?? ($request->user()->isAdmin() ? 10 : 8))
            : ($request->user()->isAdmin() ? 10 : 8);

        $sales = EncryptedQuery::paginate(
            clone $filteredQuery,
            $perPage,
            $sort,
            $direction,
        );

        $isAdmin = $request->user()->isAdmin();

        $payload = [
            'sales' => $sales,
            'filters' => $filters,
            'isAdmin' => $isAdmin,
        ];

        if ($isAdmin) {
            $payload['summary'] = $this->buildSummary($filteredQuery);
        }

        return Inertia::render('Sales/Index', $payload);
    }

    public function pos(Request $request): Response
    {
        $products = Product::query()
            ->where('is_active', true)
            ->orderBy('name')
            ->get()
            ->map(fn (Product $product) => [
                'id' => $product->id,
                'barcode' => $product->barcode,
                'name' => $product->name,
                'unit' => $product->unit,
                'sell_price' => (int) $product->sell_price,
                'stock' => $this->stockService->availableStock($product),
            ]);

        return Inertia::render('Sales/Pos', [
            'products' => $products,
            'isAdmin' => $request->user()->isAdmin(),
            'paymentConfigured' => PaymentSetting::current()->isConfigured(),
            'paymentInfo' => PaymentSetting::current()->publicPayload(),
        ]);
    }

    public function scannerTest(): Response
    {
        return Inertia::render('Sales/ScannerTest');
    }

    public function scannerSetup(): Response
    {
        return Inertia::render('Sales/ScannerSetup');
    }

    public function create(): RedirectResponse
    {
        return redirect()->route('sales.pos');
    }

    public function store(Request $request): RedirectResponse|JsonResponse
    {
        $data = $this->validated($request);

        $paymentMethod = $data['payment_method'] ?? 'tunai';
        $isCash = $paymentMethod === 'tunai';
        $settings = PaymentSetting::current();

        if ($paymentMethod === 'barcode' && ! $settings->isConfigured()) {
            throw ValidationException::withMessages([
                'payment_method' => 'QRIS belum dikonfigurasi. Admin harus mengisi Pengaturan > Pembayaran.',
            ]);
        }

        $sale = DB::transaction(function () use ($request, $data, $isCash) {
            $items = $data['items'];
            unset($data['items']);

            $code = 'SLS-'.now()->format('Ymd').'-'.Str::upper(Str::random(6));

            $sale = Sale::create([
                ...$data,
                'code' => $code,
                'user_id' => $request->user()->id,
                'payment_method' => $data['payment_method'] ?? 'tunai',
                'payment_status' => $isCash ? 'lunas' : 'belum_lunas',
                'payment_barcode' => $isCash ? null : $code,
                'paid_at' => $isCash ? now() : null,
                'occurred_at' => now(),
            ]);

            foreach ($items as $item) {
                $sale->items()->create($item);

                if (! empty($item['product_id'])) {
                    $this->deductStock($item, $request->user()->id);
                }
            }

            Audit::record($sale, 'tambah', [], $sale->load('items')->toArray(), 'Penjualan POS baru.');

            return $sale;
        });

        if ($sale->payment_status === 'lunas') {
            $transaction = $this->saleTransactionSync->syncFromSale($sale);
            if ($transaction) {
                app(GoogleSheetsSyncService::class)->upsert($transaction);
            }
        }

        app(GoogleSheetsSyncService::class)->upsert($sale);
        if (collect($sale->items)->contains(fn ($item) => filled($item->product_id))) {
            app(GoogleSheetsSyncService::class)->syncModule('products');
        }

        if ($request->wantsJson()) {
            $paymentQr = $this->paymentQrResult($sale);

            return response()->json([
                'sale' => $sale->load('items'),
                'payment_qr_payload' => $paymentQr['payload'],
                'payment_qr_error' => $paymentQr['error'],
                'payment_info' => PaymentSetting::current()->publicPayload(),
            ]);
        }

        return redirect()->route('sales.show', $sale)->with('success', 'Penjualan tersimpan.');
    }

    public function show(Sale $sale, Request $request): Response
    {
        $this->authorizeSale($sale, $request);

        $paymentQr = $this->paymentQrResult($sale);

        return Inertia::render('Sales/Show', [
            'sale' => $sale->load(['user', 'items', 'audits.user']),
            'isAdmin' => $request->user()->isAdmin(),
            'paymentQrPayload' => $paymentQr['payload'],
            'paymentQrError' => $paymentQr['error'],
            'paymentInfo' => PaymentSetting::current()->publicPayload(),
        ]);
    }

    public function edit(Sale $sale, Request $request): Response
    {
        $this->authorizeSale($sale, $request);

        return Inertia::render('Sales/Form', [
            'sale' => $sale->load('items'),
        ]);
    }

    public function update(Sale $sale, Request $request): RedirectResponse
    {
        $this->authorizeSale($sale, $request);
        $data = $this->validated($request, isUpdate: true);
        $before = $sale->load('items')->toArray();

        DB::transaction(function () use ($sale, $data) {
            $items = $data['items'];
            unset($data['items']);

            $sale->update($data);
            $sale->items()->delete();

            foreach ($items as $item) {
                $sale->items()->create($item);
            }
        });

        $sale->refresh()->load('items');
        Audit::record($sale, 'edit', $before, $sale->toArray(), 'Penjualan diperbarui.');

        app(GoogleSheetsSyncService::class)->upsert($sale);

        return redirect()->route('sales.show', $sale)->with('success', 'Penjualan diperbarui.');
    }

    public function confirmPayment(Sale $sale, Request $request): JsonResponse|RedirectResponse
    {
        $this->authorizeSale($sale, $request);

        $request->validate([
            'payment_barcode' => ['nullable', 'string', 'max:64'],
            'confirm_manual' => ['nullable', 'boolean'],
        ]);

        if ($sale->payment_status === 'lunas') {
            return $this->paymentResponse($request, false, 'Penjualan sudah lunas.');
        }

        $manual = $request->boolean('confirm_manual');
        $scanned = trim((string) $request->input('payment_barcode', ''));

        if (! $manual) {
            if ($scanned === '' || (string) $sale->payment_barcode !== $scanned) {
                return $this->paymentResponse($request, false, 'Kode referensi pembayaran tidak cocok.');
            }
        }

        $before = $sale->toArray();
        $sale->update([
            'payment_status' => 'lunas',
            'paid_at' => now(),
        ]);

        Audit::record($sale, 'edit', $before, $sale->fresh()->toArray(), 'Pembayaran QRIS/rekening dikonfirmasi.');

        $sale = $sale->fresh();
        $transaction = $this->saleTransactionSync->syncFromSale($sale);
        if ($transaction) {
            app(GoogleSheetsSyncService::class)->upsert($transaction);
        }

        app(GoogleSheetsSyncService::class)->upsert($sale);

        return $this->paymentResponse($request, true, 'Pembayaran berhasil dikonfirmasi.');
    }

    public function destroy(Sale $sale, Request $request): RedirectResponse
    {
        abort_unless($request->user()->isAdmin(), 403);

        DB::transaction(function () use ($sale) {
            $before = $sale->load('items')->toArray();
            $this->saleTransactionSync->removeForSale($sale);
            Audit::record($sale, 'hapus', $before, [], 'Data penjualan dihapus oleh admin.');
            $sale->delete();
        });

        app(GoogleSheetsSyncService::class)->syncModule('sales');

        return redirect()->route('sales.index')->with('success', 'Data penjualan dihapus.');
    }

    private function validated(Request $request, bool $isUpdate = false): array
    {
        $validated = $request->validate([
            'payment_status' => [$isUpdate ? 'required' : 'nullable', 'in:belum_lunas,lunas'],
            'payment_method' => ['nullable', 'in:tunai,barcode'],
            'notes' => ['nullable', 'string', 'max:1000'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['nullable', 'integer', 'exists:products,id'],
            'items.*.barcode' => ['nullable', 'string', 'max:64'],
            'items.*.item_name' => ['required', 'string', 'max:255'],
            'items.*.quantity' => ['required', 'numeric', 'min:0.01'],
            'items.*.unit' => ['required', 'string', 'max:30'],
            'items.*.price' => ['required', 'integer', 'min:1'],
        ]);

        $items = collect($validated['items'])->map(function (array $item) {
            $quantity = $this->normalizeQuantity($item['quantity']);
            $price = (int) $item['price'];
            $subtotal = (int) round($quantity * $price);

            return [
                'product_id' => $item['product_id'] ?? null,
                'barcode' => $item['barcode'] ?? null,
                'item_name' => $item['item_name'],
                'quantity' => $quantity,
                'unit' => $item['unit'],
                'price' => $price,
                'subtotal' => $subtotal,
            ];
        })->all();

        $validated['items'] = $items;
        $validated['total_amount'] = collect($items)->sum('subtotal');

        return $validated;
    }

    private function deductStock(array $item, int $userId): void
    {
        StockMovement::create([
            'code' => 'STK-'.now()->format('Ymd').'-'.Str::upper(Str::random(6)),
            'user_id' => $userId,
            'product_id' => $item['product_id'] ?? null,
            'item_name' => $item['item_name'],
            'type' => 'keluar',
            'quantity' => $item['quantity'],
            'unit' => $item['unit'],
            'status' => 'selesai',
            'notes' => 'Penjualan POS'.($item['barcode'] ? ' — barcode: '.$item['barcode'] : ''),
            'occurred_at' => now(),
        ]);
    }

    private function isQrisPayment(?string $paymentMethod): bool
    {
        return in_array($paymentMethod, ['barcode', 'qris_dana', 'qris_gopay'], true);
    }

    private function paymentQrPayload(Sale $sale): ?string
    {
        return $this->paymentQrResult($sale)['payload'];
    }

    /**
     * @return array{payload: ?string, error: ?string}
     */
    private function paymentQrResult(Sale $sale): array
    {
        if (! $this->isQrisPayment($sale->payment_method) || $sale->payment_status === 'lunas') {
            return ['payload' => null, 'error' => null];
        }

        $settings = PaymentSetting::current();
        $amount = (int) $sale->total_amount;
        $staticQris = $settings->static_qris_payload;

        if (! filled($staticQris)) {
            return [
                'payload' => null,
                'error' => 'Payload QRIS belum diisi di Pengaturan > Pembayaran.',
            ];
        }

        try {
            return [
                'payload' => $this->qrisPaymentService->generateDynamic($staticQris, $amount),
                'error' => null,
            ];
        } catch (\Throwable $exception) {
            report($exception);

            return [
                'payload' => null,
                'error' => 'Payload QRIS tidak valid. Admin harus tempel ulang string QRIS asli di Pengaturan > Pembayaran.',
            ];
        }
    }

    private function paymentResponse(Request $request, bool $success, string $message): JsonResponse|RedirectResponse
    {
        if ($request->wantsJson()) {
            return response()->json(['success' => $success, 'message' => $message], $success ? 200 : 422);
        }

        return $success
            ? back()->with('success', $message)
            : back()->with('error', $message);
    }

    private function applyFilters(Builder $query, array $filters): void
    {
        $query->when($filters['search'] ?? null, function (Builder $q, string $v) {
            $encryptedIds = EncryptedFieldSearch::matchingIds($q, $v, ['code', 'notes', 'total_amount', 'payment_barcode']);

            if ($encryptedIds === []) {
                $q->whereRaw('0 = 1');

                return;
            }

            $q->whereIn('id', $encryptedIds);
        });
        $query->when($filters['payment_status'] ?? null, fn ($q, $v) => EncryptedQuery::applyExactFilter($q, 'payment_status', $v));
        $query->when($filters['date'] ?? null, fn ($q, $v) => $q->whereDate('occurred_at', $v));
    }

    private function authorizeSale(Sale $sale, Request $request): void
    {
        if (! $request->user()->isAdmin() && $sale->user_id !== $request->user()->id) {
            abort(403);
        }
    }

    private function buildSummary(Builder $query): array
    {
        $sales = (clone $query)->get();

        return [
            'total' => $sales->sum('total_amount'),
            'count' => $sales->count(),
            'paid' => $sales->where('payment_status', 'lunas')->sum('total_amount'),
            'unpaid' => $sales->where('payment_status', 'belum_lunas')->sum('total_amount'),
        ];
    }

    private function normalizeQuantity(mixed $value): float
    {
        $raw = trim((string) $value);

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
