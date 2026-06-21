import InputError from '@/Components/InputError';
import BarcodeScanner from '@/Components/BarcodeScanner';
import StatCard from '@/Components/StatCard';
import AppLayout from '@/Layouts/AppLayout';
import { useConfirmDelete } from '@/hooks/useConfirmDelete';
import { formatQuantity, rupiah } from '@/lib/format';
import { Link, router, useForm } from '@inertiajs/react';
import {
    History,
    Package,
    PackageMinus,
    PackagePlus,
    Plus,
    Search,
    ShoppingCart,
    Trash2,
} from 'lucide-react';
import { FormEvent, useRef, useState } from 'react';

type ProductRow = {
    id: number;
    barcode: string;
    name: string;
    unit: string;
    sell_price: number;
    buy_price: number;
    stock: number;
    is_active: boolean;
};

type SummaryData = {
    total: number;
    available: number;
    empty: number;
};

const stockStatusTabs = [
    { value: '', label: 'Semua Stok' },
    { value: 'available', label: 'Stok Tersedia' },
    { value: 'empty', label: 'Stok Habis' },
] as const;

const perPageOptions = [10, 25, 50, 100];

function AdminPaginationFooter({
    products,
    filter,
    onPerPage,
}: {
    products: any;
    filter: Record<string, string | undefined>;
    onPerPage: (n: number) => void;
}) {
    const from = products.from ?? 0;
    const to = products.to ?? 0;
    const total = products.total ?? 0;
    const currentPerPage = Number(filter.per_page ?? 10);

    return (
        <div className="flex flex-col gap-4 border-t border-slate-100 p-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500">
                Menampilkan <span className="font-semibold text-slate-700 dark:text-slate-200">{from}</span> sampai{' '}
                <span className="font-semibold text-slate-700 dark:text-slate-200">{to}</span> dari{' '}
                <span className="font-semibold text-slate-700 dark:text-slate-200">{total}</span> entri
            </p>
            <div className="flex flex-wrap items-center gap-2">
                {products.links.map((link: any, i: number) => (
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

function KasirPaginationFooter({ products }: { products: any }) {
    const from = products.from ?? 0;
    const to = products.to ?? 0;
    const total = products.total ?? 0;
    const prevLink = products.links?.[0];
    const nextLink = products.links?.[products.links.length - 1];
    const currentPage = products.current_page ?? 1;

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

function ProductsTable({ products, isAdmin, onDelete }: { products: any; isAdmin: boolean; onDelete: (product: ProductRow) => void }) {
    const colSpan = isAdmin ? 5 : 4;

    return (
        <div className="data-table-wrap">
            <table className="data-table data-table--products w-full text-sm">
                <colgroup>
                    <col />
                    <col />
                    <col />
                    <col />
                    {isAdmin && <col />}
                </colgroup>
                <thead>
                    <tr>
                        <th className="col-tight">Barcode</th>
                        <th>Nama Barang</th>
                        <th className="col-money">Harga</th>
                        <th className="col-qty">Stok</th>
                        {isAdmin && <th className="col-tight col-actions">Aksi</th>}
                    </tr>
                </thead>
                <tbody>
                    {products.data.length === 0 ? (
                        <tr>
                            <td colSpan={colSpan} className="py-12 text-center text-slate-400">
                                Belum ada produk terdaftar.
                            </td>
                        </tr>
                    ) : (
                        products.data.map((product: ProductRow) => (
                            <tr key={product.id}>
                                <td className="col-tight font-mono text-xs">{product.barcode}</td>
                                <td className="truncate font-medium">
                                    <div>{product.name}</div>
                                    <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                                        {product.unit}
                                    </span>
                                </td>
                                <td className="col-money tabular-nums">{rupiah(product.sell_price)}</td>
                                <td className={`col-qty ${product.stock <= 0 ? 'text-rose-600' : ''}`}>
                                    {formatQuantity(product.stock, product.unit)}
                                </td>
                                {isAdmin && (
                                    <td className="col-tight col-actions">
                                        <div className="table-actions">
                                            <Link
                                                href={route('stocks.index', { product_id: product.id })}
                                                className="table-action-btn btn-muted !h-8 !px-2.5 !py-1 text-xs"
                                                title="Lihat riwayat stok di Stok Barang"
                                            >
                                                <History className="h-3.5 w-3.5 shrink-0" />
                                                <span className="btn-label">Riwayat</span>
                                            </Link>
                                            <button
                                                type="button"
                                                onClick={() => onDelete(product)}
                                                className="table-action-btn btn-muted !h-8 !px-2.5 !py-1 text-xs text-rose-600"
                                                title="Hapus produk"
                                            >
                                                <Trash2 className="h-3.5 w-3.5 shrink-0" />
                                                <span className="btn-label">Hapus</span>
                                            </button>
                                        </div>
                                    </td>
                                )}
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
}

function AddProductForm() {
    const nameInputRef = useRef<HTMLInputElement>(null);
    const { data, setData, processing, reset, errors } = useForm({
        barcode: '',
        name: '',
        unit: 'pcs',
        buy_price: '',
        sell_price: '',
    });

    const handleBarcodeScan = (code: string) => {
        setData('barcode', code);
        window.setTimeout(() => nameInputRef.current?.focus(), 100);
    };

    const submit = (e: FormEvent) => {
        e.preventDefault();
        router.post(
            route('products.store'),
            {
                barcode: data.barcode,
                name: data.name,
                unit: data.unit,
                buy_price: Number(String(data.buy_price).replace(/\D/g, '')),
                sell_price: Number(String(data.sell_price).replace(/\D/g, '')),
            },
            {
                preserveScroll: true,
                onSuccess: () => reset(),
            },
        );
    };

    return (
        <form onSubmit={submit} className="space-y-4 border-b border-slate-100 p-4 dark:border-slate-800 sm:p-6">
            <h3 className="text-base font-black text-slate-600 dark:text-slate-400">Tambah Produk Baru</h3>
            <div className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                    <BarcodeScanner
                        label=""
                        value={data.barcode}
                        onScan={handleBarcodeScan}
                        disabled={processing}
                        retainFocus={false}
                        refocusAfterScan={false}
                    />
                </div>
                <label>
                    <span className="mb-2 block text-sm font-bold">Barcode</span>
                    <input
                        className="input font-mono"
                        value={data.barcode}
                        onChange={(e) => setData('barcode', e.target.value)}
                        placeholder="Scan di atas atau ketik manual"
                    />
                    <InputError message={errors.barcode} />
                </label>
                <label>
                    <span className="mb-2 block text-sm font-bold">Nama Barang</span>
                    <input className="input" ref={nameInputRef} value={data.name} onChange={(e) => setData('name', e.target.value)} />
                    <InputError message={errors.name} />
                </label>
                <label>
                    <span className="mb-2 block text-sm font-bold">Satuan</span>
                    <input
                        className="input"
                        value={data.unit}
                        onChange={(e) => setData('unit', e.target.value)}
                        placeholder="pcs, kg, liter"
                    />
                    <InputError message={errors.unit} />
                </label>
                <label>
                    <span className="mb-2 block text-sm font-bold">Harga Beli</span>
                    <input
                        className="input"
                        value={data.buy_price ? rupiah(Number(String(data.buy_price).replace(/\D/g, ''))) : ''}
                        onChange={(e) => setData('buy_price', e.target.value.replace(/\D/g, ''))}
                        placeholder="Harga modal pembelian"
                    />
                    <InputError message={errors.buy_price} />
                </label>
                <label>
                    <span className="mb-2 block text-sm font-bold">Harga Jual</span>
                    <input
                        className="input"
                        value={data.sell_price ? rupiah(Number(String(data.sell_price).replace(/\D/g, ''))) : ''}
                        onChange={(e) => setData('sell_price', e.target.value.replace(/\D/g, ''))}
                    />
                    <InputError message={errors.sell_price} />
                </label>
            </div>
            <button type="submit" disabled={processing} className="btn-primary">
                <Plus className="h-4 w-4" /> Tambah Produk
            </button>
        </form>
    );
}

function KasirProductsIndex({
    products,
    filter,
    setFilter,
    navigate,
    submit,
}: {
    products: any;
    filter: Record<string, string | undefined>;
    setFilter: (f: Record<string, string | undefined>) => void;
    navigate: (extra?: Record<string, string | number | undefined>) => void;
    submit: (e: FormEvent) => void;
}) {
    return (
        <AppLayout title="Halaman Kelola Produk">
            <div className="mb-6 flex flex-wrap items-center justify-end gap-3">
                <Link href={route('sales.pos')} className="btn-primary shrink-0">
                    <ShoppingCart className="h-4 w-4" /> Buka Kasir POS
                </Link>
            </div>

            <div className="glass-card min-w-0 overflow-hidden">
                <div className="space-y-4 border-b border-slate-100 p-4 dark:border-slate-800 sm:p-6">
                    <h3 className="text-lg font-black">Data Produk</h3>
                    <form onSubmit={submit} className="filter-bar filter-bar--products-kasir">
                        <label className="space-y-1">
                            <span className="text-xs font-semibold text-slate-500">Barcode</span>
                            <input
                                className="input filter-bar__control font-mono"
                                aria-label="Barcode"
                                placeholder="Cari barcode..."
                                value={filter.barcode ?? ''}
                                onChange={(e) => setFilter({ ...filter, barcode: e.target.value })}
                            />
                        </label>
                        <label className="space-y-1">
                            <span className="text-xs font-semibold text-slate-500">Nama</span>
                            <input
                                className="input filter-bar__control"
                                aria-label="Nama Barang"
                                placeholder="Nama barang..."
                                value={filter.name ?? ''}
                                onChange={(e) => setFilter({ ...filter, name: e.target.value })}
                            />
                        </label>
                        <label className="space-y-1">
                            <span className="text-xs font-semibold text-slate-500">Stok</span>
                            <select
                                className="input filter-bar__control"
                                aria-label="Status Stok"
                                value={filter.stock_status ?? ''}
                                onChange={(e) => setFilter({ ...filter, stock_status: e.target.value })}
                            >
                                {stockStatusTabs.map((tab) => (
                                    <option key={tab.value || 'all'} value={tab.value}>
                                        {tab.label}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <button type="submit" className="btn-primary filter-bar__submit self-end">
                            <Search className="h-4 w-4" /> Cari
                        </button>
                    </form>
                </div>

                <ProductsTable products={products} isAdmin={false} onDelete={() => {}} />
                <KasirPaginationFooter products={products} />
            </div>
        </AppLayout>
    );
}

function AdminProductsIndex({
    products,
    filter,
    setFilter,
    navigate,
    submit,
    summary,
    onDelete,
}: {
    products: any;
    filter: Record<string, string | undefined>;
    setFilter: (f: Record<string, string | undefined>) => void;
    navigate: (extra?: Record<string, string | number | undefined>) => void;
    submit: (e: FormEvent) => void;
    summary: SummaryData;
    onDelete: (product: ProductRow) => void;
}) {
    const toggleSort = () => {
        const direction = filter.direction === 'asc' ? 'desc' : 'asc';
        setFilter({ ...filter, sort: 'name', direction });
        navigate({ sort: 'name', direction });
    };

    return (
        <AppLayout title="Kelola Produk">
            <div className="mb-6 grid gap-4 md:grid-cols-3">
                <StatCard
                    title="Total Produk"
                    value={summary.total.toLocaleString('id-ID')}
                    subtitle="Produk Aktif"
                    icon={Package}
                    tone="indigo"
                />
                <StatCard
                    title="Stok Tersedia"
                    value={summary.available.toLocaleString('id-ID')}
                    subtitle="Produk"
                    icon={PackagePlus}
                    tone="emerald"
                />
                <StatCard
                    title="Stok Habis"
                    value={summary.empty.toLocaleString('id-ID')}
                    subtitle="Produk"
                    icon={PackageMinus}
                    tone="rose"
                />
            </div>

            <div className="glass-card min-w-0 overflow-hidden">
                <div className="border-b border-slate-100 p-4 dark:border-slate-800 sm:p-6">
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <h2 className="text-lg font-black">Daftar Produk</h2>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <Link href={route('stocks.index')} className="btn-muted shrink-0">
                                <History className="h-4 w-4" />
                                <span className="hidden sm:inline">Stok Barang</span>
                            </Link>
                            <Link href={route('sales.pos')} className="btn-primary shrink-0">
                                <ShoppingCart className="h-4 w-4" />
                                <span className="hidden sm:inline">Buka Kasir POS</span>
                            </Link>
                        </div>
                    </div>

                    <AddProductForm />

                    <h3 className="mb-4 mt-6 text-base font-black text-slate-600 dark:text-slate-400">Filter Produk</h3>
                    <form onSubmit={submit} className="filter-bar filter-bar--products">
                        <input
                            className="input filter-bar__control font-mono"
                            placeholder="Barcode"
                            aria-label="Barcode"
                            value={filter.barcode ?? ''}
                            onChange={(e) => setFilter({ ...filter, barcode: e.target.value })}
                        />
                        <input
                            className="input filter-bar__control"
                            placeholder="Nama Barang"
                            aria-label="Nama Barang"
                            value={filter.name ?? ''}
                            onChange={(e) => setFilter({ ...filter, name: e.target.value })}
                        />
                        <select
                            className="input filter-bar__control"
                            aria-label="Status Stok"
                            value={filter.stock_status ?? ''}
                            onChange={(e) => setFilter({ ...filter, stock_status: e.target.value })}
                        >
                            {stockStatusTabs.map((tab) => (
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
                    <table className="data-table data-table--products w-full text-sm">
                        <colgroup>
                            <col />
                            <col />
                            <col />
                            <col />
                            <col />
                        </colgroup>
                        <thead>
                            <tr>
                                <th className="col-tight">Barcode</th>
                                <th>
                                    <button
                                        type="button"
                                        onClick={toggleSort}
                                        className="font-semibold hover:text-indigo-600"
                                    >
                                        Nama Barang
                                    </button>
                                </th>
                                <th className="col-money">Harga</th>
                                <th className="col-qty">Stok</th>
                                <th className="col-tight col-actions">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {products.data.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-12 text-center text-slate-400">
                                        Belum ada produk terdaftar.
                                    </td>
                                </tr>
                            ) : (
                                products.data.map((product: ProductRow) => (
                                    <tr key={product.id}>
                                        <td className="col-tight font-mono text-xs">{product.barcode}</td>
                                        <td className="truncate font-medium">
                                            <div>{product.name}</div>
                                            <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                                                {product.unit}
                                            </span>
                                        </td>
                                        <td className="col-money tabular-nums">{rupiah(product.sell_price)}</td>
                                        <td className={`col-qty ${product.stock <= 0 ? 'text-rose-600' : ''}`}>
                                            {formatQuantity(product.stock, product.unit)}
                                        </td>
                                        <td className="col-tight col-actions">
                                            <div className="table-actions">
                                                <Link
                                                    href={route('stocks.index', { product_id: product.id })}
                                                    className="table-action-btn btn-muted !h-8 !px-2.5 !py-1 text-xs"
                                                >
                                                    <History className="h-3.5 w-3.5 shrink-0" />
                                                    <span className="btn-label">Riwayat</span>
                                                </Link>
                                                <button
                                                    type="button"
                                                    onClick={() => onDelete(product)}
                                                    className="table-action-btn btn-muted !h-8 !px-2.5 !py-1 text-xs text-rose-600"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5 shrink-0" />
                                                    <span className="btn-label">Hapus</span>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <AdminPaginationFooter
                    products={products}
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

export default function ProductsIndex({
    products,
    filters,
    summary,
    isAdmin,
}: {
    products: any;
    filters: Record<string, string | undefined>;
    summary?: SummaryData;
    isAdmin: boolean;
}) {
    const [filter, setFilter] = useState(filters ?? {});

    const { requestDelete, deleteModal } = useConfirmDelete({
        buildRoute: (id) => route('products.destroy', id),
        message: (target) => `Hapus produk "${target.label}"? Tindakan ini tidak dapat dibatalkan.`,
    });

    const navigate = (extra: Record<string, string | number | undefined> = {}) => {
        const params: Record<string, string> = {};
        const merged = { ...filter, ...extra };
        Object.entries(merged).forEach(([key, value]) => {
            if (value !== '' && value != null) {
                params[key] = String(value);
            }
        });
        router.get(route('products.index'), params, { preserveState: true });
    };

    const submit = (e: FormEvent) => {
        e.preventDefault();
        navigate();
    };

    const shared = { products, filter, setFilter, navigate, submit };

    return (
        <>
            {!isAdmin ? (
                <KasirProductsIndex {...shared} />
            ) : (
                <AdminProductsIndex
                    {...shared}
                    summary={summary ?? { total: 0, available: 0, empty: 0 }}
                    onDelete={(product) => requestDelete({ id: product.id, label: product.name })}
                />
            )}

            {deleteModal}
        </>
    );
}
