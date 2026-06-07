import InputError from '@/Components/InputError';
import ImageInput from '@/Components/ImageInput';
import AppLayout from '@/Layouts/AppLayout';
import { dateTime } from '@/lib/format';
import { useForm, usePage } from '@inertiajs/react';
import { Save } from 'lucide-react';
import { FormEvent, useMemo } from 'react';
import { toast } from 'sonner';
import { PageProps } from '@/types';

const fieldLabels: Record<string, string> = {
    type: 'Jenis',
    expense_target: 'Jenis pengeluaran',
    amount: 'Nominal',
    description: 'Keterangan',
    party_name: 'Pihak',
    item_name: 'Barang',
    ui_status: 'Status',
    evidence: 'Gambar',
};

export default function TransactionForm({ transaction }: any) {
    const { auth } = usePage<PageProps>().props;
    const isEdit = Boolean(transaction);
    const { data, setData, post, processing, errors } = useForm<any>({
        type: transaction?.type ?? 'pemasukan',
        expense_target: 'toko',
        party_name: '',
        item_name: '',
        amount: transaction?.amount != null ? String(transaction.amount) : '',
        description: transaction?.description ?? '',
        ui_status: transaction?.ui_status ?? 'selesai',
        evidence: null,
        _method: isEdit ? 'put' : undefined,
    });

    const isExpense = data.type === 'pengeluaran';
    const isIncome = data.type === 'pemasukan';
    const isDebtExpense = !isEdit && isExpense && data.expense_target === 'utang';

    const occurredAtDisplay = useMemo(
        () => (isEdit ? dateTime(transaction.occurred_at) : dateTime(new Date().toISOString())),
        [isEdit, transaction?.occurred_at],
    );

    const preparePayload = (payload: typeof data) => {
        const next = { ...payload };
        const isDebt =
            !isEdit && next.type === 'pengeluaran' && next.expense_target === 'utang';

        if (isDebt) {
            next.party_name = String(next.party_name ?? '').trim();
            next.item_name = String(next.item_name ?? '').trim();
            next.description = String(next.description ?? '').trim();
        } else {
            delete next.party_name;
            delete next.item_name;
            next.description = String(next.description ?? '').trim();
        }

        if (!next.evidence) {
            delete next.evidence;
        }

        const amountDigits = String(next.amount ?? '').replace(/\D/g, '');
        next.amount = amountDigits;

        if (next.type === 'pemasukan') {
            next.ui_status = 'selesai';
        }

        return next;
    };

    const submitOptions = (payload: typeof data) => ({
        forceFormData: payload.evidence instanceof File,
        preserveScroll: true,
        transform: (formData: typeof data) => preparePayload(formData),
        onError: (validationErrors: Record<string, string>) => {
            const [field, message] = Object.entries(validationErrors)[0] ?? [];
            const label = field ? fieldLabels[field] ?? field : 'Form';
            toast.error(message ?? `Periksa field ${label}.`);
            if (field) {
                document.getElementById(`field-${field}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },
    });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        const options = submitOptions(data);
        if (isEdit) post(route('transactions.update', transaction.id), options);
        else post(route('transactions.store'), options);
    };

    return (
        <AppLayout title={isEdit ? 'Edit Transaksi' : 'Tambah Transaksi'}>
            <form onSubmit={submit} noValidate className="glass-card mx-auto max-w-3xl space-y-5 p-6">
                <div className="grid gap-4 md:grid-cols-2">
                    <label><span className="mb-2 block text-sm font-bold">Nama Kasir</span><input className="input" disabled value={auth.user.name} /></label>
                    <label>
                        <span className="mb-2 block text-sm font-bold">Tanggal</span>
                        <input className="input" disabled value={occurredAtDisplay} />
                    </label>
                </div>
                <label id="field-type">
                    <span className="mb-2 block text-sm font-bold">Jenis</span>
                    <select
                        name="type"
                        className="input"
                        value={data.type}
                        onChange={(e) => {
                            const type = e.target.value;
                            if (type === 'pemasukan') {
                                setData({ type, ui_status: 'selesai' });
                            } else {
                                setData('type', type);
                            }
                        }}
                    >
                        <option value="pemasukan">Pemasukan</option>
                        <option value="pengeluaran">Pengeluaran</option>
                    </select>
                    <InputError message={errors.type} />
                </label>
                {!isEdit && isExpense && (
                    <label id="field-expense_target">
                        <span className="mb-2 block text-sm font-bold">Jenis Pengeluaran</span>
                        <select
                            name="expense_target"
                            className="input"
                            value={data.expense_target}
                            onChange={(e) => {
                            const target = e.target.value;
                            setData('expense_target', target);
                            if (target !== 'utang') {
                                setData('party_name', '');
                                setData('item_name', '');
                            }
                        }}
                        >
                            <option value="toko">Pengeluaran untuk toko</option>
                            <option value="utang">Pengeluaran bukan untuk toko (Utang)</option>
                        </select>
                        <InputError message={errors.expense_target} />
                    </label>
                )}
                {isIncome ? (
                    <label id="field-ui_status">
                        <span className="mb-2 block text-sm font-bold">Status</span>
                        <input className="input" disabled value="Selesai" />
                    </label>
                ) : (
                    <label id="field-ui_status">
                        <span className="mb-2 block text-sm font-bold">Status</span>
                        <select
                            name="ui_status"
                            className="input"
                            value={data.ui_status}
                            onChange={(e) => setData('ui_status', e.target.value)}
                        >
                            <option value="belum_selesai">Belum</option>
                            <option value="selesai">Selesai</option>
                        </select>
                        <InputError message={errors.ui_status} />
                    </label>
                )}
                <label id="field-amount">
                    <span className="mb-2 block text-sm font-bold">Nominal (Rp)</span>
                    <input
                        name="amount"
                        className="input"
                        type="text"
                        inputMode="numeric"
                        autoComplete="off"
                        placeholder="Contoh: 100000"
                        value={data.amount}
                        onChange={(e) => setData('amount', e.target.value.replace(/\D/g, ''))}
                    />
                    <InputError message={errors.amount} />
                </label>
                {isDebtExpense && (
                    <>
                        <label id="field-party_name">
                            <span className="mb-2 block text-sm font-bold">Pihak</span>
                            <input
                                name="party_name"
                                className="input"
                                value={data.party_name}
                                onChange={(e) => setData('party_name', e.target.value)}
                            />
                            <InputError message={errors.party_name} />
                        </label>
                        <label id="field-item_name">
                            <span className="mb-2 block text-sm font-bold">Barang</span>
                            <textarea
                                name="item_name"
                                className="input min-h-32 resize-y"
                                value={data.item_name}
                                onChange={(e) => setData('item_name', e.target.value)}
                            />
                            <InputError message={errors.item_name} />
                        </label>
                    </>
                )}
                {!isDebtExpense && (
                    <label id="field-description">
                        <span className="mb-2 block text-sm font-bold">Keterangan</span>
                        <textarea
                            name="description"
                            className="input min-h-32"
                            value={data.description}
                            onChange={(e) => setData('description', e.target.value)}
                        />
                        <InputError message={errors.description} />
                    </label>
                )}
                <label id="field-evidence">
                    <span className="mb-2 block text-sm font-bold">Gambar</span>
                    <ImageInput
                        accept="image/png,image/jpeg"
                        onChange={(file) => setData('evidence', file)}
                        error={errors.evidence}
                        facingMode="environment"
                    />
                </label>
                <button type="submit" disabled={processing} className="btn-primary">
                    <Save className="h-4 w-4" /> {processing ? 'Menyimpan...' : 'Simpan'}
                </button>
            </form>
        </AppLayout>
    );
}
