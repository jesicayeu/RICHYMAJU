import Badge from '@/Components/Badge';
import DetailMedia from '@/Components/DetailMedia';
import AppLayout from '@/Layouts/AppLayout';
import { useConfirmDelete } from '@/hooks/useConfirmDelete';
import { dateTime, humanDebtStatus, registeredUserName, rupiah } from '@/lib/format';
import { Link, useForm } from '@inertiajs/react';
import { Edit, ShieldCheck, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';

function DetailCard({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div className="detail-metric-card">
            <div className="detail-metric-label">{label}</div>
            <div className="mt-2">{children}</div>
        </div>
    );
}

export default function DebtShow({ debt, isAdmin }: any) {
    const verify = useForm({ verification_status: 'disetujui', verification_note: '' });
    const isLocked = debt.verification_status === 'disetujui';
    const canVerify = isAdmin && debt.verification_status === 'menunggu';
    const { requestDelete, deleteModal } = useConfirmDelete({
        buildRoute: (id) => route('debts.destroy', id),
        title: 'Hapus Utang',
        message: () => 'Yakin hapus utang ini? Tindakan tidak dapat dibatalkan.',
    });

    return (
        <AppLayout title="Detail Utang">
            <div className="grid gap-6 xl:grid-cols-3">
                <div className="glass-card space-y-5 p-6 xl:col-span-2">
                    <div className="space-y-1">
                        <div className="flex items-center justify-between gap-3">
                            <h2 className="text-2xl font-black">Detail Utang</h2>
                            {!isLocked && (
                                <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                                    <Link href={route('debts.edit', debt.id)} className="btn-primary">
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
                            )}
                        </div>
                        <p className="text-sm text-slate-500">
                            {dateTime(debt.occurred_at)} · {registeredUserName(debt.user)}
                        </p>
                    </div>

                    <div className="space-y-4">
                        <div className="detail-metric-grid">
                            <DetailCard label="Nominal">
                                <p className="detail-metric-value">{rupiah(debt.amount)}</p>
                            </DetailCard>
                            <DetailCard label="Status">
                                <Badge
                                    variant="solid"
                                    value={debt.status}
                                    label={humanDebtStatus(debt.status)}
                                />
                            </DetailCard>
                            <DetailCard label="Pihak">
                                <p className="detail-metric-value">{debt.party_name}</p>
                            </DetailCard>
                        </div>

                        <DetailCard label="Barang">
                            <p className="detail-metric-value whitespace-pre-wrap">{debt.item_name}</p>
                        </DetailCard>

                        <DetailMedia url={debt.evidence_url} label="Bukti Utang" />

                        {isLocked && (
                            <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
                                Data utang ini sudah disetujui dan terkunci permanen.
                            </p>
                        )}
                    </div>
                </div>

                <div className="space-y-6">
                    {canVerify && (
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
