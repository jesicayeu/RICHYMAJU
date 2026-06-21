import Badge from '@/Components/Badge';
import StatCard from '@/Components/StatCard';
import AppLayout from '@/Layouts/AppLayout';
import { dateTimeCompact, humanSalePaymentStatus, registeredUserName, rupiah } from '@/lib/format';
import { Link, router } from '@inertiajs/react';
import { Eye, Plus, Search, ShoppingCart } from 'lucide-react';
import { FormEvent, useState } from 'react';

type SummaryData = {
    total: number;
    count: number;
    paid: number;
    unpaid: number;
};

const paymentTabs = [
    { value: '', label: 'Semua' },
    { value: 'lunas', label: 'Lunas' },
    { value: 'belum_lunas', label: 'Belum Lunas' },
] as const;

const perPageOptions = [10, 25, 50, 100];

function PaginationFooter({
    sales,
    filter,
    onPerPage,
    isAdmin,
}: {
    sales: any;
    filter: Record<string, string | undefined>;
    onPerPage?: (n: number) => void;
    isAdmin: boolean;
}) {
    const from = sales.from ?? 0;
    const to = sales.to ?? 0;
    const total = sales.total ?? 0;
    const prevLink = sales.links?.[0];
    const nextLink = sales.links?.[sales.links.length - 1];
    const currentPage = sales.current_page ?? 1;

    if (!isAdmin) {
        return (
            <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-slate-500">
                    Menampilkan{' '}
                    <span className="font-semibold text-slate-700 dark:text-slate-200">{from}</span> sampai{' '}
                    <span className="font-semibold text-slate-700 dark:text-slate-200">{to}</span> dari{' '}
                    <span className="font-semibold text-slate-700 dark:text-slate-200">{total}</span> total entri
                </p>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        disabled={!prevLink?.url}
                        onClick={() => prevLink?.url && router.visit(prevLink.url)}
                        className="rounded-xl px-3 py-1.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 disabled:opacity-40 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                        Sebelumnya
                    </button>
                    <span className="grid min-w-[2.5rem] place-items-center rounded-xl bg-indigo-600 px-3 py-1.5 text-sm font-bold text-white">
                        {currentPage}
                    </span>
                    <button
                        type="button"
                        disabled={!nextLink?.url}
                        onClick={() => nextLink?.url && router.visit(nextLink.url)}
                        className="rounded-xl px-3 py-1.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 disabled:opacity-40 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                        Berikutnya →
                    </button>
                </div>
            </div>
        );
    }

    const currentPerPage = Number(filter.per_page ?? 10);

    return (
        <div className="flex flex-col gap-4 border-t border-slate-100 p-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500">
                Menampilkan <span className="font-semibold text-slate-700 dark:text-slate-200">{from}</span> sampai{' '}
                <span className="font-semibold text-slate-700 dark:text-slate-200">{to}</span> dari{' '}
                <span className="font-semibold text-slate-700 dark:text-slate-200">{total}</span> entri
            </p>
            <div className="flex flex-wrap items-center gap-2">
                {sales.links.map((link: any, i: number) => (
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
            <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-slate-500">Tampilkan</span>
                {perPageOptions.map((n) => (
                    <button
                        key={n}
                        type="button"
                        onClick={() => onPerPage?.(n)}
                        className={`rounded-full px-3 py-1 text-sm font-semibold transition ${
                            currentPerPage === n
                                ? 'bg-indigo-600 text-white'
                                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                        }`}
                    >
                        {n}
                    </button>
                ))}
                <span className="text-sm text-slate-500">per halaman</span>
            </div>
        </div>
    );
}

function SalesTable({ sales, isAdmin }: { sales: any; isAdmin: boolean }) {
    const colSpan = isAdmin ? 5 : 4;

    return (
        <div className="data-table-wrap">
            <table className="data-table w-full text-sm">
                <thead>
                    <tr>
                        <th className="col-date whitespace-nowrap">Tanggal</th>
                        {isAdmin && <th className="truncate">Kasir</th>}
                        <th>Total</th>
                        <th className="col-tight">Status</th>
                        <th className="col-tight col-actions">Aksi</th>
                    </tr>
                </thead>
                <tbody>
                    {sales.data.length === 0 ? (
                        <tr>
                            <td colSpan={colSpan} className="py-12 text-center text-slate-400">
                                Belum ada data penjualan.
                            </td>
                        </tr>
                    ) : (
                        sales.data.map((sale: any) => (
                            <tr key={sale.id}>
                                <td className="col-date" title={sale.occurred_at}>
                                    {dateTimeCompact(sale.occurred_at)}
                                </td>
                                {isAdmin && (
                                    <td className="truncate">{registeredUserName(sale.user)}</td>
                                )}
                                <td className="font-semibold tabular-nums">{rupiah(sale.total_amount)}</td>
                                <td className="col-tight">
                                    <Badge
                                        value={sale.payment_status}
                                        label={humanSalePaymentStatus(sale.payment_status)}
                                    />
                                </td>
                                <td className="col-tight col-actions">
                                    <div className="table-actions">
                                        <Link
                                            href={route('sales.show', sale.id)}
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

export default function SalesIndex({
    sales,
    filters,
    isAdmin,
    summary,
}: {
    sales: any;
    filters: Record<string, string | undefined>;
    isAdmin: boolean;
    summary?: SummaryData;
}) {
    const [filter, setFilter] = useState(filters);

    const navigate = (extra?: Record<string, string | number | undefined>) => {
        router.get(route('sales.index'), { ...filter, ...extra }, { preserveState: true, replace: true });
    };

    const submit = (e: FormEvent) => {
        e.preventDefault();
        navigate();
    };

    return (
        <AppLayout title="Penjualan">
            <div className="mb-6 flex flex-wrap items-center justify-end gap-3">
                <Link href={route('sales.pos')} className="btn-primary shrink-0">
                    <Plus className="h-4 w-4" /> Kasir POS
                </Link>
            </div>

            {isAdmin && summary && (
                <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <StatCard
                        title="Total Penjualan"
                        value={rupiah(summary.total)}
                        icon={ShoppingCart}
                        tone="indigo"
                    />
                    <StatCard title="Jumlah Transaksi" value={String(summary.count)} icon={ShoppingCart} tone="sky" />
                    <StatCard title="Sudah Lunas" value={rupiah(summary.paid)} icon={ShoppingCart} tone="emerald" />
                    <StatCard title="Belum Lunas" value={rupiah(summary.unpaid)} icon={ShoppingCart} tone="rose" />
                </div>
            )}

            <div className="glass-card min-w-0 overflow-hidden">
                <div className="space-y-4 border-b border-slate-100 p-4 dark:border-slate-800 sm:p-6">
                    <h3 className="text-lg font-black">Data Penjualan</h3>
                    <form onSubmit={submit} className="filter-bar">
                        <label className="space-y-1">
                            <span className="text-xs font-semibold text-slate-500">Tanggal</span>
                            <input
                                type="date"
                                className="input filter-bar__control"
                                value={filter.date ?? ''}
                                onChange={(e) => setFilter({ ...filter, date: e.target.value })}
                            />
                        </label>
                        <label className="space-y-1">
                            <span className="text-xs font-semibold text-slate-500">Status Bayar</span>
                            <select
                                className="input filter-bar__control"
                                value={filter.payment_status ?? ''}
                                onChange={(e) => setFilter({ ...filter, payment_status: e.target.value })}
                            >
                                {paymentTabs.map((tab) => (
                                    <option key={tab.value} value={tab.value}>
                                        {tab.label}
                                    </option>
                                ))}
                            </select>
                        </label>
                        {isAdmin && (
                            <label className="space-y-1">
                                <span className="text-xs font-semibold text-slate-500">Cari</span>
                                <input
                                    className="input filter-bar__control"
                                    placeholder="Catatan..."
                                    value={filter.search ?? ''}
                                    onChange={(e) => setFilter({ ...filter, search: e.target.value })}
                                />
                            </label>
                        )}
                        <button type="submit" className="btn-primary filter-bar__submit self-end">
                            <Search className="h-4 w-4" /> Cari
                        </button>
                    </form>
                </div>

                <SalesTable sales={sales} isAdmin={isAdmin} />
                <PaginationFooter
                    sales={sales}
                    filter={filter}
                    isAdmin={isAdmin}
                    onPerPage={(n) => navigate({ per_page: n })}
                />
            </div>
        </AppLayout>
    );
}
