import InputError from '@/Components/InputError';
import AppLayout from '@/Layouts/AppLayout';
import { dateTime, formatQuantity, rupiah } from '@/lib/format';
import { useForm, usePage } from '@inertiajs/react';
import { Plus, Save, Trash2 } from 'lucide-react';
import { FormEvent, useMemo } from 'react';
import { PageProps } from '@/types';

type SaleItemRow = {
    item_name: string;
    quantity: string;
    unit: string;
    price: string;
};

const emptyItem = (): SaleItemRow => ({
    item_name: '',
    quantity: '',
    unit: 'kg',
    price: '',
});

function normalizeQuantityValue(value: string): string {
    const trimmed = value.trim();
    if (!trimmed) return '';

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

function parsePrice(value: string): number {
    const digits = value.replace(/\D/g, '');
    return digits ? Number(digits) : 0;
}

export default function SaleForm({ sale }: { sale?: any }) {
    const { auth } = usePage<PageProps>().props;
    const isEdit = Boolean(sale);

    const initialItems: SaleItemRow[] =
        sale?.items?.length > 0
            ? sale.items.map((item: any) => ({
                  item_name: item.item_name ?? '',
                  quantity: item.quantity != null ? String(item.quantity) : '',
                  unit: item.unit ?? 'kg',
                  price: item.price != null ? String(item.price) : '',
              }))
            : [emptyItem()];

    const { data, setData, post, processing, errors } = useForm({
        payment_status: sale?.payment_status ?? 'belum_lunas',
        notes: sale?.notes ?? '',
        items: initialItems,
        _method: isEdit ? 'put' : undefined,
    });

    const occurredAtDisplay = useMemo(
        () => (isEdit ? dateTime(sale.occurred_at) : dateTime(new Date().toISOString())),
        [isEdit, sale?.occurred_at],
    );

    const totalAmount = useMemo(
        () =>
            data.items.reduce((sum, item) => {
                const qty = parseFloat(normalizeQuantityValue(item.quantity)) || 0;
                const price = parsePrice(item.price);
                return sum + Math.round(qty * price);
            }, 0),
        [data.items],
    );

    const updateItem = (index: number, field: keyof SaleItemRow, value: string) => {
        const items = [...data.items];
        items[index] = { ...items[index], [field]: value };
        setData('items', items);
    };

    const addItem = () => setData('items', [...data.items, emptyItem()]);

    const removeItem = (index: number) => {
        if (data.items.length <= 1) return;
        setData(
            'items',
            data.items.filter((_, i) => i !== index),
        );
    };

    const submitOptions = {
        preserveScroll: true,
        transform: (formData: typeof data) => ({
            ...formData,
            items: formData.items.map((item) => ({
                item_name: item.item_name,
                quantity: normalizeQuantityValue(item.quantity),
                unit: item.unit,
                price: parsePrice(item.price),
            })),
        }),
    };

    const submit = (e: FormEvent) => {
        e.preventDefault();
        if (isEdit) post(route('sales.update', sale.id), submitOptions);
        else post(route('sales.store'), submitOptions);
    };

    const itemErrors = (index: number, field: string) =>
        (errors as Record<string, string>)[`items.${index}.${field}`];

    return (
        <AppLayout title={isEdit ? 'Edit Penjualan' : 'Tambah Penjualan'}>
            <form onSubmit={submit} className="glass-card mx-auto max-w-4xl space-y-5 p-6">
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
                    <span className="mb-2 block text-sm font-bold">Status Pembayaran</span>
                    <select
                        className="input"
                        value={data.payment_status}
                        onChange={(e) => setData('payment_status', e.target.value)}
                    >
                        <option value="belum_lunas">Belum Lunas</option>
                        <option value="lunas">Lunas</option>
                    </select>
                    <InputError message={errors.payment_status} />
                </label>

                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-bold">Daftar Barang</span>
                        <button type="button" onClick={addItem} className="btn-muted text-sm">
                            <Plus className="h-4 w-4" /> Tambah Baris
                        </button>
                    </div>
                    <InputError message={errors.items as string} />

                    {data.items.map((item, index) => (
                        <div
                            key={index}
                            className="grid gap-3 rounded-2xl border border-slate-100 p-4 dark:border-slate-800 md:grid-cols-[1fr_100px_80px_120px_auto]"
                        >
                            <label>
                                <span className="mb-1 block text-xs font-semibold text-slate-500">Nama Barang</span>
                                <input
                                    className="input"
                                    value={item.item_name}
                                    onChange={(e) => updateItem(index, 'item_name', e.target.value)}
                                />
                                <InputError message={itemErrors(index, 'item_name')} />
                            </label>
                            <label>
                                <span className="mb-1 block text-xs font-semibold text-slate-500">Jumlah</span>
                                <input
                                    className="input"
                                    type="text"
                                    inputMode="decimal"
                                    value={item.quantity}
                                    onChange={(e) =>
                                        updateItem(index, 'quantity', e.target.value.replace(/[^\d.,]/g, ''))
                                    }
                                />
                                <InputError message={itemErrors(index, 'quantity')} />
                            </label>
                            <label>
                                <span className="mb-1 block text-xs font-semibold text-slate-500">Satuan</span>
                                <input
                                    className="input"
                                    value={item.unit}
                                    onChange={(e) => updateItem(index, 'unit', e.target.value)}
                                />
                                <InputError message={itemErrors(index, 'unit')} />
                            </label>
                            <label>
                                <span className="mb-1 block text-xs font-semibold text-slate-500">Harga</span>
                                <input
                                    className="input"
                                    type="text"
                                    inputMode="numeric"
                                    placeholder="Rp"
                                    value={item.price ? rupiah(parsePrice(item.price)) : ''}
                                    onChange={(e) => updateItem(index, 'price', e.target.value.replace(/\D/g, ''))}
                                />
                                <InputError message={itemErrors(index, 'price')} />
                            </label>
                            <div className="flex items-end">
                                <button
                                    type="button"
                                    onClick={() => removeItem(index)}
                                    disabled={data.items.length <= 1}
                                    className="btn-muted !p-3 text-rose-600 disabled:opacity-40"
                                    title="Hapus baris"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-5 py-4 dark:bg-slate-800/50">
                    <span className="text-sm font-bold text-slate-500">Total Penjualan</span>
                    <span className="text-2xl font-black tabular-nums">{rupiah(totalAmount)}</span>
                </div>

                <label>
                    <span className="mb-2 block text-sm font-bold">Catatan</span>
                    <textarea className="input min-h-24" value={data.notes} onChange={(e) => setData('notes', e.target.value)} />
                    <InputError message={errors.notes} />
                </label>

                <button type="submit" disabled={processing} className="btn-primary w-full">
                    <Save className="h-4 w-4" /> {isEdit ? 'Simpan Perubahan' : 'Simpan Penjualan'}
                </button>
            </form>
        </AppLayout>
    );
}
