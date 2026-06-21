import DashboardReportDialog from '@/Components/DashboardReportDialog';
import DashboardSummary from '@/Components/DashboardSummary';
import {
    DashboardRecentDebts,
    DashboardRecentSales,
    DashboardRecentStocks,
    DashboardRecentTransactions,
} from '@/Components/DashboardRecentLists';
import StatCard from '@/Components/StatCard';
import AppLayout from '@/Layouts/AppLayout';
import { rupiah, rupiahShort } from '@/lib/format';
import { FileDown, HandCoins, Receipt, ShoppingCart, TrendingDown, TrendingUp } from 'lucide-react';
import { useState } from 'react';
import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export default function KasirDashboard({
    stats,
    summary,
    chart,
    recentSales,
    recentTransactions,
    recentStocks,
    recentDebts,
}: {
    stats: any;
    summary: any;
    chart: any[];
    recentSales: any[];
    recentTransactions: any[];
    recentStocks: any[];
    recentDebts: any[];
}) {
    const [showReportDialog, setShowReportDialog] = useState(false);

    return (
        <AppLayout title="Dashboard Kasir">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-xl font-black sm:text-2xl">Dashboard</h1>
                    <p className="text-sm text-slate-500">Ringkasan data penjualan, transaksi, stok, dan utang</p>
                </div>
                <button type="button" className="btn-primary" onClick={() => setShowReportDialog(true)}>
                    <FileDown className="h-4 w-4" />
                    Cetak Laporan
                </button>
            </div>

            {showReportDialog && (
                <DashboardReportDialog
                    stats={stats}
                    summary={summary}
                    recentSales={recentSales}
                    recentTransactions={recentTransactions}
                    recentStocks={recentStocks}
                    recentDebts={recentDebts}
                    onClose={() => setShowReportDialog(false)}
                />
            )}

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <StatCard title="Penjualan Hari Ini" value={rupiah(stats.salesToday)} icon={ShoppingCart} tone="violet" />
                <StatCard title="Pemasukan Hari Ini" value={rupiah(stats.incomeToday)} icon={TrendingUp} tone="emerald" />
                <StatCard title="Pengeluaran Hari Ini" value={rupiah(stats.expenseToday)} icon={TrendingDown} tone="rose" />
                <StatCard title="Laba Hari Ini" value={rupiah(stats.profitToday)} icon={Receipt} tone="indigo" subtitle={`Total pemasukan ${rupiah(stats.totalIncomeToday)}`} />
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
                <StatCard title="Transaksi Penjualan" value={`${stats.salesCountToday} hari ini`} icon={ShoppingCart} tone="violet" />
                <StatCard title="Utang Belum Selesai" value={rupiah(stats.debtOpen)} icon={HandCoins} tone="sky" />
            </div>

            <div className="mt-6">
                <DashboardSummary summary={summary} />
            </div>

            <div className="glass-card mt-6 p-4 sm:p-6">
                <h2 className="mb-3 text-base font-black sm:text-lg">Tren 7 Hari</h2>
                <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chart} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                            <XAxis dataKey="date" tick={{ fontSize: 11 }} tickMargin={6} />
                            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => rupiahShort(v)} width={50} />
                            <Tooltip formatter={(value) => rupiah(Number(value))} contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                            <Legend wrapperStyle={{ fontSize: 11, paddingTop: 4 }} iconType="circle" />
                            <Area type="monotone" name="Pemasukan" dataKey="pemasukan" stroke="#10b981" fill="#10b981" fillOpacity={0.2} />
                            <Area type="monotone" name="Pengeluaran" dataKey="pengeluaran" stroke="#f43f5e" fill="#f43f5e" fillOpacity={0.15} />
                            <Area type="monotone" name="Penjualan POS" dataKey="penjualan" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.15} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="mt-6 grid gap-6 xl:grid-cols-2">
                <DashboardRecentSales items={recentSales} />
                <DashboardRecentTransactions items={recentTransactions} />
            </div>

            <div className="mt-6 grid gap-6 xl:grid-cols-2">
                <DashboardRecentStocks items={recentStocks} />
                <DashboardRecentDebts items={recentDebts} />
            </div>
        </AppLayout>
    );
}
