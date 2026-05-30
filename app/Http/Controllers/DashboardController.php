<?php

namespace App\Http\Controllers;

use App\Models\Debt;
use App\Models\Transaction;
use App\Models\User;
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

        $income = (clone $baseTransactions)->where('type', 'pemasukan')->whereDate('occurred_at', $today)->sum('amount');
        $expense = (clone $baseTransactions)->where('type', 'pengeluaran')->whereDate('occurred_at', $today)->sum('amount');

        $chart = collect(range(6, 0))->map(function (int $days) use ($baseTransactions) {
            $date = Carbon::today()->subDays($days);

            return [
                'date' => $date->format('d M'),
                'pemasukan' => (clone $baseTransactions)->where('type', 'pemasukan')->whereDate('occurred_at', $date)->sum('amount'),
                'pengeluaran' => (clone $baseTransactions)->where('type', 'pengeluaran')->whereDate('occurred_at', $date)->sum('amount'),
            ];
        })->values();

        return Inertia::render($user->isAdmin() ? 'Dashboard/Admin' : 'Dashboard/Kasir', [
            'stats' => [
                'incomeToday' => $income,
                'expenseToday' => $expense,
                'profitToday' => $income - $expense,
                'debtOpen' => (clone $baseDebts)->where('status', 'belum_selesai')->sum('amount'),
                'pendingTransactions' => Transaction::where('verification_status', 'menunggu')->count(),
                'pendingDebts' => Debt::where('verification_status', 'menunggu')->count(),
                'activeCashiers' => User::where('role', 'kasir')->where('status', 'aktif')->count(),
            ],
            'chart' => $chart,
            'recentTransactions' => (clone $baseTransactions)->with('user')->latest('occurred_at')->limit(3)->get(),
            'recentDebts' => (clone $baseDebts)->with('user')->latest('occurred_at')->limit(2)->get(),
            'notifications' => $user->notifications()->latest()->limit(8)->get(),
        ]);
    }
}
