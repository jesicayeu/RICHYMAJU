import InputError from '@/Components/InputError';
import AppLayout from '@/Layouts/AppLayout';
import { dateTime } from '@/lib/format';
import { useForm, usePage } from '@inertiajs/react';
import { Save } from 'lucide-react';
import { FormEvent, useMemo } from 'react';
import { PageProps } from '@/types';

export default function DebtForm({ debt }: { debt: any }) {
    const { auth } = usePage<PageProps>().props;
    const { data, setData, post, processing, errors } = useForm<any>({
        party_name: debt.party_name ?? '',
        party_type: debt.party_type ?? 'orang_ke_kita',
        item_name: debt.item_name ?? '',
        amount: debt.amount ?? '',
        status: debt.status ?? 'belum_selesai',
        evidence: null,
        _method: 'put',
    });

    const occurredAtDisplay = useMemo(() => dateTime(debt.occurred_at), [debt.occurred_at]);

    const submit = (e: FormEvent) => {
        e.preventDefault();
        post(route('debts.update', debt.id), { forceFormData: true });
    };

    return (
        <AppLayout title="Edit Utang">
            <form onSubmit={submit} className="glass-card mx-auto max-w-3xl space-y-5 p-6">
                <div className="grid gap-4 md:grid-cols-2">
                    <label>
                        <span className="mb-2 block text-sm font-bold">Pencatat</span>
                        <input className="input" disabled value={auth.user.name} />
                    </label>
                    <label>
                        <span className="mb-2 block text-sm font-bold">Tanggal</span>
                        <input className="input" disabled value={occurredAtDisplay} />
                    </label>
                </div>
                <label><span className="mb-2 block text-sm font-bold">Pihak</span><input className="input" value={data.party_name} onChange={(e) => setData('party_name', e.target.value)} /><InputError message={errors.party_name} /></label>
                <label><span className="mb-2 block text-sm font-bold">Barang</span><input className="input" value={data.item_name} onChange={(e) => setData('item_name', e.target.value)} /><InputError message={errors.item_name} /></label>
                <label><span className="mb-2 block text-sm font-bold">Nominal (Rp)</span><input className="input" type="number" min="1" value={data.amount} onChange={(e) => setData('amount', e.target.value)} /><InputError message={errors.amount} /></label>
                <label><span className="mb-2 block text-sm font-bold">Status</span><select className="input" value={data.status} onChange={(e) => setData('status', e.target.value)}><option value="belum_selesai">Belum</option><option value="sudah_selesai">Selesai</option></select><InputError message={errors.status} /></label>
                <label><span className="mb-2 block text-sm font-bold">Gambar</span><input className="input" type="file" accept="image/png,image/jpeg" onChange={(e) => setData('evidence', e.target.files?.[0])} /><InputError message={errors.evidence} /></label>
                <button disabled={processing} className="btn-primary"><Save className="h-4 w-4" /> Simpan</button>
            </form>
        </AppLayout>
    );
}
