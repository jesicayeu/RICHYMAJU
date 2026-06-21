<?php

namespace App\Http\Controllers;

use App\Models\Debt;
use App\Models\Product;
use App\Models\Sale;
use App\Models\StockMovement;
use App\Models\Transaction;
use App\Models\User;
use App\Services\EncryptedQuery;
use App\Services\ProductStockService;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

class DashboardController extends Controller
{
    public function __construct(
        private ProductStockService $stockService,
    ) {}

    public function __invoke(Request $request): InertiaResponse
    {
        $user = $request->user();
        $payload = $this->buildPayload($user);

        return Inertia::render($user->isAdmin() ? 'Dashboard/Admin' : 'Dashboard/Kasir', $payload);
    }

    public function export(Request $request): Response
    {
        $user = $request->user();
        $payload = $this->buildPayload($user);
        Carbon::setLocale('id');

        $period = $request->input('period', 'today');
        $periodLabel = match ($period) {
            '7d' => '7 Hari Terakhir',
            '30d' => '30 Hari Terakhir',
            default => 'Hari Ini ('.Carbon::today()->translatedFormat('d F Y').')',
        };

        $summary = $payload['summary'];

        return Pdf::loadView('pdf.dashboard-summary', [
            'stats' => $payload['stats'],
            'summary' => $summary,
            'recentSales' => $payload['recentSales'],
            'recentTransactions' => $payload['recentTransactions'],
            'recentStocks' => $payload['recentStocks'],
            'recentDebts' => $payload['recentDebts'],
            'periodLabel' => $periodLabel,
            'printedBy' => $user->display_name ?: $user->name,
            'isAdmin' => $user->isAdmin(),
            'hasPenjualanModule' => $summary['penjualan']['total'] > 0
                || $summary['penjualan']['count'] > 0
                || $summary['penjualan']['today'] > 0,
            'hasTransaksiModule' => $summary['transaksi']['pemasukan'] > 0
                || $summary['transaksi']['pengeluaran'] > 0
                || $summary['transaksi']['count'] > 0,
            'hasStokModule' => $summary['stok']['masuk'] > 0 || $summary['stok']['keluar'] > 0,
            'hasUtangModule' => $summary['utang']['belum_selesai'] > 0
                || $summary['utang']['sudah_selesai'] > 0
                || $summary['utang']['count'] > 0,
        ])->download('laporan-dashboard-'.now()->format('Y-m-d-His').'.pdf');
    }

    private function buildPayload(User $user): array
    {
        $today = Carbon::today();
        $scoped = $this->scopedQueries($user);

        $todayTransactions = (clone $scoped['transactions'])->whereDate('occurred_at', $today);
        $income = (int) EncryptedQuery::sum($todayTransactions, 'amount', fn (Transaction $t) => $t->type === 'pemasukan' && ! $t->sale_id);
        $expense = (int) EncryptedQuery::sum($todayTransactions, 'amount', fn (Transaction $t) => $t->type === 'pengeluaran');

        $todaySales = (clone $scoped['sales'])->whereDate('occurred_at', $today);
        $paidTodaySales = (clone $todaySales)->get()->where('payment_status', 'lunas');
        $salesToday = (int) $paidTodaySales->sum('total_amount');
        $salesCountToday = $paidTodaySales->count();

        $products = Product::query()->where('is_active', true)->get();
        $stockMap = $this->stockService->stockMapForProducts($products);
        $lowStockCount = collect($stockMap)->filter(fn (float $qty) => $qty > 0 && $qty <= 5)->count();

        $chart = collect(range(6, 0))->map(function (int $days) use ($scoped) {
            $date = Carbon::today()->subDays($days);
            $dayTransactions = (clone $scoped['transactions'])->whereDate('occurred_at', $date);
            $daySales = (clone $scoped['sales'])->whereDate('occurred_at', $date)->get()->where('payment_status', 'lunas');

            return [
                'date' => $date->format('d M'),
                'pemasukan' => (int) EncryptedQuery::sum($dayTransactions, 'amount', fn (Transaction $t) => $t->type === 'pemasukan' && ! $t->sale_id),
                'pengeluaran' => (int) EncryptedQuery::sum($dayTransactions, 'amount', fn (Transaction $t) => $t->type === 'pengeluaran'),
                'penjualan' => (int) $daySales->sum('total_amount'),
            ];
        })->values();

        $payload = [
            'stats' => [
                'incomeToday' => $income,
                'expenseToday' => $expense,
                'salesToday' => $salesToday,
                'salesCountToday' => $salesCountToday,
                'totalIncomeToday' => $income + $salesToday,
                'profitToday' => ($income + $salesToday) - $expense,
                'debtOpen' => (int) EncryptedQuery::sum($scoped['debts'], 'amount', fn (Debt $debt) => $debt->status === 'belum_selesai'),
                'pendingTransactions' => EncryptedQuery::countWhere(clone $scoped['transactions'], 'verification_status', 'menunggu'),
                'pendingDebts' => EncryptedQuery::countWhere(clone $scoped['debts'], 'verification_status', 'menunggu'),
                'activeCashiers' => User::where('role', 'kasir')->where('status', 'aktif')->count(),
                'productCount' => $products->count(),
                'lowStockCount' => $lowStockCount,
            ],
            'summary' => [
                'penjualan' => [
                    'total' => (int) (clone $scoped['sales'])->get()->where('payment_status', 'lunas')->sum('total_amount'),
                    'count' => (clone $scoped['sales'])->get()->where('payment_status', 'lunas')->count(),
                    'today' => $salesToday,
                ],
                'transaksi' => [
                    'pemasukan' => (int) EncryptedQuery::sum(clone $scoped['transactions'], 'amount', fn (Transaction $t) => $t->type === 'pemasukan' && ! $t->sale_id),
                    'pengeluaran' => (int) EncryptedQuery::sum(clone $scoped['transactions'], 'amount', fn (Transaction $t) => $t->type === 'pengeluaran'),
                    'count' => (clone $scoped['transactions'])->count(),
                ],
                'stok' => [
                    'masuk' => EncryptedQuery::countWhere(clone $scoped['stocks'], 'type', 'masuk'),
                    'keluar' => EncryptedQuery::countWhere(clone $scoped['stocks'], 'type', 'keluar'),
                    'produk_aktif' => $products->count(),
                    'stok_rendah' => $lowStockCount,
                ],
                'utang' => [
                    'belum_selesai' => (int) EncryptedQuery::sum($scoped['debts'], 'amount', fn (Debt $debt) => $debt->status === 'belum_selesai'),
                    'sudah_selesai' => (int) EncryptedQuery::sum($scoped['debts'], 'amount', fn (Debt $debt) => $debt->status === 'sudah_selesai'),
                    'count' => (clone $scoped['debts'])->count(),
                ],
            ],
            'chart' => $chart,
            'recentSales' => (clone $scoped['sales'])->with('user')->latest('occurred_at')->limit(5)->get(),
            'recentTransactions' => (clone $scoped['transactions'])->with('user')->latest('occurred_at')->limit(5)->get(),
            'recentStocks' => (clone $scoped['stocks'])->with('user')->latest('occurred_at')->limit(5)->get(),
            'recentDebts' => (clone $scoped['debts'])->with('user')->latest('occurred_at')->limit(5)->get(),
            'notifications' => $user->notifications()->latest()->limit(8)->get(),
        ];

        if ($user->isAdmin()) {
            $payload['stockChart'] = $this->buildStockPieChart(StockMovement::query());
            $payload['chartDebt'] = $this->buildDebtChart(clone $scoped['debts'], null, '1w');
        }

        return $payload;
    }

    /**
     * @return array{sales: Builder, transactions: Builder, stocks: Builder, debts: Builder}
     */
    private function scopedQueries(User $user): array
    {
        $scope = fn (Builder $query) => $query->when(! $user->isAdmin(), fn ($q) => $q->where('user_id', $user->id));

        return [
            'sales' => $scope(Sale::query()),
            'transactions' => $scope(Transaction::query()),
            'stocks' => $scope(StockMovement::query()),
            'debts' => $scope(Debt::query()),
        ];
    }

    private function buildStockPieChart(Builder $query): array
    {
        $stockByItem = [];

        foreach ((clone $query)->get() as $movement) {
            $name = $movement->item_name ?: 'Lainnya';
            $quantity = (float) $movement->quantity;
            $delta = $movement->type === 'keluar' ? -$quantity : $quantity;
            $stockByItem[$name] = ($stockByItem[$name] ?? 0) + $delta;
        }

        $segments = collect($stockByItem)
            ->filter(fn (float $quantity) => $quantity > 0)
            ->map(fn (float $quantity, string $name) => [
                'name' => $name,
                'value' => round($quantity, 2),
            ])
            ->sortByDesc('value')
            ->values();

        if ($segments->isNotEmpty()) {
            return $segments->take(8)->all();
        }

        return [
            ['name' => 'Barang Masuk', 'value' => EncryptedQuery::countWhere($query, 'type', 'masuk')],
            ['name' => 'Barang Keluar', 'value' => EncryptedQuery::countWhere($query, 'type', 'keluar')],
        ];
    }

    private function buildDebtChart(Builder $baseQuery, ?string $status, string $period): array
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

        $points = collect(range(0, $days))->map(function (int $offset) use ($baseQuery, $status, $start) {
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
}
