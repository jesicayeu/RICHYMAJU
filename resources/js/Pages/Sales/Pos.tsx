import BarcodeScanner from '@/Components/BarcodeScanner';
import PaymentQrDialog from '@/Components/PaymentQrDialog';
import SaleReceiptDialog, { type ReceiptSale } from '@/Components/SaleReceiptDialog';
import AppLayout from '@/Layouts/AppLayout';
import { formatQuantity, rupiah } from '@/lib/format';
import { Link } from '@inertiajs/react';
import { CreditCard, Keyboard, Minus, Package, Plus, Settings2, ShoppingCart, Trash2, Wallet, Wrench } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

type Product = {
    id: number;
    barcode: string;
    name: string;
    unit: string;
    sell_price: number;
    stock: number;
};

type CartItem = {
    product_id: number;
    barcode: string;
    item_name: string;
    unit: string;
    price: number;
    quantity: number;
    stock: number;
};

type PendingPayment = {
    sale: ReceiptSale;
    paymentQrPayload?: string | null;
    paymentQrError?: string | null;
    paymentInfo?: {
        merchant_name?: string | null;
        merchant_id?: string | null;
        provider_name?: string | null;
        has_qris?: boolean;
    };
};

function csrfToken(): string {
    return document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ?? '';
}

function parseCashAmount(value: string): number {
    const digits = value.replace(/\D/g, '');
    return digits ? Number(digits) : 0;
}

export default function SalesPos({
    products,
    isAdmin,
    paymentConfigured,
    paymentInfo,
}: {
    products: Product[];
    isAdmin: boolean;
    paymentConfigured: boolean;
    paymentInfo: PendingPayment['paymentInfo'];
}) {
    const [cart, setCart] = useState<CartItem[]>([]);
    const [paymentMethod, setPaymentMethod] = useState<'tunai' | 'barcode'>('tunai');
    const [cashPaid, setCashPaid] = useState('');
    const [processing, setProcessing] = useState(false);
    const [pendingPayment, setPendingPayment] = useState<PendingPayment | null>(null);
    const [receiptSale, setReceiptSale] = useState<ReceiptSale | null>(null);
    const [search, setSearch] = useState('');

    const totalAmount = useMemo(
        () => cart.reduce((sum, item) => sum + Math.round(item.quantity * item.price), 0),
        [cart],
    );

    const cashPaidAmount = useMemo(() => parseCashAmount(cashPaid), [cashPaid]);

    const changeAmount = useMemo(
        () => (paymentMethod === 'tunai' ? Math.max(0, cashPaidAmount - totalAmount) : 0),
        [cashPaidAmount, paymentMethod, totalAmount],
    );

    const cashInsufficient = paymentMethod === 'tunai' && cashPaidAmount > 0 && cashPaidAmount < totalAmount;

    useEffect(() => {
        if (paymentMethod !== 'tunai') {
            setCashPaid('');
        }
    }, [paymentMethod]);

    const filteredProducts = useMemo(() => {
        const term = search.trim().toLowerCase();
        if (!term) return products;
        return products.filter(
            (product) =>
                product.name.toLowerCase().includes(term) ||
                product.barcode.toLowerCase().includes(term),
        );
    }, [products, search]);

    const addProductToCart = (product: Product, qty = 1) => {
        if (product.stock <= 0) {
            toast.error('Stok produk habis.');
            return;
        }

        setCart((current) => {
            const existing = current.find((item) => item.product_id === product.id);
            if (existing) {
                const nextQty = existing.quantity + qty;
                if (nextQty > product.stock) {
                    toast.error('Jumlah melebihi stok tersedia.');
                    return current;
                }
                return current.map((item) =>
                    item.product_id === product.id ? { ...item, quantity: nextQty } : item,
                );
            }

            if (qty > product.stock) {
                toast.error('Jumlah melebihi stok tersedia.');
                return current;
            }

            return [
                ...current,
                {
                    product_id: product.id,
                    barcode: product.barcode,
                    item_name: product.name,
                    unit: product.unit,
                    price: product.sell_price,
                    quantity: qty,
                    stock: product.stock,
                },
            ];
        });
    };

    const lookupAndAdd = async (barcode: string) => {
        try {
            const response = await fetch(route('products.lookup', encodeURIComponent(barcode)), {
                headers: { Accept: 'application/json' },
            });

            if (!response.ok) {
                toast.error(`Produk tidak ditemukan untuk barcode: ${barcode}`);
                return;
            }

            const product: Product = await response.json();
            addProductToCart(product);
            toast.success(`${product.name} ditambahkan ke keranjang.`);
        } catch {
            toast.error('Gagal mencari produk.');
        }
    };

    const updateQuantity = (productId: number, delta: number) => {
        setCart((current) =>
            current
                .map((item) => {
                    if (item.product_id !== productId) return item;
                    const nextQty = Math.max(0.01, Math.round((item.quantity + delta) * 100) / 100);
                    if (nextQty > item.stock) {
                        toast.error('Jumlah melebihi stok tersedia.');
                        return item;
                    }
                    return { ...item, quantity: nextQty };
                })
                .filter((item) => item.quantity > 0),
        );
    };

    const removeItem = (productId: number) => {
        setCart((current) => current.filter((item) => item.product_id !== productId));
    };

    const resetCart = () => {
        setCart([]);
        setCashPaid('');
        setPaymentMethod('tunai');
    };

    const checkout = async () => {
        if (cart.length === 0) {
            toast.error('Keranjang masih kosong.');
            return;
        }

        if (paymentMethod === 'tunai' && cashPaidAmount < totalAmount) {
            toast.error('Uang bayar kurang dari jumlah total.');
            return;
        }

        setProcessing(true);

        try {
            const response = await fetch(route('sales.store'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-CSRF-TOKEN': csrfToken(),
                },
                body: JSON.stringify({
                    notes: null,
                    payment_method: paymentMethod,
                    items: cart.map((item) => ({
                        product_id: item.product_id,
                        barcode: item.barcode,
                        item_name: item.item_name,
                        unit: item.unit,
                        price: item.price,
                        quantity: item.quantity,
                    })),
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                const message =
                    data.message ??
                    Object.values(data.errors ?? {})
                        .flat()
                        .join(', ') ??
                    'Gagal menyimpan penjualan.';
                toast.error(message);
                return;
            }

            toast.success('Penjualan berhasil disimpan.');

            if (paymentMethod === 'barcode' && data.sale?.id) {
                setPendingPayment({
                    sale: data.sale,
                    paymentQrPayload: data.payment_qr_payload,
                    paymentQrError: data.payment_qr_error,
                    paymentInfo: data.payment_info ?? paymentInfo,
                });
            } else if (data.sale?.id) {
                setReceiptSale({
                    ...data.sale,
                    cash_paid_amount: paymentMethod === 'tunai' ? cashPaidAmount : null,
                    change_amount: paymentMethod === 'tunai' ? changeAmount : null,
                });
                resetCart();
            } else {
                resetCart();
            }
        } catch {
            toast.error('Gagal menyimpan penjualan.');
        } finally {
            setProcessing(false);
        }
    };

    return (
        <AppLayout title="Kasir POS">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h2 className="text-2xl font-black">Point of Sale</h2>
                    <p className="text-sm text-slate-500">Scan barcode barang dan proses pembayaran</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Link href={route('sales.scanner-setup')} className="btn-muted">
                        <Wrench className="h-4 w-4" /> Setup Scanner
                    </Link>
                    <Link href={route('sales.scanner-test')} className="btn-muted">
                        <Keyboard className="h-4 w-4" /> Tes Scanner
                    </Link>
                    {isAdmin && (
                        <Link href={route('products.index')} className="btn-muted">
                            <Settings2 className="h-4 w-4" /> Kelola Produk
                        </Link>
                    )}
                    <Link href={route('sales.index')} className="btn-muted">
                        <Package className="h-4 w-4" /> Riwayat
                    </Link>
                </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
                <div className="space-y-4">
                    <div className="glass-card p-4 sm:p-5">
                        <BarcodeScanner
                            label="Scan Barcode Barang"
                            onScan={lookupAndAdd}
                            disabled={processing}
                        />
                        <div className="mt-4">
                            <input
                                className="input"
                                placeholder="Cari produk atau barcode..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="glass-card p-4 sm:p-5">
                        <h3 className="mb-3 text-sm font-bold text-slate-500">Daftar Produk</h3>
                        <div className="grid max-h-[28rem] gap-3 overflow-y-auto sm:grid-cols-2">
                            {filteredProducts.length === 0 ? (
                                <p className="col-span-full py-8 text-center text-sm text-slate-400">
                                    Belum ada produk. {isAdmin ? 'Tambahkan produk dengan barcode di Kelola Produk.' : 'Hubungi admin untuk menambahkan produk.'}
                                </p>
                            ) : (
                                filteredProducts.map((product) => (
                                    <button
                                        key={product.id}
                                        type="button"
                                        onClick={() => addProductToCart(product)}
                                        disabled={processing || product.stock <= 0}
                                        className="rounded-2xl border border-slate-100 p-4 text-left transition hover:border-indigo-200 hover:bg-indigo-50/50 disabled:opacity-50 dark:border-slate-800 dark:hover:border-indigo-800 dark:hover:bg-indigo-950/20"
                                    >
                                        <div className="font-bold">{product.name}</div>
                                        <div className="mt-1 font-mono text-xs text-slate-500">{product.barcode}</div>
                                        <div className="mt-2 flex items-center justify-between gap-2">
                                            <span className="font-black tabular-nums text-indigo-600 dark:text-indigo-300">
                                                {rupiah(product.sell_price)}
                                            </span>
                                            <span className="text-xs text-slate-500">
                                                Stok: {formatQuantity(product.stock, product.unit)}
                                            </span>
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                <div className="glass-card flex min-h-[32rem] flex-col p-4 sm:p-5">
                    <div className="mb-4 flex items-center gap-2">
                        <ShoppingCart className="h-5 w-5 text-indigo-500" />
                        <h3 className="text-lg font-black">Keranjang</h3>
                        <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                            {cart.length}
                        </span>
                    </div>

                    <div className="min-h-0 flex-1 overflow-y-auto">
                        {cart.length === 0 ? (
                            <div className="flex h-full flex-col items-center justify-center gap-2 text-slate-400">
                                <ScanLinePlaceholder />
                                <p className="text-sm">Scan barcode barang untuk memulai</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {cart.map((item) => (
                                    <div
                                        key={item.product_id}
                                        className="rounded-2xl border border-slate-100 p-3 dark:border-slate-800"
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0">
                                                <div className="truncate font-bold">{item.item_name}</div>
                                                <div className="font-mono text-xs text-slate-500">{item.barcode}</div>
                                                <div className="mt-1 text-sm tabular-nums text-slate-500">
                                                    {rupiah(item.price)} / {item.unit}
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => removeItem(item.product_id)}
                                                className="btn-muted !p-2 text-rose-600"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                        <div className="mt-3 flex items-center justify-between gap-3">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => updateQuantity(item.product_id, -1)}
                                                    className="btn-muted !p-2"
                                                >
                                                    <Minus className="h-4 w-4" />
                                                </button>
                                                <span className="min-w-[3rem] text-center font-bold tabular-nums">
                                                    {formatQuantity(item.quantity, item.unit)}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => updateQuantity(item.product_id, 1)}
                                                    className="btn-muted !p-2"
                                                >
                                                    <Plus className="h-4 w-4" />
                                                </button>
                                            </div>
                                            <span className="font-black tabular-nums">
                                                {rupiah(Math.round(item.quantity * item.price))}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="mt-4 space-y-3 border-t border-slate-100 pt-4 dark:border-slate-800">
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={() => setPaymentMethod('tunai')}
                                className={`flex items-center justify-center gap-2 rounded-2xl px-3 py-3 text-sm font-bold transition ${
                                    paymentMethod === 'tunai'
                                        ? 'bg-emerald-600 text-white'
                                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                                }`}
                            >
                                <Wallet className="h-4 w-4" /> Tunai
                            </button>
                            <button
                                type="button"
                                onClick={() => setPaymentMethod('barcode')}
                                disabled={!paymentConfigured}
                                title={!paymentConfigured ? 'Atur QRIS di Pengaturan > Pembayaran' : undefined}
                                className={`flex items-center justify-center gap-2 rounded-2xl px-3 py-3 text-sm font-bold transition disabled:opacity-50 ${
                                    paymentMethod === 'barcode'
                                        ? 'bg-indigo-600 text-white'
                                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                                }`}
                            >
                                <CreditCard className="h-4 w-4" /> QRIS
                            </button>
                        </div>
                        {isAdmin && !paymentConfigured && (
                            <p className="text-xs text-amber-600">
                                Atur QRIS di{' '}
                                <a href={route('admin.settings.index', { tab: 'payment' })} className="font-bold underline">
                                    Pengaturan → Pembayaran
                                </a>
                            </p>
                        )}

                        <div className="space-y-2 rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-800/50">
                            <div className="flex items-center justify-between">
                                <span className="font-bold text-slate-500">Jumlah Total</span>
                                <span className="text-2xl font-black tabular-nums">{rupiah(totalAmount)}</span>
                            </div>

                            {paymentMethod === 'tunai' && (
                                <>
                                    <label className="block space-y-1">
                                        <span className="text-xs font-semibold text-slate-500">Uang Bayar</span>
                                        <input
                                            className="input"
                                            type="text"
                                            inputMode="numeric"
                                            placeholder="Masukkan nominal uang"
                                            value={cashPaid ? rupiah(cashPaidAmount) : ''}
                                            onChange={(e) => setCashPaid(e.target.value.replace(/\D/g, ''))}
                                            disabled={processing || cart.length === 0}
                                        />
                                    </label>
                                    <div className="flex items-center justify-between border-t border-slate-200 pt-2 dark:border-slate-700">
                                        <span className="font-bold text-slate-500">Kembali</span>
                                        <span
                                            className={`text-xl font-black tabular-nums ${
                                                cashInsufficient ? 'text-rose-600' : 'text-emerald-600'
                                            }`}
                                        >
                                            {rupiah(changeAmount)}
                                        </span>
                                    </div>
                                    {cashInsufficient && (
                                        <p className="text-xs text-rose-600">Uang bayar masih kurang.</p>
                                    )}
                                </>
                            )}
                        </div>

                        <button
                            type="button"
                            onClick={checkout}
                            disabled={
                                processing ||
                                cart.length === 0 ||
                                (paymentMethod === 'tunai' && cashPaidAmount < totalAmount)
                            }
                            className="btn-primary w-full !py-4 text-base"
                        >
                            {processing ? 'Memproses...' : paymentMethod === 'tunai' ? 'Bayar Tunai' : 'Bayar via QRIS'}
                        </button>
                    </div>
                </div>
            </div>

            {pendingPayment && (
                <PaymentQrDialog
                    saleId={pendingPayment.sale.id}
                    saleCode={pendingPayment.sale.code}
                    paymentQrPayload={pendingPayment.paymentQrPayload}
                    paymentQrError={pendingPayment.paymentQrError}
                    amount={pendingPayment.sale.total_amount}
                    paymentInfo={pendingPayment.paymentInfo}
                    onClose={() => {
                        setPendingPayment(null);
                        resetCart();
                    }}
                    onConfirmed={() => {
                        setReceiptSale({
                            ...pendingPayment.sale,
                            payment_status: 'lunas',
                            paid_at: new Date().toISOString(),
                        });
                        setPendingPayment(null);
                        resetCart();
                    }}
                />
            )}

            {receiptSale && (
                <SaleReceiptDialog
                    sale={receiptSale}
                    onClose={() => setReceiptSale(null)}
                />
            )}
        </AppLayout>
    );
}

function ScanLinePlaceholder() {
    return (
        <svg className="h-12 w-12 opacity-30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2" />
            <path d="M7 12h10" />
        </svg>
    );
}
