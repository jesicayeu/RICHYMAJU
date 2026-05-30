import InputError from '@/Components/InputError';
import AppLayout from '@/Layouts/AppLayout';
import { dateTime } from '@/lib/format';
import { useForm, usePage } from '@inertiajs/react';
import { Save } from 'lucide-react';
import { FormEvent, useMemo } from 'react';
import { PageProps } from '@/types';

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

export default function StockForm({ movement, defaultType }: { movement?: any; defaultType?: string }) {
    const { auth } = usePage<PageProps>().props;
    const isEdit = Boolean(movement);
    const { data, setData, post, processing, errors } = useForm({
        item_name: movement?.item_name ?? '',
        type: movement?.type ?? defaultType ?? 'masuk',
        quantity: movement?.quantity != null ? String(movement.quantity) : '',
        unit: movement?.unit ?? 'kg',
        status: movement?.status ?? 'diproses',
        notes: movement?.notes ?? '',
        _method: isEdit ? 'put' : undefined,
    });

    const occurredAtDisplay = useMemo(
        () => (isEdit ? dateTime(movement.occurred_at) : dateTime(new Date().toISOString())),
        [isEdit, movement?.occurred_at],
    );

    const submitOptions = {
        preserveScroll: true,
        transform: (formData: typeof data) => ({
            ...formData,
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
                    <span className="mb-2 block text-sm font-bold">Nama Barang</span>
                    <input className="input" value={data.item_name} onChange={(e) => setData('item_name', e.target.value)} />
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
                        <input className="input" value={data.unit} onChange={(e) => setData('unit', e.target.value)} placeholder="kg, liter, butir" />
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
