import Badge from '@/Components/Badge';
import StatCard from '@/Components/StatCard';
import AppLayout from '@/Layouts/AppLayout';
import { dateTime, rupiah, rupiahShort, userDisplayName } from '@/lib/format';
import { Link } from '@inertiajs/react';
import { FileDown, Receipt, ShieldCheck, TrendingDown, TrendingUp, Users, Wallet } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export default function AdminDashboard({ stats, chart, recentTransactions, recentDebts }: any) {
    return (
        <AppLayout title="Dashboard Admin">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <StatCard title="Pemasukan Hari Ini" value={rupiah(stats.incomeToday)} icon={TrendingUp} tone="emerald" />
                <StatCard title="Pengeluaran Hari Ini" value={rupiah(stats.expenseToday)} icon={TrendingDown} tone="rose" />
                <StatCard title="Menunggu Verifikasi" value={`${stats.pendingTransactions + stats.pendingDebts} data`} icon={ShieldCheck} tone="indigo" />
                <StatCard title="Kasir Aktif" value={`${stats.activeCashiers} akun`} icon={Users} tone="sky" />
            </div>

            <div className="mt-6 grid items-start gap-6 xl:grid-cols-3">
                <div className="glass-card p-4 sm:p-6 xl:col-span-2">
                    <div className="mb-3 flex items-center justify-between">
                        <h2 className="text-base font-black sm:text-lg">Grafik Transaksi</h2>
                        <a href={route('transactions.export')} className="btn-muted"><FileDown className="h-4 w-4" /> PDF</a>
                    </div>
                    <div className="h-56">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chart} margin={{ top: 8, right: 12, left: 0, bottom: 0 }} barCategoryGap="20%">
                                <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickMargin={6} />
                                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => rupiahShort(v)} width={50} />
                                <Tooltip formatter={(value) => rupiah(Number(value))} contentStyle={{ borderRadius: 12, fontSize: 12 }} cursor={{ fill: 'rgba(99,102,241,0.06)' }} />
                                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 4 }} iconType="circle" />
                                <Bar name="Pemasukan" dataKey="pemasukan" fill="#10b981" radius={[8, 8, 0, 0]} />
                                <Bar name="Pengeluaran" dataKey="pengeluaran" fill="#f43f5e" radius={[8, 8, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                <div className="grid gap-4">
                    <Link href={route('transactions.index')} className="glass-card p-6 transition hover:-translate-y-1">
                        <Receipt className="mb-3 h-8 w-8 text-indigo-500" />
                        <div className="text-xl font-black">Semua Transaksi</div>
                        <p className="text-sm text-slate-500">Filter, verifikasi, dan export PDF.</p>
                    </Link>
                    <Link href={route('debts.index')} className="glass-card p-6 transition hover:-translate-y-1">
                        <Wallet className="mb-3 h-8 w-8 text-sky-500" />
                        <div className="text-xl font-black">Semua Utang</div>
                        <p className="text-sm text-slate-500">Kelola status dan verifikasi.</p>
                    </Link>
                </div>
            </div>

            <div className="mt-6 grid gap-6 xl:grid-cols-2">
                <div className="glass-card p-6">
                    <h2 className="mb-4 text-lg font-black">Transaksi Perlu Dicek</h2>
                    <div className="space-y-3">
                        {recentTransactions.map((trx: any) => (
                            <Link key={trx.id} href={route('transactions.show', trx.id)} className="flex items-center justify-between rounded-2xl border border-slate-100 p-4 dark:border-slate-800">
                                <div>
                                    <div className="font-bold">{userDisplayName(trx.user)}</div>
                                    <div className="text-sm text-slate-500">{dateTime(trx.occurred_at)}</div>
                                </div>
                                <Badge value={trx.verification_status} />
                            </Link>
                        ))}
                    </div>
                </div>
                <div className="glass-card p-6">
                    <div className="mb-4 flex items-center justify-between gap-3">
                        <h2 className="text-lg font-black">Utang Terbaru</h2>
                        <Link href={route('debts.index')} className="btn-muted text-sm">Lihat Semua</Link>
                    </div>
                    <div className="space-y-3">
                        {recentDebts.map((debt: any) => (
                            <Link key={debt.id} href={route('debts.show', debt.id)} className="flex items-center justify-between rounded-2xl border border-slate-100 p-4 dark:border-slate-800">
                                <div><div className="font-bold">{debt.party_name}</div><div className="text-sm text-slate-500">{rupiah(debt.amount)}</div></div>
                                <Badge value={debt.verification_status} />
                            </Link>
                        ))}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
