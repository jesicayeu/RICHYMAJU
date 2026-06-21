import InputError from '@/Components/InputError';
import AppLayout from '@/Layouts/AppLayout';
import { dateTime, formatQuantity } from '@/lib/format';
import { useForm, usePage } from '@inertiajs/react';
import { Save } from 'lucide-react';
import { FormEvent, useEffect, useMemo } from 'react';
import { PageProps } from '@/types';

type ProductOption = {
    id: number;
    name: string;
    unit: string;
};

function normalizeQuantityValue(value: string): string {
    const trimmed = value.trim();
    if (!trimmed) {
        return '';
    }

    if (trimmed.includes(',')) {
        return trimmed.replace(/\./g, '').replace(',', '.');
    }

    const parts = trimmed.split('.');
    if (parts.length > 2) {
        const decimal = parts.pop() ?? '';
        return `${parts.join('')}.${decimal}`;
    }

    return trimmed;
}

export default function StockForm({
    movement,
    defaultType,
    defaultProductId,
    products = [],
    productStocks = {},
}: {
    movement?: any;
    defaultType?: string;
    defaultProductId?: string | number | null;
    products?: ProductOption[];
    productStocks?: Record<string, number>;
}) {
    const { auth } = usePage<PageProps>().props;
    const isEdit = Boolean(movement);
    const initialProductId = movement?.product_id ?? defaultProductId ?? '';

    const { data, setData, post, processing, errors } = useForm({
        product_id: initialProductId ? String(initialProductId) : '',
        item_name: movement?.item_name ?? '',
        type: movement?.type ?? defaultType ?? 'masuk',
        quantity: movement?.quantity != null ? String(movement.quantity) : '',
        unit: movement?.unit ?? 'kg',
        status: movement?.status ?? 'diproses',
        notes: movement?.notes ?? '',
        _method: isEdit ? 'put' : undefined,
    });

    const isLinkedProduct = data.product_id !== '';
    const selectedProduct = useMemo(
        () => products.find((product) => String(product.id) === data.product_id),
        [products, data.product_id],
    );

    useEffect(() => {
        if (!selectedProduct) {
            return;
        }

        setData((current) => ({
            ...current,
            item_name: selectedProduct.name,
            unit: selectedProduct.unit,
        }));
    }, [selectedProduct?.id]);

    const occurredAtDisplay = useMemo(
        () => (isEdit ? dateTime(movement.occurred_at) : dateTime(new Date().toISOString())),
        [isEdit, movement?.occurred_at],
    );

    const selectedStock = data.product_id ? productStocks[data.product_id] ?? 0 : null;

    const submitOptions = {
        preserveScroll: true,
        transform: (formData: typeof data) => ({
            ...formData,
            product_id: formData.product_id ? Number(formData.product_id) : null,
            quantity: normalizeQuantityValue(String(formData.quantity ?? '')),
        }),
    };

    const submit = (e: FormEvent) => {
        e.preventDefault();
        if (isEdit) post(route('stocks.update', movement.id), submitOptions);
        else post(route('stocks.store'), submitOptions);
    };

    return (
        <AppLayout title={isEdit ? 'Edit Stok' : 'Tambah Stok'}>
            <form onSubmit={submit} className="glass-card mx-auto max-w-3xl space-y-5 p-6">
                <div className="grid gap-4 md:grid-cols-2">
                    <label>
                        <span className="mb-2 block text-sm font-bold">Pencatat</span>
                        <input className="input" disabled value={auth.user.display_name || auth.user.name} />
                    </label>
                    <label>
                        <span className="mb-2 block text-sm font-bold">Tanggal</span>
                        <input className="input" disabled value={occurredAtDisplay} />
                    </label>
                </div>

                <label>
                    <span className="mb-2 block text-sm font-bold">Produk Penjualan</span>
                    <select
                        className="input"
                        value={data.product_id}
                        required={!isEdit}
                        onChange={(e) => {
                            const value = e.target.value;
                            setData((current) => ({
                                ...current,
                                product_id: value,
                                item_name: value
                                    ? products.find((product) => String(product.id) === value)?.name ?? current.item_name
                                    : current.item_name,
                                unit: value
                                    ? products.find((product) => String(product.id) === value)?.unit ?? current.unit
                                    : current.unit,
                            }));
                        }}
                    >
                        {!isEdit ? (
                            <option value="">Pilih produk dari Kelola Produk</option>
                        ) : (
                            <option value="">Barang lain (input manual)</option>
                        )}
                        {products.map((product) => (
                            <option key={product.id} value={product.id}>
                                {product.name} ({product.unit}) — Stok:{' '}
                                {formatQuantity(productStocks[String(product.id)] ?? 0, product.unit)}
                            </option>
                        ))}
                    </select>
                    {selectedStock != null && (
                        <p className="mt-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                            Stok saat ini:{' '}
                            <span className={selectedStock <= 0 ? 'text-rose-600' : 'text-emerald-600'}>
                                {formatQuantity(selectedStock, selectedProduct?.unit)}
                            </span>
                            {data.type === 'keluar' && (
                                <span className="ml-2 text-xs font-normal text-slate-500">
                                    (akan berkurang setelah disimpan)
                                </span>
                            )}
                            {data.type === 'masuk' && (
                                <span className="ml-2 text-xs font-normal text-slate-500">
                                    (akan bertambah setelah disimpan)
                                </span>
                            )}
                        </p>
                    )}
                    <p className="mt-1 text-xs text-slate-500">
                        {isEdit
                            ? 'Stok terhubung ke produk agar jumlah stok di kasir POS ikut terupdate.'
                            : 'Wajib pilih produk yang sudah didaftarkan di Kelola Produk.'}
                    </p>
                    <InputError message={errors.product_id} />
                </label>

                <label>
                    <span className="mb-2 block text-sm font-bold">Nama Barang</span>
                    <input
                        className="input"
                        value={data.item_name}
                        onChange={(e) => setData('item_name', e.target.value)}
                        disabled={isLinkedProduct}
                    />
                    <InputError message={errors.item_name} />
                </label>
                <div className="grid gap-4 md:grid-cols-2">
                    <label>
                        <span className="mb-2 block text-sm font-bold">Jenis</span>
                        <select className="input" value={data.type} onChange={(e) => setData('type', e.target.value)}>
                            <option value="masuk">Masuk</option>
                            <option value="keluar">Keluar</option>
                        </select>
                        <InputError message={errors.type} />
                    </label>
                    <label>
                        <span className="mb-2 block text-sm font-bold">Status</span>
                        <select className="input" value={data.status} onChange={(e) => setData('status', e.target.value)}>
                            <option value="diproses">Diproses</option>
                            <option value="selesai">Selesai</option>
                        </select>
                        <InputError message={errors.status} />
                    </label>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                    <label>
                        <span className="mb-2 block text-sm font-bold">Jumlah</span>
                        <input
                            className="input"
                            type="text"
                            inputMode="decimal"
                            autoComplete="off"
                            placeholder="Contoh: 10 atau 10,5"
                            value={data.quantity}
                            onChange={(e) => setData('quantity', e.target.value.replace(/[^\d.,]/g, ''))}
                        />
                        <InputError message={errors.quantity} />
                    </label>
                    <label>
                        <span className="mb-2 block text-sm font-bold">Satuan</span>
                        <input
                            className="input"
                            value={data.unit}
                            onChange={(e) => setData('unit', e.target.value)}
                            placeholder="kg, liter, butir"
                            disabled={isLinkedProduct}
                        />
                        <InputError message={errors.unit} />
                    </label>
                </div>
                <label>
                    <span className="mb-2 block text-sm font-bold">Catatan</span>
                    <textarea className="input min-h-24" value={data.notes} onChange={(e) => setData('notes', e.target.value)} />
                    <InputError message={errors.notes} />
                </label>
                <button disabled={processing} className="btn-primary">
                    <Save className="h-4 w-4" /> Simpan
                </button>
            </form>
        </AppLayout>
    );
}
