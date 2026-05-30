import Badge from '@/Components/Badge';
import StatCard from '@/Components/StatCard';
import AppLayout from '@/Layouts/AppLayout';
import { dateTime, rupiah, rupiahShort } from '@/lib/format';
import { Link } from '@inertiajs/react';
import { HandCoins, Receipt, TrendingDown, TrendingUp } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export default function KasirDashboard({ stats, chart, recentTransactions, recentDebts }: any) {
    return (
        <AppLayout title="Dashboard Kasir">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <StatCard title="Pemasukan Hari Ini" value={rupiah(stats.incomeToday)} icon={TrendingUp} tone="emerald" />
                <StatCard title="Pengeluaran Hari Ini" value={rupiah(stats.expenseToday)} icon={TrendingDown} tone="rose" />
                <StatCard title="Laba Hari Ini" value={rupiah(stats.profitToday)} icon={Receipt} tone="indigo" />
                <StatCard title="Utang Belum Selesai" value={rupiah(stats.debtOpen)} icon={HandCoins} tone="sky" />
            </div>

            <div className="mt-6 grid items-start gap-6 xl:grid-cols-3">
                <div className="glass-card p-4 sm:p-6 xl:col-span-2">
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
                <div className="glass-card p-6">
                    <div className="mb-4 flex items-center justify-between gap-3">
                        <h2 className="text-lg font-black">Utang Terbaru</h2>
                        <Link href={route('debts.index')} className="btn-muted text-sm">Lihat Semua</Link>
                    </div>
                    <div className="space-y-3">
                        {recentDebts.map((debt: any) => (
                            <Link key={debt.id} href={route('debts.show', debt.id)} className="block rounded-2xl border border-slate-100 p-4 transition hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900">
                                <div className="font-bold">{debt.party_name}</div>
                                <div className="text-sm text-slate-500">{debt.item_name} - {rupiah(debt.amount)}</div>
                                <div className="mt-2"><Badge value={debt.status} /></div>
                            </Link>
                        ))}
                    </div>
                </div>
            </div>

            <div className="glass-card mt-6 overflow-hidden">
                <div className="flex items-center justify-between p-6">
                    <h2 className="text-lg font-black">Transaksi Terbaru</h2>
                    <Link href={route('transactions.index')} className="btn-muted text-sm">Lihat Semua</Link>
                </div>
                <div className="overflow-x-auto">
                    <table className="data-table w-full text-sm">
                        <thead className="bg-slate-50 text-left dark:bg-slate-900">
                            <tr>
                                <th className="p-4 whitespace-nowrap">Tanggal</th>
                                <th className="p-4 text-center">Jenis</th>
                                <th className="p-4 text-right">Nominal</th>
                            </tr>
                        </thead>
                        <tbody>
                            {recentTransactions.map((trx: any) => (
                                <tr key={trx.id} className="border-t border-slate-100 dark:border-slate-800">
                                    <td className="p-4 whitespace-nowrap">{dateTime(trx.occurred_at)}</td>
                                    <td className="p-4 text-center">
                                        <Badge value={trx.type} />
                                    </td>
                                    <td className="p-4 text-right font-black tabular-nums whitespace-nowrap">
                                        {rupiah(trx.amount)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </AppLayout>
    );
}
