import Badge from '@/Components/Badge';
import StatCard from '@/Components/StatCard';
import AppLayout from '@/Layouts/AppLayout';
import { dateTimeCompact, humanDebtStatus, registeredUserName, rupiah, rupiahShort } from '@/lib/format';
import { Link, router } from '@inertiajs/react';
import {
    CheckCircle2,
    ClipboardList,
    Eye,
    FileDown,
    Search,
    ShieldCheck,
    TrendingDown,
    TrendingUp,
    Users,
    Wallet,
} from 'lucide-react';
import { FormEvent, useState } from 'react';
import {
    CartesianGrid,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';

type ChartData = {
    total: number;
    points: { label: string; value: number }[];
    period: string;
    changePercent: number;
};

type SummaryData = {
    total: number;
    paid: number;
    unpaid: number;
    count: number;
    cashierCount: number;
    activeCashiers: number;
};

const chartPeriods = ['1d', '3d', '1w', '1m', '3m', '6m', '1y', '2y'] as const;

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

function DebtChart({
    title,
    chart,
    period,
    onPeriodChange,
    tone,
}: {
    title: string;
    chart: ChartData;
    period: string;
    onPeriodChange: (p: string) => void;
    tone: 'indigo' | 'rose';
}) {
    const stroke = tone === 'indigo' ? '#6366f1' : '#f43f5e';
    const Icon = tone === 'indigo' ? TrendingUp : TrendingDown;
    const isUp = chart.changePercent >= 0;

    return (
        <div className="glass-card p-4 sm:p-5">
            <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                <div>
                    <p className="text-sm font-semibold text-slate-500">{title}</p>
                    <p className="text-xl font-black tabular-nums sm:text-2xl">{rupiah(chart.total)}</p>
                    <p className={`mt-1 text-xs font-semibold ${isUp ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {isUp ? '↑' : '↓'} {Math.abs(chart.changePercent)}% dari periode sebelumnya
                    </p>
                </div>
                <Icon className={`h-6 w-6 ${tone === 'indigo' ? 'text-indigo-500' : 'text-rose-500'}`} />
            </div>
            <div className="mb-3 h-40 sm:h-44">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chart.points} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                        <XAxis dataKey="label" tick={{ fontSize: 10 }} tickMargin={4} />
                        <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => rupiahShort(v)} width={44} />
                        <Tooltip formatter={(value) => rupiah(Number(value))} contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                        <Line type="monotone" dataKey="value" stroke={stroke} strokeWidth={2} dot={false} />
                    </LineChart>
                </ResponsiveContainer>
            </div>
            <PeriodTabs periods={chartPeriods} active={period} onChange={onPeriodChange} />
        </div>
    );
}

function PaginationFooter({
    debts,
    filter,
    onPerPage,
}: {
    debts: any;
    filter: Record<string, string | undefined>;
    onPerPage: (n: number) => void;
}) {
    const from = debts.from ?? 0;
    const to = debts.to ?? 0;
    const total = debts.total ?? 0;

    return (
        <div className="flex flex-col gap-4 border-t border-slate-100 p-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500">
                Menampilkan <span className="font-semibold text-slate-700 dark:text-slate-200">{from}</span> sampai{' '}
                <span className="font-semibold text-slate-700 dark:text-slate-200">{to}</span> dari{' '}
                <span className="font-semibold text-slate-700 dark:text-slate-200">{total}</span> entri
            </p>
            <div className="flex flex-wrap items-center gap-2">
                {debts.links.map((link: any, i: number) => (
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

function DebtsTable({ debts, isAdmin }: { debts: any; isAdmin: boolean }) {
    const colSpan = isAdmin ? 7 : 6;

    return (
        <div className="data-table-wrap">
            <table
                className={`data-table data-table--debts w-full text-sm ${
                    isAdmin ? 'data-table--debts-cols-7' : 'data-table--debts-cols-6'
                }`}
            >
                <colgroup>
                    <col />
                    <col />
                    <col />
                    {isAdmin && <col />}
                    <col />
                    <col />
                    <col />
                </colgroup>
                <thead>
                    <tr>
                        <th className="col-date">Tanggal</th>
                        <th>Barang</th>
                        <th>Orang</th>
                        {isAdmin && <th className="truncate">Kasir</th>}
                        <th className="col-tight">Status</th>
                        <th className="col-money whitespace-nowrap">Nominal</th>
                        <th className="col-tight col-actions">Aksi</th>
                    </tr>
                </thead>
                <tbody>
                    {debts.data.length === 0 ? (
                        <tr>
                            <td colSpan={colSpan} className="py-12 text-center text-slate-400">
                                Belum ada data utang.
                            </td>
                        </tr>
                    ) : (
                        debts.data.map((debt: any) => (
                            <tr key={debt.id}>
                                <td className="col-date" title={debt.occurred_at}>
                                    {dateTimeCompact(debt.occurred_at)}
                                </td>
                                <td className="truncate font-medium">{debt.item_name}</td>
                                <td className="truncate">{debt.party_name}</td>
                                {isAdmin && <td className="truncate">{registeredUserName(debt.user)}</td>}
                                <td className="col-tight">
                                    <Badge value={debt.status} label={humanDebtStatus(debt.status)} />
                                </td>
                                <td className="col-money font-black tabular-nums" title={rupiah(debt.amount)}>
                                    <span className="hidden sm:inline">{rupiah(debt.amount)}</span>
                                    <span className="sm:hidden">{rupiahShort(debt.amount)}</span>
                                </td>
                                <td className="col-tight col-actions">
                                    <div className="table-actions">
                                        <Link
                                            href={route('debts.show', debt.id)}
                                            className="table-action-btn btn-muted !h-8 !px-2.5 !py-1 text-xs"
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

export default function DebtsIndex({
    debts,
    filters,
    isAdmin,
    cashiers,
    summary,
    chartTotal,
    chartUnpaid,
    totalPeriod,
    unpaidPeriod,
}: {
    debts: any;
    filters: Record<string, string | undefined>;
    isAdmin: boolean;
    cashiers: any[];
    summary?: SummaryData;
    chartTotal?: ChartData;
    chartUnpaid?: ChartData;
    totalPeriod?: string;
    unpaidPeriod?: string;
}) {
    const [filter, setFilter] = useState(filters ?? {});

    const navigate = (extra: Record<string, string | number | undefined> = {}) => {
        const params: Record<string, string> = {};
        const merged = { ...filter, ...extra };
        Object.entries(merged).forEach(([key, value]) => {
            if (value !== '' && value != null) {
                params[key] = String(value);
            }
        });
        router.get(route('debts.index'), params, { preserveState: true });
    };

    const submit = (e: FormEvent) => {
        e.preventDefault();
        navigate();
    };

    return (
        <AppLayout title="Utang">
            {isAdmin && summary && chartTotal && chartUnpaid && (
                <>
                    <div className="mb-6 grid gap-4 lg:grid-cols-2">
                        <DebtChart
                            title="Total Utang"
                            chart={chartTotal}
                            period={totalPeriod ?? '1m'}
                            onPeriodChange={(p) => navigate({ total_period: p })}
                            tone="indigo"
                        />
                        <DebtChart
                            title="Utang Belum Lunas"
                            chart={chartUnpaid}
                            period={unpaidPeriod ?? '1m'}
                            onPeriodChange={(p) => navigate({ unpaid_period: p })}
                            tone="rose"
                        />
                    </div>

                    <div className="mb-6">
                        <h3 className="mb-4 text-base font-black">Ringkasan Utang</h3>
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            <StatCard title="Total Utang" value={rupiah(summary.total)} icon={Wallet} tone="indigo" />
                            <StatCard title="Utang Sudah Lunas" value={rupiah(summary.paid)} icon={CheckCircle2} tone="emerald" />
                            <StatCard title="Utang Belum Lunas" value={rupiah(summary.unpaid)} icon={TrendingDown} tone="rose" />
                            <StatCard title="Total Data" value={`${summary.count} data`} icon={ClipboardList} tone="indigo" />
                            <StatCard title="Kasir Terlibat" value={`${summary.cashierCount} kasir`} icon={Users} tone="sky" />
                            <StatCard title="Kasir Aktif" value={`${summary.activeCashiers} kasir`} icon={ShieldCheck} tone="sky" />
                        </div>
                    </div>
                </>
            )}

            <div className="glass-card min-w-0 overflow-hidden">
                <div className="border-b border-slate-100 p-4 dark:border-slate-800 sm:p-6">
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                        <h2 className="text-lg font-black">Daftar Utang</h2>
                        {isAdmin && (
                            <button
                                type="button"
                                onClick={() => {
                                    window.location.href = route('debts.export', exportParams(filter));
                                }}
                                className="btn-primary shrink-0"
                            >
                                <FileDown className="h-4 w-4" />
                                Download PDF
                            </button>
                        )}
                    </div>
                    <form
                        onSubmit={submit}
                        className={`filter-bar ${isAdmin ? 'filter-bar--debts-admin' : 'filter-bar--admin'}`}
                    >
                        <input
                            type="date"
                            className="input filter-bar__control"
                            aria-label="Tanggal"
                            value={filter.date ?? ''}
                            onChange={(e) => setFilter({ ...filter, date: e.target.value })}
                        />
                        <input
                            className="input filter-bar__control"
                            placeholder="Nama Barang"
                            aria-label="Nama Barang"
                            value={filter.item_name ?? ''}
                            onChange={(e) => setFilter({ ...filter, item_name: e.target.value })}
                        />
                        <input
                            className="input filter-bar__control"
                            placeholder="Nama Orang"
                            aria-label="Nama Orang"
                            value={filter.party_name ?? ''}
                            onChange={(e) => setFilter({ ...filter, party_name: e.target.value })}
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
                            aria-label="Status"
                            value={filter.status ?? ''}
                            onChange={(e) => setFilter({ ...filter, status: e.target.value })}
                        >
                            <option value="">Status</option>
                            <option value="belum_selesai">Belum</option>
                            <option value="sudah_selesai">Selesai</option>
                        </select>
                        <div className="filter-bar__search">
                            <Search className="filter-bar__search-icon h-4 w-4" />
                            <input
                                type="number"
                                min={0}
                                className="input filter-bar__control !pl-9"
                                placeholder="Nominal"
                                aria-label="Nominal"
                                value={filter.amount ?? ''}
                                onChange={(e) => setFilter({ ...filter, amount: e.target.value })}
                            />
                        </div>
                        <button type="submit" className="btn-primary filter-bar__submit">
                            Cari
                        </button>
                    </form>
                </div>

                <DebtsTable debts={debts} isAdmin={isAdmin} />
                <PaginationFooter
                    debts={debts}
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
