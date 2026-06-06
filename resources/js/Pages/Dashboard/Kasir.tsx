import {
    DashboardRecentDebts,
    DashboardRecentStocks,
    DashboardRecentTransactions,
} from '@/Components/DashboardRecentLists';
import StatCard from '@/Components/StatCard';
import AppLayout from '@/Layouts/AppLayout';
import { rupiah, rupiahShort } from '@/lib/format';
import { HandCoins, Receipt, TrendingDown, TrendingUp } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export default function KasirDashboard({
    stats,
    chart,
    recentTransactions,
    recentStocks,
    recentDebts,
}: {
    stats: any;
    chart: any[];
    recentTransactions: any[];
    recentStocks: any[];
    recentDebts: any[];
}) {
    return (
        <AppLayout title="Dashboard Kasir">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <StatCard title="Pemasukan Hari Ini" value={rupiah(stats.incomeToday)} icon={TrendingUp} tone="emerald" />
                <StatCard title="Pengeluaran Hari Ini" value={rupiah(stats.expenseToday)} icon={TrendingDown} tone="rose" />
                <StatCard title="Laba Hari Ini" value={rupiah(stats.profitToday)} icon={Receipt} tone="indigo" />
                <StatCard title="Utang Belum Selesai" value={rupiah(stats.debtOpen)} icon={HandCoins} tone="sky" />
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
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="mt-6 grid gap-6 xl:grid-cols-3">
                <DashboardRecentTransactions items={recentTransactions} />
                <DashboardRecentStocks items={recentStocks} />
                <DashboardRecentDebts items={recentDebts} />
            </div>
        </AppLayout>
    );
}
