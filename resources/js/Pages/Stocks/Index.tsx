import Badge from '@/Components/Badge';
import StatCard from '@/Components/StatCard';
import AppLayout from '@/Layouts/AppLayout';
import {
    dateTimeCompact,
    formatQuantity,
    humanStockStatus,
    humanStockType,
} from '@/lib/format';
import { Link, router } from '@inertiajs/react';
import {
    ArrowDownToLine,
    ArrowUpFromLine,
    Eye,
    FileDown,
    Package,
    Plus,
    Search,
    Trash2,
} from 'lucide-react';
import { FormEvent, useState } from 'react';
import { useConfirmDelete } from '@/hooks/useConfirmDelete';

type ProductOption = {
    id: number;
    name: string;
    unit: string;
    stock: number;
};

type SummaryData = {
    itemTypes: number;
    incoming: number;
    outgoing: number;
    availableProducts?: number;
    emptyProducts?: number;
};

function ProductStockSummary({ products, isAdmin = false }: { products: ProductOption[]; isAdmin?: boolean }) {
    const { requestDelete, deleteModal } = useConfirmDelete({
        buildRoute: (id) => route('stocks.clear-product', id),
        title: 'Hapus Stok Produk',
        message: (target) =>
            `Yakin hapus semua riwayat stok untuk "${target.label}"? Produk tetap ada di Kelola Produk, hanya data stok yang dihapus.`,
    });

    if (products.length === 0) {
        return null;
    }

    return (
        <div className="glass-card mb-6 min-w-0 overflow-hidden">
            <div className="border-b border-slate-100 p-4 dark:border-slate-800 sm:p-6">
                <h2 className="text-lg font-black">Stok Produk Saat Ini</h2>
                <p className="mt-1 text-sm text-slate-500">
                    Angka stok otomatis terupdate dari barang masuk, penjualan POS, dan keluar manual.
                </p>
            </div>
            <div className="data-table-wrap">
                <table className="data-table w-full text-sm">
                    <thead>
                        <tr>
                            <th>Produk</th>
                            <th className="col-qty">Stok Tersedia</th>
                            <th className="col-tight col-actions">Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        {products.map((product) => (
                            <tr key={product.id}>
                                <td className="font-medium">{product.name}</td>
                                <td className={`col-qty font-semibold tabular-nums ${product.stock <= 0 ? 'text-rose-600' : ''}`}>
                                    {formatQuantity(product.stock, product.unit)}
                                </td>
                                <td className="col-tight col-actions">
                                    <div className="table-actions">
                                        <Link
                                            href={route('stocks.index', { product_id: product.id })}
                                            className="table-action-btn btn-muted !h-8 !px-2.5 !py-1 text-xs"
                                        >
                                            Riwayat
                                        </Link>
                                        <Link
                                            href={route('stocks.create', { product_id: product.id, type: 'masuk' })}
                                            className="table-action-btn btn-primary !h-8 !px-2.5 !py-1 text-xs"
                                        >
                                            + Masuk
                                        </Link>
                                        {isAdmin && (
                                            <button
                                                type="button"
                                                onClick={() => requestDelete({ id: product.id, label: product.name })}
                                                className="table-action-btn btn-muted !h-8 !px-2.5 !py-1 text-xs text-rose-600"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                                Hapus
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {deleteModal}
        </div>
    );
}

const typeTabs = [
    { value: '', label: 'Semua Stok' },
    { value: 'masuk', label: 'Barang Masuk' },
    { value: 'keluar', label: 'Barang Keluar' },
] as const;

const statusTabs = [
    { value: '', label: 'Semua' },
    { value: 'selesai', label: 'Selesai' },
    { value: 'diproses', label: 'Diproses' },
] as const;

const perPageOptions = [10, 25, 50, 100];

function exportParams(filter: Record<string, string | undefined>) {
    return Object.fromEntries(Object.entries(filter).filter(([, v]) => v !== '' && v != null));
}

function AdminPaginationFooter({
    movements,
    filter,
    onPerPage,
}: {
    movements: any;
    filter: Record<string, string | undefined>;
    onPerPage: (n: number) => void;
}) {
    const from = movements.from ?? 0;
    const to = movements.to ?? 0;
    const total = movements.total ?? 0;
    const currentPerPage = Number(filter.per_page ?? 10);

    return (
        <div className="flex flex-col gap-4 border-t border-slate-100 p-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500">
                Menampilkan <span className="font-semibold text-slate-700 dark:text-slate-200">{from}</span> sampai{' '}
                <span className="font-semibold text-slate-700 dark:text-slate-200">{to}</span> dari{' '}
                <span className="font-semibold text-slate-700 dark:text-slate-200">{total}</span> entri
            </p>
            <div className="flex flex-wrap items-center gap-2">
                {movements.links.map((link: any, i: number) => (
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
                        onClick={() => onPerPage(n)}
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

function KasirPaginationFooter({ movements }: { movements: any }) {
    const from = movements.from ?? 0;
    const to = movements.to ?? 0;
    const total = movements.total ?? 0;
    const prevLink = movements.links?.[0];
    const nextLink = movements.links?.[movements.links.length - 1];
    const currentPage = movements.current_page ?? 1;

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

function StocksTable({ movements }: { movements: any }) {
    return (
        <div className="data-table-wrap">
            <table className="data-table data-table--stocks w-full text-sm">
                <colgroup>
                    <col />
                    <col />
                    <col />
                    <col />
                    <col />
                    <col />
                </colgroup>
                <thead>
                    <tr>
                        <th className="col-date whitespace-nowrap">Tanggal</th>
                        <th>Nama Barang</th>
                        <th className="col-tight">Jenis</th>
                        <th className="col-qty">Jumlah</th>
                        <th className="col-tight">Status</th>
                        <th className="col-tight col-actions">Aksi</th>
                    </tr>
                </thead>
                <tbody>
                    {movements.data.length === 0 ? (
                        <tr>
                            <td colSpan={6} className="py-12 text-center text-slate-400">
                                Belum ada data stok.
                            </td>
                        </tr>
                    ) : (
                        movements.data.map((movement: any) => (
                            <tr key={movement.id}>
                                <td className="col-date" title={movement.occurred_at}>
                                    {dateTimeCompact(movement.occurred_at)}
                                </td>
                                <td className="truncate font-medium">
                                    <div>{movement.item_name}</div>
                                    {movement.product_id && (
                                        <span className="text-[10px] font-semibold uppercase tracking-wide text-indigo-600">
                                            Produk POS
                                        </span>
                                    )}
                                </td>
                                <td className="col-tight">
                                    <Badge value={movement.type} label={humanStockType(movement.type)} />
                                </td>
                                <td className="col-qty">{formatQuantity(movement.quantity, movement.unit)}</td>
                                <td className="col-tight">
                                    <Badge value={movement.status} label={humanStockStatus(movement.status)} />
                                </td>
                                <td className="col-tight col-actions">
                                    <div className="table-actions">
                                        <Link
                                            href={route('stocks.show', movement.id)}
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

function KasirStocksIndex({
    movements,
    filter,
    setFilter,
    navigate,
    submit,
    products = [],
}: {
    movements: any;
    filter: Record<string, string | undefined>;
    setFilter: (f: Record<string, string | undefined>) => void;
    navigate: (extra?: Record<string, string | number | undefined>) => void;
    submit: (e: FormEvent) => void;
    products?: ProductOption[];
}) {
    return (
        <AppLayout title="Halaman Stok Barang">
            <div className="mb-6 flex flex-wrap items-center justify-end gap-3">
                <Link href={route('stocks.create')} className="btn-primary shrink-0">
                    <Plus className="h-4 w-4" /> Tambah Stok
                </Link>
            </div>

            <ProductStockSummary products={products} />

            <div className="glass-card min-w-0 overflow-hidden">
                <div className="space-y-4 border-b border-slate-100 p-4 dark:border-slate-800 sm:p-6">
                    <h3 className="text-lg font-black">Data Stok Barang</h3>
                    <form onSubmit={submit} className="filter-bar filter-bar--stocks-kasir">
                        <label className="space-y-1">
                            <span className="text-xs font-semibold text-slate-500">Tanggal</span>
                            <input
                                type="date"
                                className="input filter-bar__control"
                                aria-label="Tanggal"
                                value={filter.date ?? ''}
                                onChange={(e) => setFilter({ ...filter, date: e.target.value })}
                            />
                        </label>
                        <label className="space-y-1">
                            <span className="text-xs font-semibold text-slate-500">Jenis</span>
                            <select
                                className="input filter-bar__control"
                                aria-label="Semua Jenis"
                                value={filter.type ?? ''}
                                onChange={(e) => setFilter({ ...filter, type: e.target.value })}
                            >
                                <option value="">Semua Jenis</option>
                                <option value="masuk">Masuk</option>
                                <option value="keluar">Keluar</option>
                            </select>
                        </label>
                        <label className="space-y-1">
                            <span className="text-xs font-semibold text-slate-500">Status</span>
                            <select
                                className="input filter-bar__control"
                                aria-label="Semua Status"
                                value={filter.status ?? ''}
                                onChange={(e) => setFilter({ ...filter, status: e.target.value })}
                            >
                                <option value="">Semua Status</option>
                                <option value="selesai">Selesai</option>
                                <option value="diproses">Diproses</option>
                            </select>
                        </label>
                        <label className="space-y-1">
                            <span className="text-xs font-semibold text-slate-500">Jumlah / Stok</span>
                            <input
                                type="number"
                                min={0}
                                step="any"
                                className="input filter-bar__control filter-bar__control--number"
                                placeholder="Jumlah / Stok"
                                aria-label="Jumlah / Stok"
                                value={filter.quantity ?? ''}
                                onChange={(e) => setFilter({ ...filter, quantity: e.target.value })}
                            />
                        </label>
                        <button type="submit" className="btn-primary filter-bar__submit self-end">
                            <Search className="h-4 w-4" /> Cari
                        </button>
                    </form>
                </div>

                <StocksTable movements={movements} />
                <KasirPaginationFooter movements={movements} />
            </div>
        </AppLayout>
    );
}

function AdminStocksIndex({
    movements,
    filters,
    filter,
    setFilter,
    navigate,
    submit,
    summary,
    products = [],
}: {
    movements: any;
    filters: Record<string, string | undefined>;
    filter: Record<string, string | undefined>;
    setFilter: (f: Record<string, string | undefined>) => void;
    navigate: (extra?: Record<string, string | number | undefined>) => void;
    submit: (e: FormEvent) => void;
    summary: SummaryData;
    products?: ProductOption[];
}) {
    const toggleSort = () => {
        const direction = filter.direction === 'asc' ? 'desc' : 'asc';
        setFilter({ ...filter, sort: 'occurred_at', direction });
        navigate({ sort: 'occurred_at', direction });
    };

    return (
        <AppLayout title="Stok Barang">
            <div className="mb-6 grid gap-4 md:grid-cols-3 xl:grid-cols-5">
                <StatCard
                    title="Total Barang"
                    value={summary.itemTypes.toLocaleString('id-ID')}
                    subtitle="Jenis Barang"
                    icon={Package}
                    tone="indigo"
                />
                <StatCard
                    title="Stok Tersedia"
                    value={(summary.availableProducts ?? 0).toLocaleString('id-ID')}
                    subtitle="Produk"
                    icon={Package}
                    tone="emerald"
                />
                <StatCard
                    title="Stok Habis"
                    value={(summary.emptyProducts ?? 0).toLocaleString('id-ID')}
                    subtitle="Produk"
                    icon={Package}
                    tone="rose"
                />
                <StatCard
                    title="Barang Masuk"
                    value={summary.incoming.toLocaleString('id-ID')}
                    subtitle="Transaksi"
                    icon={ArrowDownToLine}
                    tone="emerald"
                />
                <StatCard
                    title="Barang Keluar"
                    value={summary.outgoing.toLocaleString('id-ID')}
                    subtitle="Transaksi"
                    icon={ArrowUpFromLine}
                    tone="rose"
                />
            </div>

            <ProductStockSummary products={products} isAdmin />

            <div className="glass-card min-w-0 overflow-hidden">
                <div className="border-b border-slate-100 p-4 dark:border-slate-800 sm:p-6">
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                        <h2 className="text-lg font-black">Daftar Stok Barang</h2>
                        <div className="flex flex-wrap items-center gap-2">
                            <Link href={route('products.index')} className="btn-muted shrink-0">
                                <Package className="h-4 w-4" />
                                <span className="hidden sm:inline">Kelola Produk</span>
                            </Link>
                            <button
                                type="button"
                                onClick={() => {
                                    window.location.href = route('stocks.export', exportParams(filter));
                                }}
                                className="btn-primary shrink-0"
                            >
                                <FileDown className="h-4 w-4" />
                                Download PDF
                            </button>
                            <Link href={route('stocks.create')} className="btn-primary shrink-0">
                                <Plus className="h-4 w-4" />
                                <span className="hidden sm:inline">Tambah Stok</span>
                            </Link>
                        </div>
                    </div>
                    <h3 className="mb-4 text-base font-black text-slate-600 dark:text-slate-400">Filter Stok</h3>
                    <form onSubmit={submit} className="filter-bar filter-bar--stocks">
                        <select
                            className="input filter-bar__control"
                            aria-label="Produk Penjualan"
                            value={filter.product_id ?? ''}
                            onChange={(e) => setFilter({ ...filter, product_id: e.target.value })}
                        >
                            <option value="">Semua Produk</option>
                            {products.map((product) => (
                                <option key={product.id} value={product.id}>
                                    {product.name} — Stok: {formatQuantity(product.stock, product.unit)}
                                </option>
                            ))}
                        </select>
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
                        <select
                            className="input filter-bar__control"
                            aria-label="Jenis Stok"
                            value={filter.type ?? ''}
                            onChange={(e) => setFilter({ ...filter, type: e.target.value })}
                        >
                            {typeTabs.map((tab) => (
                                <option key={tab.value || 'all'} value={tab.value}>
                                    {tab.label}
                                </option>
                            ))}
                        </select>
                        <select
                            className="input filter-bar__control"
                            aria-label="Status"
                            value={filter.status ?? ''}
                            onChange={(e) => setFilter({ ...filter, status: e.target.value })}
                        >
                            {statusTabs.map((tab) => (
                                <option key={tab.value || 'all'} value={tab.value}>
                                    {tab.label}
                                </option>
                            ))}
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

                <div className="data-table-wrap">
                    <table className="data-table data-table--stocks w-full text-sm">
                        <colgroup>
                            <col />
                            <col />
                            <col />
                            <col />
                            <col />
                            <col />
                        </colgroup>
                        <thead>
                            <tr>
                                <th className="col-date whitespace-nowrap">
                                    <button
                                        type="button"
                                        onClick={toggleSort}
                                        className="font-semibold hover:text-indigo-600"
                                    >
                                        Tanggal
                                    </button>
                                </th>
                                <th>Nama Barang</th>
                                <th className="col-tight">Jenis</th>
                                <th className="col-qty">Jumlah</th>
                                <th className="col-tight">Status</th>
                                <th className="col-tight col-actions">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {movements.data.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="py-12 text-center text-slate-400">
                                        Belum ada data stok.
                                    </td>
                                </tr>
                            ) : (
                                movements.data.map((movement: any) => (
                                    <tr key={movement.id}>
                                        <td className="col-date" title={movement.occurred_at}>
                                            {dateTimeCompact(movement.occurred_at)}
                                        </td>
                                        <td className="truncate font-medium">
                                    <div>{movement.item_name}</div>
                                    {movement.product_id && (
                                        <span className="text-[10px] font-semibold uppercase tracking-wide text-indigo-600">
                                            Produk POS
                                        </span>
                                    )}
                                </td>
                                        <td className="col-tight">
                                            <Badge
                                                value={movement.type}
                                                label={humanStockType(movement.type)}
                                            />
                                        </td>
                                        <td className="col-qty font-semibold tabular-nums">
                                            {formatQuantity(movement.quantity, movement.unit)}
                                        </td>
                                        <td className="col-tight">
                                            <Badge
                                                value={movement.status}
                                                label={humanStockStatus(movement.status)}
                                            />
                                        </td>
                                        <td className="col-tight col-actions">
                                            <div className="table-actions">
                                                <Link
                                                    href={route('stocks.show', movement.id)}
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

                <AdminPaginationFooter
                    movements={movements}
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

export default function StocksIndex({
    movements,
    filters,
    summary,
    isAdmin,
    products = [],
}: {
    movements: any;
    filters: Record<string, string | undefined>;
    summary?: SummaryData;
    isAdmin: boolean;
    products?: ProductOption[];
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
        router.get(route('stocks.index'), params, { preserveState: true });
    };

    const submit = (e: FormEvent) => {
        e.preventDefault();
        navigate();
    };

    const shared = { movements, filters, filter, setFilter, navigate, submit };

    if (!isAdmin) {
        return <KasirStocksIndex {...shared} products={products} />;
    }

    return (
        <AdminStocksIndex
            {...shared}
            products={products}
            summary={summary ?? { itemTypes: 0, incoming: 0, outgoing: 0, availableProducts: 0, emptyProducts: 0 }}
        />
    );
}
