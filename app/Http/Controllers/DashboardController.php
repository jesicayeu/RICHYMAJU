<?php

namespace App\Http\Controllers;

use App\Models\Debt;
use App\Models\Transaction;
use App\Models\User;
use App\Services\EncryptedQuery;
use Carbon\Carbon;
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

        return Inertia::render($user->isAdmin() ? 'Dashboard/Admin' : 'Dashboard/Kasir', [
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
            'recentTransactions' => (clone $baseTransactions)->with('user')->latest('occurred_at')->limit(3)->get(),
            'recentDebts' => (clone $baseDebts)->with('user')->latest('occurred_at')->limit(2)->get(),
            'notifications' => $user->notifications()->latest()->limit(8)->get(),
        ]);
    }
}
