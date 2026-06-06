import DebtTrendChart, { type DebtChartData } from '@/Components/DebtTrendChart';
import {
    DashboardRecentDebts,
    DashboardRecentStocks,
    DashboardRecentTransactions,
} from '@/Components/DashboardRecentLists';
import StatCard from '@/Components/StatCard';
import AppLayout from '@/Layouts/AppLayout';
import { formatQuantity, rupiah, rupiahShort } from '@/lib/format';
import { Link } from '@inertiajs/react';
import { Package, ShieldCheck, TrendingDown, TrendingUp, Users } from 'lucide-react';
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Legend,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';

type StockSegment = { name: string; value: number };

const stockColors = ['#6366f1', '#10b981', '#f59e0b', '#f43f5e', '#0ea5e9', '#8b5cf6', '#14b8a6', '#ec4899'];

export default function AdminDashboard({
    stats,
    chart,
    stockChart = [],
    chartDebt,
    recentTransactions,
    recentStocks,
    recentDebts,
}: {
    stats: any;
    chart: any[];
    stockChart?: StockSegment[];
    chartDebt?: DebtChartData;
    recentTransactions: any[];
    recentStocks: any[];
    recentDebts: any[];
}) {
    const hasStockData = stockChart.some((segment) => segment.value > 0);

    return (
        <AppLayout title="Dashboard Admin">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <StatCard title="Pemasukan Hari Ini" value={rupiah(stats.incomeToday)} icon={TrendingUp} tone="emerald" />
                <StatCard title="Pengeluaran Hari Ini" value={rupiah(stats.expenseToday)} icon={TrendingDown} tone="rose" />
                <StatCard title="Menunggu Verifikasi" value={`${stats.pendingTransactions + stats.pendingDebts} data`} icon={ShieldCheck} tone="indigo" />
                <StatCard title="Kasir Aktif" value={`${stats.activeCashiers} akun`} icon={Users} tone="sky" />
            </div>

            <div className="glass-card mt-6 p-4 sm:p-6">
                <h2 className="mb-3 text-base font-black sm:text-lg">Grafik Transaksi</h2>
                <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chart} margin={{ top: 8, right: 12, left: 0, bottom: 0 }} barCategoryGap="20%">
                            <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                            <XAxis dataKey="date" tick={{ fontSize: 11 }} tickMargin={6} />
                            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => rupiahShort(v)} width={50} />
                            <Legend wrapperStyle={{ fontSize: 11, paddingTop: 4 }} iconType="circle" />
                            <Bar name="Pemasukan" dataKey="pemasukan" fill="#10b981" radius={[8, 8, 0, 0]} />
                            <Bar name="Pengeluaran" dataKey="pengeluaran" fill="#f43f5e" radius={[8, 8, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="mt-6 grid items-start gap-6 xl:grid-cols-3">
                <div className="glass-card p-4 sm:p-6">
                    <div className="mb-3 flex items-center justify-between gap-3">
                        <div>
                            <h2 className="text-base font-black sm:text-lg">Stok Barang</h2>
                            <p className="text-sm text-slate-500">Distribusi jumlah per barang</p>
                        </div>
                        <Link href={route('stocks.index')} className="btn-muted text-sm">
                            <Package className="h-4 w-4" />
                        </Link>
                    </div>
                    <div className="h-56">
                        {hasStockData ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={stockChart}
                                        dataKey="value"
                                        nameKey="name"
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={48}
                                        outerRadius={78}
                                        paddingAngle={2}
                                    >
                                        {stockChart.map((segment, index) => (
                                            <Cell key={segment.name} fill={stockColors[index % stockColors.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        formatter={(value) => formatQuantity(Number(value))}
                                        contentStyle={{ borderRadius: 12, fontSize: 12 }}
                                    />
                                    <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-slate-200 text-sm text-slate-500 dark:border-slate-700">
                                Belum ada data stok untuk ditampilkan.
                            </div>
                        )}
                    </div>
                </div>

                <DebtTrendChart chartDebt={chartDebt} className="xl:col-span-2 !p-4 sm:!p-6" />
            </div>

            <div className="mt-6 grid gap-6 xl:grid-cols-3">
                <DashboardRecentTransactions items={recentTransactions} showUser />
                <DashboardRecentStocks items={recentStocks} />
                <DashboardRecentDebts items={recentDebts} />
            </div>
        </AppLayout>
    );
}
