import BarcodeScanner, { type ScanAddResult } from '@/Components/BarcodeScanner';
import ProductSearchCombobox from '@/Components/ProductSearchCombobox';
import PaymentQrDialog from '@/Components/PaymentQrDialog';
import SaleReceiptDialog, { type ReceiptSale } from '@/Components/SaleReceiptDialog';
import AppLayout from '@/Layouts/AppLayout';
import { formatQuantity, rupiah } from '@/lib/format';
import type { PageProps } from '@/types';
import { useEcho } from '@laravel/echo-react';
import { usePage } from '@inertiajs/react';
import { CreditCard, Minus, Plus, ShoppingCart, Trash2, Wallet } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

const POS_CART_STORAGE_KEY = 'richymaju.pos.cart';
const SCAN_COOLDOWN_MS = 2000;

const pauseAfterSuccessScan = () =>
    new Promise<void>((resolve) => {
        window.setTimeout(resolve, SCAN_COOLDOWN_MS);
    });

type PosCartState = {
    cart: CartItem[];
    paymentMethod: 'tunai' | 'barcode';
    cashPaid: string;
    updatedAt?: string;
};

type PosCartBroadcastPayload = {
    client_id?: string | null;
    updated_at?: string;
    cart?: CartItem[];
    paymentMethod?: 'tunai' | 'barcode';
    cashPaid?: string;
};

function isCartItem(value: unknown): value is CartItem {
    if (!value || typeof value !== 'object') return false;
    const item = value as CartItem;
    return (
        typeof item.product_id === 'number' &&
        typeof item.barcode === 'string' &&
        typeof item.item_name === 'string' &&
        typeof item.unit === 'string' &&
        typeof item.price === 'number' &&
        typeof item.quantity === 'number' &&
        typeof item.stock === 'number'
    );
}

function hydrateCartItems(items: unknown, products: Product[]): CartItem[] {
    if (!Array.isArray(items)) return [];

    return items
        .filter(isCartItem)
        .map((item) => {
            const product = products.find((entry) => entry.id === item.product_id);
            if (!product || product.stock <= 0) return null;

            return {
                product_id: product.id,
                barcode: product.barcode,
                item_name: product.name,
                unit: product.unit,
                price: product.sell_price,
                stock: product.stock,
                quantity: Math.min(item.quantity, product.stock),
            } satisfies CartItem;
        })
        .filter((item): item is CartItem => item !== null && item.quantity > 0);
}

function loadLegacyPosState(products: Product[]): PosCartState | null {
    try {
        const raw = localStorage.getItem(POS_CART_STORAGE_KEY);
        if (!raw) return null;

        const parsed = JSON.parse(raw) as Partial<PosCartState> | CartItem[];
        const items = Array.isArray(parsed) ? parsed : parsed.cart;

        return {
            cart: hydrateCartItems(items, products),
            paymentMethod:
                !Array.isArray(parsed) && parsed.paymentMethod === 'barcode' ? 'barcode' : 'tunai',
            cashPaid: !Array.isArray(parsed) && typeof parsed.cashPaid === 'string' ? parsed.cashPaid : '',
        };
    } catch {
        return null;
    }
}

function clearLegacyPosState() {
    localStorage.removeItem(POS_CART_STORAGE_KEY);
}

function csrfToken(): string {
    return document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ?? '';
}

async function persistPosCart(state: PosCartState, clientId: string): Promise<string | null> {
    const response = await fetch(route('sales.pos.cart.save'), {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'X-CSRF-TOKEN': csrfToken(),
        },
        body: JSON.stringify({
            payment_method: state.paymentMethod,
            cash_paid: state.cashPaid,
            client_id: clientId,
            items: state.cart.map((item) => ({
                product_id: item.product_id,
                quantity: item.quantity,
            })),
        }),
    });

    if (!response.ok) return null;

    const data = (await response.json()) as PosCartState;
    return data.updatedAt ?? null;
}

async function clearPosCartRemote(clientId: string): Promise<void> {
    await fetch(route('sales.pos.cart.clear'), {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'X-CSRF-TOKEN': csrfToken(),
        },
        body: JSON.stringify({ client_id: clientId }),
    });
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
    posCart,
}: {
    products: Product[];
    isAdmin: boolean;
    paymentConfigured: boolean;
    paymentInfo: PendingPayment['paymentInfo'];
    posCart: PosCartState;
}) {
    const { auth } = usePage<PageProps>().props;
    const clientId = useRef(crypto.randomUUID());
    const skipPersistRef = useRef(false);
    const lastUpdatedAtRef = useRef(posCart.updatedAt ?? '');
    const [cart, setCart] = useState<CartItem[]>(posCart.cart);
    const [paymentMethod, setPaymentMethod] = useState<'tunai' | 'barcode'>(posCart.paymentMethod);
    const [cashPaid, setCashPaid] = useState(posCart.cashPaid);
    const [processing, setProcessing] = useState(false);
    const [pendingPayment, setPendingPayment] = useState<PendingPayment | null>(null);
    const [receiptSale, setReceiptSale] = useState<ReceiptSale | null>(null);
    const persistReady = useRef(false);
    const legacyMigrated = useRef(false);
    const cartRef = useRef(cart);
    const scanBusyRef = useRef(false);
    const [lastAddStatus, setLastAddStatus] = useState<ScanAddResult | null>(null);

    useEffect(() => {
        cartRef.current = cart;
    }, [cart]);

    const applyRemoteCart = useCallback((payload: PosCartBroadcastPayload) => {
        if (payload.client_id && payload.client_id === clientId.current) {
            return;
        }

        if (
            payload.updated_at &&
            lastUpdatedAtRef.current &&
            payload.updated_at <= lastUpdatedAtRef.current
        ) {
            return;
        }

        const nextCart = Array.isArray(payload.cart) ? payload.cart.filter(isCartItem) : [];

        skipPersistRef.current = true;
        setCart(nextCart);
        setPaymentMethod(payload.paymentMethod === 'barcode' ? 'barcode' : 'tunai');
        setCashPaid(typeof payload.cashPaid === 'string' ? payload.cashPaid : '');

        if (payload.updated_at) {
            lastUpdatedAtRef.current = payload.updated_at;
        }
    }, []);

    useEcho<PosCartBroadcastPayload>(
        `pos-cart.${auth.user.id}`,
        '.PosCartUpdated',
        applyRemoteCart,
        [auth.user.id, applyRemoteCart],
    );

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

    useEffect(() => {
        if (legacyMigrated.current) return;
        legacyMigrated.current = true;

        if (posCart.cart.length > 0 || posCart.cashPaid) return;

        const legacy = loadLegacyPosState(products);
        if (!legacy || (legacy.cart.length === 0 && !legacy.cashPaid)) {
            clearLegacyPosState();
            return;
        }

        setCart(legacy.cart);
        setPaymentMethod(legacy.paymentMethod);
        setCashPaid(legacy.cashPaid);
        clearLegacyPosState();
        void persistPosCart(legacy, clientId.current).then((updatedAt) => {
            if (updatedAt) lastUpdatedAtRef.current = updatedAt;
        });
    }, [posCart.cart.length, posCart.cashPaid, products]);

    useEffect(() => {
        if (!persistReady.current) {
            persistReady.current = true;
            return;
        }

        if (skipPersistRef.current) {
            skipPersistRef.current = false;
            return;
        }

        const timer = window.setTimeout(() => {
            void persistPosCart({ cart, paymentMethod, cashPaid }, clientId.current).then((updatedAt) => {
                if (updatedAt) lastUpdatedAtRef.current = updatedAt;
            });
        }, 500);

        return () => window.clearTimeout(timer);
    }, [cart, paymentMethod, cashPaid]);

    const tryAddProductToCart = (
        product: Product,
        qty = 1,
    ): { success: boolean; quantity: number | null; unit: string | null } => {
        const live = products.find((entry) => entry.id === product.id) ?? product;

        const current = cartRef.current;
        const existing = current.find((item) => item.product_id === live.id);
        const currentQty = existing?.quantity ?? 0;

        if (live.stock <= 0) {
            return { success: false, quantity: currentQty > 0 ? currentQty : null, unit: live.unit };
        }

        const nextQty = currentQty + qty;

        if (nextQty > live.stock) {
            return { success: false, quantity: currentQty > 0 ? currentQty : null, unit: live.unit };
        }

        const newCart = existing
            ? current.map((item) =>
                  item.product_id === live.id
                      ? { ...item, quantity: nextQty, stock: live.stock }
                      : item,
              )
            : [
                  ...current,
                  {
                      product_id: live.id,
                      barcode: live.barcode,
                      item_name: live.name,
                      unit: live.unit,
                      price: live.sell_price,
                      quantity: qty,
                      stock: live.stock,
                  },
              ];

        cartRef.current = newCart;
        setCart(newCart);
        return { success: true, quantity: nextQty, unit: live.unit };
    };

    const reportAddStatus = (result: ScanAddResult) => {
        setLastAddStatus(result);
    };

    const lookupAndAdd = async (barcode: string): Promise<ScanAddResult> => {
        const needle = barcode.trim();

        if (scanBusyRef.current) {
            return { success: false, barcode: needle, name: null, skipped: true };
        }

        scanBusyRef.current = true;

        try {
            const local = products.find((product) => product.barcode === needle);

            if (local) {
                const outcome = tryAddProductToCart(local);
                const result: ScanAddResult = {
                    success: outcome.success,
                    barcode: local.barcode,
                    name: local.name,
                    quantity: outcome.quantity,
                    unit: outcome.unit,
                };

                reportAddStatus(result);
                if (result.success) {
                    await pauseAfterSuccessScan();
                }
                return result;
            }

            const response = await fetch(route('products.lookup', encodeURIComponent(needle)), {
                headers: { Accept: 'application/json' },
            });

            if (!response.ok) {
                const result: ScanAddResult = {
                    success: false,
                    barcode: needle,
                    name: null,
                };
                reportAddStatus(result);
                return result;
            }

            const product: Product = await response.json();
            const outcome = tryAddProductToCart(product);
            const result: ScanAddResult = {
                success: outcome.success,
                barcode: product.barcode,
                name: product.name,
                quantity: outcome.quantity,
                unit: outcome.unit,
            };

            reportAddStatus(result);
            if (result.success) {
                await pauseAfterSuccessScan();
            }
            return result;
        } catch {
            const result: ScanAddResult = {
                success: false,
                barcode: needle,
                name: null,
            };
            reportAddStatus(result);
            return result;
        } finally {
            scanBusyRef.current = false;
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
        void clearPosCartRemote(clientId.current);
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
            <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
                <div className="space-y-4">
                    <div className="glass-card overflow-visible p-4 sm:p-5">
                        <BarcodeScanner
                            label="Scan Barcode Barang"
                            onScan={lookupAndAdd}
                            lastAddStatus={lastAddStatus}
                            disabled={processing}
                            retainFocus={false}
                            refocusAfterScan={false}
                            manualInput={
                                <ProductSearchCombobox
                                    products={products}
                                    disabled={processing}
                                    onBarcodeScan={lookupAndAdd}
                                    onSelect={async (product) => {
                                        if (scanBusyRef.current) return;

                                        scanBusyRef.current = true;
                                        try {
                                            const outcome = tryAddProductToCart(product);
                                            const result: ScanAddResult = {
                                                success: outcome.success,
                                                barcode: product.barcode,
                                                name: product.name,
                                                quantity: outcome.quantity,
                                                unit: outcome.unit,
                                            };
                                            reportAddStatus(result);
                                            if (result.success) {
                                                await pauseAfterSuccessScan();
                                            }
                                        } finally {
                                            scanBusyRef.current = false;
                                        }
                                    }}
                                />
                            }
                        />
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

                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    onClick={() => setPaymentMethod('tunai')}
                                    className={`flex items-center justify-center gap-2 rounded-2xl px-3 py-3 text-sm font-bold transition ${
                                        paymentMethod === 'tunai'
                                            ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25'
                                            : 'bg-white text-slate-600 dark:bg-slate-900 dark:text-slate-300'
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
                                            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                                            : 'bg-white text-slate-600 dark:bg-slate-900 dark:text-slate-300'
                                    }`}
                                >
                                    <CreditCard className="h-4 w-4" /> QRIS
                                </button>
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
                            className={`w-full rounded-2xl !py-4 text-base font-bold text-white transition disabled:pointer-events-none disabled:opacity-50 ${
                                paymentMethod === 'tunai'
                                    ? 'bg-emerald-400 shadow-lg shadow-emerald-400/40 hover:bg-emerald-300'
                                    : 'btn-primary shadow-lg shadow-indigo-500/30'
                            }`}
                        >
                            {processing ? 'Memproses...' : paymentMethod === 'tunai' ? 'Bayar Tunai' : 'Bayar via QRIS'}
                        </button>
                    </div>
                </div>
            </div>

            {pendingPayment && (
                <PaymentQrDialog
                    saleId={pendingPayment.sale.id}
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
