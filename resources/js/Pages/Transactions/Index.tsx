import Badge from '@/Components/Badge';
import StatCard from '@/Components/StatCard';
import AppLayout from '@/Layouts/AppLayout';
import { dateTimeCompact, humanTransactionUiStatus, registeredUserName, rupiah, rupiahShort } from '@/lib/format';
import { Link, router } from '@inertiajs/react';
import {
    Eye,
    FileDown,
    Plus,
    Receipt,
    Search,
    TrendingDown,
    TrendingUp,
    Users,
    Wallet,
} from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import {
    CartesianGrid,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';

type ChartData = { total: number; points: { label: string; value: number }[]; period: string };
type SummaryData = {
    income: number;
    expense: number;
    balance: number;
    count: number;
    cashierCount: number;
    activeCashiers: number;
};

const incomePeriods = ['1d', '1w', '1m', '3m', '1y'] as const;
const expensePeriods = ['1d', '3d', '1w', '1m', '3m', '6m', '1y', '2y'] as const;

function exportParams(filter: Record<string, string | undefined>) {
    return Object.fromEntries(Object.entries(filter).filter(([, v]) => v !== '' && v != null));
}

function PeriodTabs({
    periods,
    active,
    onChange,
}: {
    periods: readonly string[];
    active: string;
    onChange: (period: string) => void;
}) {
    return (
        <div className="flex flex-wrap gap-1">
            {periods.map((period) => (
                <button
                    key={period}
                    type="button"
                    onClick={() => onChange(period)}
                    className={`rounded-lg px-2 py-1 text-xs font-bold transition ${
                        active === period
                            ? 'bg-indigo-600 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                >
                    {period}
                </button>
            ))}
        </div>
    );
}

function IncomeChart({
    chart,
    period,
    onPeriodChange,
}: {
    chart: ChartData;
    period: string;
    onPeriodChange: (p: string) => void;
}) {
    return (
        <div className="glass-card p-4 sm:p-5">
            <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                <div>
                    <p className="text-sm font-semibold text-slate-500">Total Pemasukan</p>
                    <p className="text-xl font-black tabular-nums sm:text-2xl">{rupiah(chart.total)}</p>
                </div>
                <TrendingUp className="h-6 w-6 text-emerald-500" />
            </div>
            <div className="mb-3 h-40 sm:h-44">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chart.points} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                        <XAxis dataKey="label" tick={{ fontSize: 10 }} tickMargin={4} />
                        <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => rupiahShort(v)} width={44} />
                        <Tooltip formatter={(value) => rupiah(Number(value))} contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                        <Line type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2} dot={false} />
                    </LineChart>
                </ResponsiveContainer>
            </div>
            <PeriodTabs periods={incomePeriods} active={period} onChange={onPeriodChange} />
        </div>
    );
}

function ExpenseChart({
    chart,
    period,
    onPeriodChange,
}: {
    chart: ChartData;
    period: string;
    onPeriodChange: (p: string) => void;
}) {
    return (
        <div className="glass-card p-4 sm:p-5">
            <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                <div>
                    <p className="text-sm font-semibold text-slate-500">Total Pengeluaran</p>
                    <p className="text-xl font-black tabular-nums sm:text-2xl">{rupiah(chart.total)}</p>
                </div>
                <TrendingDown className="h-6 w-6 text-rose-500" />
            </div>
            <div className="mb-3 h-40 sm:h-44">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chart.points} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                        <XAxis dataKey="label" tick={{ fontSize: 10 }} tickMargin={4} />
                        <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => rupiahShort(v)} width={44} />
                        <Tooltip formatter={(value) => rupiah(Number(value))} contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                        <Line type="monotone" dataKey="value" stroke="#f43f5e" strokeWidth={2} dot={false} />
                    </LineChart>
                </ResponsiveContainer>
            </div>
            <PeriodTabs periods={expensePeriods} active={period} onChange={onPeriodChange} />
        </div>
    );
}

function PaginationFooter({ transactions, filter, onPerPage }: { transactions: any; filter: Record<string, string | undefined>; onPerPage: (n: number) => void }) {
    const from = transactions.from ?? 0;
    const to = transactions.to ?? 0;
    const total = transactions.total ?? 0;

    return (
        <div className="flex flex-col gap-4 border-t border-slate-100 p-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500">
                Menampilkan <span className="font-semibold text-slate-700 dark:text-slate-200">{from}</span> sampai{' '}
                <span className="font-semibold text-slate-700 dark:text-slate-200">{to}</span> dari{' '}
                <span className="font-semibold text-slate-700 dark:text-slate-200">{total}</span> entri
            </p>
            <div className="flex flex-wrap items-center gap-2">
                {transactions.links.map((link: any, i: number) => (
                    <button
                        key={i}
                        disabled={!link.url}
                        onClick={() => link.url && router.visit(link.url)}
                        className={`min-w-[2rem] rounded-xl px-3 py-1 text-sm font-semibold ${
                            link.active ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800'
                        }`}
                        dangerouslySetInnerHTML={{ __html: link.label }}
                    />
                ))}
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-500">
                <select
                    className="input !h-9 !w-auto !py-1"
                    value={filter.per_page ?? '10'}
                    onChange={(e) => onPerPage(Number(e.target.value))}
                >
                    {[10, 25, 50, 100].map((n) => (
                        <option key={n} value={n}>
                            {n} entri per halaman
                        </option>
                    ))}
                </select>
            </label>
        </div>
    );
}

function TransactionsTable({
    transactions,
    filter,
    isAdmin,
    onSort,
}: {
    transactions: any;
    filter: Record<string, string | undefined>;
    isAdmin: boolean;
    onSort: (field: string) => void;
}) {
    return (
        <div className="data-table-wrap">
            <table
                className={`data-table data-table--transactions w-full text-sm ${
                    isAdmin ? 'data-table--transactions-cols-6' : 'data-table--transactions-cols-5'
                }`}
            >
                <colgroup>
                    <col />
                    <col />
                    <col />
                    <col />
                    <col />
                    {isAdmin && <col />}
                </colgroup>
                <thead>
                    <tr>
                        <th className="col-date">
                            <button type="button" onClick={() => onSort('occurred_at')} className="truncate font-semibold hover:text-indigo-600">
                                Tanggal
                            </button>
                        </th>
                        {isAdmin && <th className="truncate">Kasir</th>}
                        <th className="col-tight">Jenis Transaksi</th>
                        <th className="col-tight col-money">Nominal</th>
                        <th className="col-tight">Status</th>
                        <th className="col-tight col-actions">Aksi</th>
                    </tr>
                </thead>
                <tbody>
                    {transactions.data.length === 0 ? (
                        <tr>
                            <td colSpan={isAdmin ? 6 : 5} className="py-12 text-center text-slate-400">
                                Belum ada data transaksi.
                            </td>
                        </tr>
                    ) : (
                        transactions.data.map((trx: any) => (
                            <tr key={trx.id}>
                                <td className="col-date" title={trx.occurred_at}>
                                    {dateTimeCompact(trx.occurred_at)}
                                </td>
                                {isAdmin && <td className="truncate">{registeredUserName(trx.user)}</td>}
                                <td className="col-tight">
                                    <Badge value={trx.type} />
                                </td>
                                <td className="col-tight col-money">{rupiah(trx.amount)}</td>
                                <td className="col-tight">
                                    <Badge value={trx.ui_status} label={humanTransactionUiStatus(trx.ui_status)} />
                                </td>
                                <td className="col-tight col-actions">
                                    <div className="table-actions">
                                        <Link
                                            href={route('transactions.show', trx.id)}
                                            className="table-action-btn btn-muted !h-8 !px-2.5 !py-1 text-xs"
                                            title="Detail"
                                        >
                                            <Eye className="h-3.5 w-3.5 shrink-0" />
                                            <span className="btn-label">Detail</span>
                                        </Link>
                                    </div>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
}

export default function TransactionsIndex({
    transactions,
    filters,
    isAdmin,
    cashiers,
    summary,
    chartIncome,
    chartExpense,
    incomePeriod,
    expensePeriod,
}: {
    transactions: any;
    filters: Record<string, string | undefined>;
    isAdmin: boolean;
    cashiers: any[];
    summary?: SummaryData;
    chartIncome?: ChartData;
    chartExpense?: ChartData;
    incomePeriod?: string;
    expensePeriod?: string;
}) {
    const [filter, setFilter] = useState(filters ?? {});

    useEffect(() => {
        setFilter(filters ?? {});
    }, [filters]);

    const tableExportQuery = exportParams({
        ...filter,
        page: String(transactions.current_page ?? 1),
    });

    const navigate = (extra: Record<string, string | number | undefined> = {}) => {
        const params: Record<string, string> = {};
        const merged = { ...filter, ...extra };
        Object.entries(merged).forEach(([key, value]) => {
            if (value !== '' && value != null) {
                params[key] = String(value);
            }
        });
        router.get(route('transactions.index'), params, { preserveState: true });
    };

    const submit = (e: FormEvent) => {
        e.preventDefault();
        navigate();
    };

    const toggleSort = (field: string) => {
        const direction = filter.sort === field && filter.direction !== 'asc' ? 'asc' : 'desc';
        setFilter({ ...filter, sort: field, direction });
        navigate({ sort: field, direction });
    };

    return (
        <AppLayout title="Transaksi">
            {isAdmin && summary && chartIncome && chartExpense && (
                <>
                    <div className="mb-6 grid gap-4 lg:grid-cols-2">
                        <IncomeChart
                            chart={chartIncome}
                            period={incomePeriod ?? '1m'}
                            onPeriodChange={(p) => navigate({ income_period: p })}
                        />
                        <ExpenseChart
                            chart={chartExpense}
                            period={expensePeriod ?? '1m'}
                            onPeriodChange={(p) => navigate({ expense_period: p })}
                        />
                    </div>

                    <div className="mb-6">
                        <h2 className="mb-3 text-base font-black">Ringkasan Data Transaksi</h2>
                        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                            <StatCard title="Total Pemasukan" value={rupiah(summary.income)} icon={TrendingUp} tone="emerald" />
                            <StatCard title="Total Pengeluaran" value={rupiah(summary.expense)} icon={TrendingDown} tone="rose" />
                            <StatCard title="Total Transaksi" value={`${summary.count} data`} icon={Receipt} tone="indigo" />
                            <StatCard title="Jumlah Kasir" value={`${summary.cashierCount} kasir`} icon={Users} tone="sky" />
                            <StatCard title="Saldo Bersih" value={rupiah(summary.balance)} icon={Wallet} tone="indigo" />
                        </div>
                    </div>
                </>
            )}

            <div className="glass-card min-w-0 overflow-hidden">
                <div className="border-b border-slate-100 p-4 dark:border-slate-800 sm:p-6">
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                        <h2 className="text-lg font-black">Daftar Transaksi</h2>
                        <div className="flex flex-wrap items-center gap-2">
                            {isAdmin && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        window.location.href = route('transactions.export', tableExportQuery);
                                    }}
                                    className="btn-primary shrink-0"
                                >
                                    <FileDown className="h-4 w-4" />
                                    Download PDF
                                </button>
                            )}
                            <Link href={route('transactions.create')} className="btn-primary shrink-0">
                                <Plus className="h-4 w-4" />
                                <span className="hidden sm:inline">{isAdmin ? 'Tambah Transaksi' : 'Tambah'}</span>
                            </Link>
                        </div>
                    </div>
                    <form onSubmit={submit} className="filter-bar filter-bar--transactions-admin">
                        <input
                            type="date"
                            className="input filter-bar__control"
                            aria-label="Tanggal"
                            value={filter.date ?? ''}
                            onChange={(e) => setFilter({ ...filter, date: e.target.value })}
                        />
                        {isAdmin && (
                            <select
                                className="input filter-bar__control"
                                aria-label="Nama Kasir"
                                value={filter.user_id ?? ''}
                                onChange={(e) => setFilter({ ...filter, user_id: e.target.value })}
                            >
                                <option value="">Nama Kasir</option>
                                {cashiers.map((u: any) => (
                                    <option key={u.id} value={u.id}>
                                        {registeredUserName(u)}
                                    </option>
                                ))}
                            </select>
                        )}
                        <select
                            className="input filter-bar__control"
                            aria-label="Jenis Transaksi"
                            value={filter.type ?? ''}
                            onChange={(e) => setFilter({ ...filter, type: e.target.value })}
                        >
                            <option value="">Jenis Transaksi</option>
                            <option value="pemasukan">Pemasukan</option>
                            <option value="pengeluaran">Pengeluaran</option>
                        </select>
                        <select
                            className="input filter-bar__control"
                            aria-label="Status"
                            value={filter.ui_status ?? ''}
                            onChange={(e) => setFilter({ ...filter, ui_status: e.target.value })}
                        >
                            <option value="">Status</option>
                            <option value="belum_selesai">Belum</option>
                            <option value="selesai">Selesai</option>
                        </select>
                        <div className="filter-bar__search">
                            <Search className="filter-bar__search-icon h-4 w-4" />
                            <input
                                className="input filter-bar__control !pl-9"
                                placeholder="Pencarian..."
                                aria-label="Pencarian"
                                value={filter.search ?? ''}
                                onChange={(e) => setFilter({ ...filter, search: e.target.value })}
                            />
                        </div>
                        <button type="submit" className="btn-primary filter-bar__submit">
                            Cari
                        </button>
                    </form>
                </div>

                <TransactionsTable
                    transactions={transactions}
                    filter={filter}
                    isAdmin={isAdmin}
                    onSort={toggleSort}
                />
                <PaginationFooter
                    transactions={transactions}
                    filter={filter}
                    onPerPage={(n) => {
                        setFilter({ ...filter, per_page: String(n) });
                        navigate({ per_page: n });
                    }}
                />
            </div>
        </AppLayout>
    );
}
