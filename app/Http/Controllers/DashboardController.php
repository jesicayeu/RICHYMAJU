<?php

namespace App\Http\Controllers;

use App\Models\Debt;
use App\Models\StockMovement;
use App\Models\Transaction;
use App\Models\User;
use App\Services\EncryptedQuery;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __invoke(Request $request): Response
    {
        $user = $request->user();
        $today = Carbon::today();
        $baseTransactions = Transaction::query()->when(! $user->isAdmin(), fn ($query) => $query->where('user_id', $user->id));
        $baseDebts = Debt::query()->when(! $user->isAdmin(), fn ($query) => $query->where('user_id', $user->id));
        $baseStocks = StockMovement::query()->when(! $user->isAdmin(), fn ($query) => $query->where('user_id', $user->id));

        $todayTransactions = (clone $baseTransactions)->whereDate('occurred_at', $today);
        $income = (int) EncryptedQuery::sum($todayTransactions, 'amount', fn (Transaction $t) => $t->type === 'pemasukan');
        $expense = (int) EncryptedQuery::sum($todayTransactions, 'amount', fn (Transaction $t) => $t->type === 'pengeluaran');

        $chart = collect(range(6, 0))->map(function (int $days) use ($baseTransactions) {
            $date = Carbon::today()->subDays($days);
            $dayQuery = (clone $baseTransactions)->whereDate('occurred_at', $date);

            return [
                'date' => $date->format('d M'),
                'pemasukan' => (int) EncryptedQuery::sum($dayQuery, 'amount', fn (Transaction $t) => $t->type === 'pemasukan'),
                'pengeluaran' => (int) EncryptedQuery::sum($dayQuery, 'amount', fn (Transaction $t) => $t->type === 'pengeluaran'),
            ];
        })->values();

        $payload = [
            'stats' => [
                'incomeToday' => $income,
                'expenseToday' => $expense,
                'profitToday' => $income - $expense,
                'debtOpen' => (int) EncryptedQuery::sum($baseDebts, 'amount', fn (Debt $debt) => $debt->status === 'belum_selesai'),
                'pendingTransactions' => EncryptedQuery::countWhere(Transaction::query(), 'verification_status', 'menunggu'),
                'pendingDebts' => EncryptedQuery::countWhere(Debt::query(), 'verification_status', 'menunggu'),
                'activeCashiers' => User::where('role', 'kasir')->where('status', 'aktif')->count(),
            ],
            'chart' => $chart,
            'recentTransactions' => (clone $baseTransactions)->with('user')->latest('occurred_at')->limit(5)->get(),
            'recentStocks' => (clone $baseStocks)->with('user')->latest('occurred_at')->limit(5)->get(),
            'recentDebts' => (clone $baseDebts)->with('user')->latest('occurred_at')->limit(5)->get(),
            'notifications' => $user->notifications()->latest()->limit(8)->get(),
        ];

        if ($user->isAdmin()) {
            $payload['stockChart'] = $this->buildStockPieChart(StockMovement::query());
            $payload['chartDebt'] = $this->buildDebtChart(clone $baseDebts, null, '1w');
        }

        return Inertia::render($user->isAdmin() ? 'Dashboard/Admin' : 'Dashboard/Kasir', $payload);
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
