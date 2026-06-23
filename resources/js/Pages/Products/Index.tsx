import InputError from '@/Components/InputError';
import BarcodeScanner from '@/Components/BarcodeScanner';
import AppLayout from '@/Layouts/AppLayout';
import { formatQuantity, rupiah } from '@/lib/format';
import { Link, router, useForm } from '@inertiajs/react';
import {
    AlertCircle,
    CheckCircle2,
    History,
    Loader2,
    Plus,
    Search,
    ShoppingCart,
    Trash2,
} from 'lucide-react';
import { FormEvent, useEffect, useRef, useState } from 'react';

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

const stockStatusTabs = [
    { value: '', label: 'Semua Stok' },
    { value: 'available', label: 'Stok Tersedia' },
    { value: 'empty', label: 'Stok Habis' },
] as const;

type BarcodeStatus =
    | { state: 'idle' }
    | { state: 'checking'; code?: string }
    | { state: 'registered'; code: string; product: ProductRow; isActive: boolean }
    | { state: 'unregistered'; code: string };

function BarcodeRegistrationStatus({ status }: { status: BarcodeStatus }) {
    if (status.state === 'idle') return null;

    if (status.state === 'checking') {
        return (
            <div className="mt-3 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                <Loader2 className="h-4 w-4 animate-spin" />
                Memeriksa barcode{status.code ? ` ${status.code}` : ''}...
            </div>
        );
    }

    if (status.state === 'unregistered') {
        return (
            <div className="mt-3 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                    <p className="font-bold">Barcode belum terdaftar</p>
                    <p className="mt-1 font-mono text-xs">{status.code}</p>
                    <p className="mt-1 text-xs opacity-90">Silakan lengkapi data produk di bawah.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
                <p className="font-bold">
                    {status.isActive ? 'Produk sudah terdaftar' : 'Barcode sudah digunakan (produk nonaktif)'}
                </p>
                <p className="mt-1 font-mono text-xs">{status.code}</p>
                <p className="mt-1 font-medium">{status.product.name}</p>
                <p className="mt-1 text-xs opacity-90">
                    Stok: {formatQuantity(status.product.stock, status.product.unit)} · Harga jual:{' '}
                    {rupiah(status.product.sell_price)}
                </p>
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
    const checkAbortRef = useRef<AbortController | null>(null);
    const [barcodeStatus, setBarcodeStatus] = useState<BarcodeStatus>({ state: 'idle' });
    const { data, setData, processing, reset, errors } = useForm({
        barcode: '',
        name: '',
        unit: 'pcs',
        initial_quantity: '',
        buy_price: '',
        sell_price: '',
    });

    const applyCheckResult = (
        needle: string,
        result: { registered: boolean; is_active?: boolean; product?: ProductRow },
    ) => {
        if (result.registered && result.product) {
            setBarcodeStatus({
                state: 'registered',
                code: needle,
                product: result.product,
                isActive: Boolean(result.is_active),
            });
            setData('barcode', '');
            return;
        }

        setBarcodeStatus({ state: 'unregistered', code: needle });
        setData('barcode', needle);
    };

    const checkBarcode = (code: string) => {
        const needle = code.trim();
        if (needle.length < 3) {
            setBarcodeStatus((prev) => (prev.state === 'registered' ? prev : { state: 'idle' }));
            return;
        }

        checkAbortRef.current?.abort();
        const controller = new AbortController();
        checkAbortRef.current = controller;
        setBarcodeStatus({ state: 'checking', code: needle });

        fetch(route('products.check', encodeURIComponent(needle)), {
            headers: { Accept: 'application/json' },
            signal: controller.signal,
        })
            .then(async (response) => {
                if (!response.ok) {
                    setBarcodeStatus({ state: 'idle' });
                    return;
                }

                const result = await response.json();
                applyCheckResult(needle, result);
            })
            .catch((error: Error) => {
                if (error.name !== 'AbortError') {
                    setBarcodeStatus({ state: 'idle' });
                }
            });
    };

    useEffect(() => {
        const timer = window.setTimeout(() => checkBarcode(data.barcode), 300);
        return () => window.clearTimeout(timer);
    }, [data.barcode]);

    const handleBarcodeScan = async (code: string) => {
        const needle = code.trim();
        if (needle.length < 3) return;
        if (data.barcode.trim() && barcodeStatus.state === 'unregistered') return;

        checkAbortRef.current?.abort();
        const controller = new AbortController();
        checkAbortRef.current = controller;
        setBarcodeStatus({ state: 'checking', code: needle });

        try {
            const response = await fetch(route('products.check', encodeURIComponent(needle)), {
                headers: { Accept: 'application/json' },
                signal: controller.signal,
            });

            if (!response.ok) {
                setBarcodeStatus({ state: 'idle' });
                return;
            }

            const result = await response.json();
            applyCheckResult(needle, result);

            if (!result.registered) {
                window.setTimeout(() => nameInputRef.current?.focus(), 100);
            }
        } catch (error) {
            if ((error as Error).name !== 'AbortError') {
                setBarcodeStatus({ state: 'idle' });
            }
        }
    };

    const submit = (e: FormEvent) => {
        e.preventDefault();
        if (barcodeStatus.state === 'registered') return;
        router.post(
            route('products.store'),
            {
                barcode: data.barcode,
                name: data.name,
                unit: data.unit,
                buy_price: Number(String(data.buy_price).replace(/\D/g, '')),
                sell_price: Number(String(data.sell_price).replace(/\D/g, '')),
                initial_quantity:
                    data.initial_quantity === '' ? 0 : Number(String(data.initial_quantity).replace(',', '.')),
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    reset();
                    setBarcodeStatus({ state: 'idle' });
                },
            },
        );
    };

    return (
        <form onSubmit={submit} className="space-y-4 border-b border-slate-100 p-4 dark:border-slate-800 sm:p-6">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                <div className="block min-w-0">
                    <label className="block">
                        <span className="mb-1.5 block text-sm font-bold">Barcode</span>
                        <input
                            className="input font-mono"
                            value={data.barcode}
                            onChange={(e) => setData('barcode', e.target.value)}
                            placeholder="Ketik manual atau scan dengan kamera"
                        />
                        <InputError message={errors.barcode} />
                    </label>
                    <BarcodeScanner
                        label=""
                        variant="register"
                        embedded
                        lockWhenFilled={Boolean(data.barcode.trim())}
                        value={data.barcode}
                        onScan={handleBarcodeScan}
                        disabled={processing}
                        retainFocus={false}
                        refocusAfterScan={false}
                    />
                    <BarcodeRegistrationStatus status={barcodeStatus} />
                </div>
                <label className="block min-w-0">
                    <span className="mb-1.5 block text-sm font-bold">Nama Barang</span>
                    <input className="input" ref={nameInputRef} value={data.name} onChange={(e) => setData('name', e.target.value)} />
                    <InputError message={errors.name} />
                </label>
                <div className="flex min-w-0 flex-col gap-2">
                    <label className="block">
                        <span className="mb-1.5 block text-sm font-bold">Satuan</span>
                        <input
                            className="input"
                            value={data.unit}
                            onChange={(e) => setData('unit', e.target.value)}
                            placeholder="pcs, kg, liter"
                        />
                        <InputError message={errors.unit} />
                    </label>
                    <label className="block">
                        <span className="mb-1.5 block text-sm font-bold">Jumlah Saat Ini</span>
                        <input
                            type="number"
                            min="0"
                            step="0.01"
                            inputMode="decimal"
                            className="input"
                            value={data.initial_quantity}
                            onChange={(e) => setData('initial_quantity', e.target.value)}
                            placeholder="0"
                        />
                        <InputError message={errors.initial_quantity} />
                    </label>
                </div>
                <div className="flex min-w-0 flex-col gap-2">
                    <label className="block">
                        <span className="mb-1.5 block text-sm font-bold">Harga Beli</span>
                        <input
                            className="input"
                            value={data.buy_price ? rupiah(Number(String(data.buy_price).replace(/\D/g, ''))) : ''}
                            onChange={(e) => setData('buy_price', e.target.value.replace(/\D/g, ''))}
                            placeholder="Harga modal pembelian"
                        />
                        <InputError message={errors.buy_price} />
                    </label>
                    <label className="block">
                        <span className="mb-1.5 block text-sm font-bold">Harga Jual</span>
                        <input
                            className="input"
                            value={data.sell_price ? rupiah(Number(String(data.sell_price).replace(/\D/g, ''))) : ''}
                            onChange={(e) => setData('sell_price', e.target.value.replace(/\D/g, ''))}
                        />
                        <InputError message={errors.sell_price} />
                    </label>
                </div>
            </div>
            <button type="submit" disabled={processing} className="btn-primary w-full sm:w-auto">
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

function AdminProductsIndex() {
    return (
        <AppLayout title="Kelola Produk">
            <div className="glass-card min-w-0 overflow-hidden">
                <div className="p-4 dark:border-slate-800 sm:p-6">
                    <h2 className="mb-4 text-lg font-black">Tambah Produk Baru</h2>
                    <AddProductForm />
                </div>
            </div>
        </AppLayout>
    );
}

export default function ProductsIndex({
    products,
    filters,
    isAdmin,
}: {
    products: any;
    filters: Record<string, string | undefined>;
    isAdmin: boolean;
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
                <AdminProductsIndex />
            )}
        </>
    );
}
