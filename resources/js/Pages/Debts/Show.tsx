import Badge from '@/Components/Badge';
import AppLayout from '@/Layouts/AppLayout';
import { useConfirmDelete } from '@/hooks/useConfirmDelete';
import { dateTime, humanDebtStatus, registeredUserName, rupiah, userDisplayName } from '@/lib/format';
import { Link, useForm } from '@inertiajs/react';
import { Edit, ShieldCheck, Trash2 } from 'lucide-react';

export default function DebtShow({ debt, isAdmin }: any) {
    const verify = useForm({ verification_status: 'disetujui', verification_note: '' });
    const { requestDelete, deleteModal } = useConfirmDelete({
        buildRoute: (id) => route('debts.destroy', id),
        title: 'Hapus Utang',
        message: () => 'Yakin hapus utang ini? Tindakan tidak dapat dibatalkan.',
    });

    return (
        <AppLayout title="Detail Utang">
            <div className="grid gap-6 xl:grid-cols-3">
                <div className="glass-card space-y-5 p-6 xl:col-span-2">
                    <div>
                        <h2 className="text-2xl font-black">Detail Utang</h2>
                        <p className="text-sm text-slate-500">
                            {dateTime(debt.occurred_at)} oleh {registeredUserName(debt.user)}
                        </p>
                    </div>

                    <div className="grid gap-4 md:grid-cols-3">
                        <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900">
                            <div className="text-sm text-slate-500">Verifikasi</div>
                            <Badge value={debt.verification_status} />
                        </div>
                        <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900">
                            <div className="text-sm text-slate-500">Nominal</div>
                            <div className="text-xl font-black">{rupiah(debt.amount)}</div>
                        </div>
                        <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900">
                            <div className="text-sm text-slate-500">Status</div>
                            <Badge value={debt.status} label={humanDebtStatus(debt.status)} />
                        </div>
                    </div>

                    {debt.verifier && (
                        <p className="text-sm text-slate-500">
                            Diverifikasi oleh {userDisplayName(debt.verifier)}
                            {debt.verified_at ? ` · ${dateTime(debt.verified_at)}` : ''}
                        </p>
                    )}

                    <div>
                        <h3 className="font-black">Informasi Utang</h3>
                        <dl className="mt-2 space-y-3 rounded-2xl border border-slate-100 p-4 dark:border-slate-800">
                            <div className="flex flex-wrap justify-between gap-2">
                                <dt className="text-sm text-slate-500">Pihak</dt>
                                <dd className="font-semibold">{debt.party_name}</dd>
                            </div>
                            <div className="flex flex-wrap justify-between gap-2">
                                <dt className="text-sm text-slate-500">Barang</dt>
                                <dd className="font-semibold">{debt.item_name}</dd>
                            </div>
                            <div className="flex flex-wrap justify-between gap-2">
                                <dt className="text-sm text-slate-500">Tanggal</dt>
                                <dd className="font-semibold">{dateTime(debt.occurred_at)}</dd>
                            </div>
                        </dl>
                    </div>

                    {debt.evidence_url && (
                        <a href={debt.evidence_url} target="_blank" className="btn-muted">
                            Lihat Bukti
                        </a>
                    )}

                    <div className="flex flex-wrap gap-2">
                        <Link href={route('debts.edit', debt.id)} className="btn-muted">
                            <Edit className="h-4 w-4" /> Edit
                        </Link>
                        {isAdmin && (
                            <button
                                type="button"
                                onClick={() => requestDelete({ id: debt.id })}
                                className="btn-muted text-rose-600"
                            >
                                <Trash2 className="h-4 w-4" /> Hapus
                            </button>
                        )}
                    </div>
                </div>

                <div className="space-y-6">
                    {isAdmin && (
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                verify.post(route('debts.verify', debt.id));
                            }}
                            className="glass-card space-y-4 p-6"
                        >
                            <h3 className="flex items-center gap-2 text-lg font-black">
                                <ShieldCheck className="h-5 w-5" /> Verifikasi Admin
                            </h3>
                            <select
                                className="input"
                                value={verify.data.verification_status}
                                onChange={(e) => verify.setData('verification_status', e.target.value)}
                            >
                                <option value="disetujui">Setujui</option>
                                <option value="ditolak">Tolak</option>
                            </select>
                            <textarea
                                className="input min-h-24"
                                placeholder="Catatan admin"
                                value={verify.data.verification_note}
                                onChange={(e) => verify.setData('verification_note', e.target.value)}
                            />
                            <button className="btn-primary" disabled={verify.processing}>
                                Simpan Verifikasi
                            </button>
                        </form>
                    )}

                    <div className="glass-card p-6">
                        <h3 className="mb-4 text-lg font-black">Riwayat Audit</h3>
                        <div className="space-y-3">
                            {debt.audits?.map((audit: any) => (
                                <div
                                    key={audit.id}
                                    className="rounded-2xl border border-slate-100 p-3 text-sm dark:border-slate-800"
                                >
                                    <div className="font-bold capitalize">{audit.action}</div>
                                    <div className="text-slate-500">
                                        {audit.user?.name ?? 'Sistem'} - {dateTime(audit.created_at)}
                                    </div>
                                    <div>{audit.note}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
            {deleteModal}
        </AppLayout>
    );
}
