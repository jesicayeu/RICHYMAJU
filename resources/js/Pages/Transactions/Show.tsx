import Badge from '@/Components/Badge';
import DetailMedia from '@/Components/DetailMedia';
import AppLayout from '@/Layouts/AppLayout';
import { useConfirmDelete } from '@/hooks/useConfirmDelete';
import {
    dateTime,
    humanTransactionUiStatus,
    isPendingVerification,
    rupiah,
    userDisplayName,
    cleanPosDescription,
} from '@/lib/format';
import { Link, router, useForm } from '@inertiajs/react';
import { ArrowLeft, CheckCircle2, Edit, ShieldCheck, Trash2 } from 'lucide-react';

export default function TransactionShow({ transaction, isAdmin }: any) {
    const verify = useForm({ verification_status: 'disetujui', verification_note: '' });
    const isLocked = transaction.verification_status === 'disetujui';
    const canVerify = isAdmin && isPendingVerification(transaction.verification_status);
    const { requestDelete, deleteModal } = useConfirmDelete({
        buildRoute: (id) => route('transactions.destroy', id),
        title: 'Hapus Transaksi',
        message: () => 'Yakin hapus transaksi ini? Tindakan tidak dapat dibatalkan.',
    });

    return (
        <AppLayout title="Detail Transaksi">
            <div className="grid gap-6 xl:grid-cols-3">
                <div className="glass-card space-y-5 p-6 xl:col-span-2">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <h2 className="text-2xl font-black">Detail Transaksi</h2>
                            <p className="text-sm text-slate-500">
                                {dateTime(transaction.occurred_at)} oleh {userDisplayName(transaction.user)}
                            </p>
                        </div>
                        <Badge value={transaction.type} />
                    </div>
                    <div className="grid gap-4 md:grid-cols-3">
                        <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900">
                            <div className="text-sm text-slate-500">Verifikasi</div>
                            <Badge value={transaction.verification_status} />
                        </div>
                        <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900">
                            <div className="text-sm text-slate-500">Nominal</div>
                            <div className="text-xl font-black">{rupiah(transaction.amount)}</div>
                        </div>
                        <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900">
                            <div className="text-sm text-slate-500">Status</div>
                            <Badge value={transaction.ui_status} label={humanTransactionUiStatus(transaction.ui_status)} />
                        </div>
                        <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900 md:col-span-3">
                            <div className="text-sm text-slate-500">Keterangan</div>
                            <div className="mt-1 text-xl font-black">{cleanPosDescription(transaction.description) || '-'}</div>
                        </div>
                    </div>
                    {transaction.verifier && (
                        <p className="text-sm text-slate-500">
                            Diverifikasi oleh {userDisplayName(transaction.verifier)}
                            {transaction.verified_at ? ` · ${dateTime(transaction.verified_at)}` : ''}
                        </p>
                    )}
                    {isLocked && (
                        <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
                            Data transaksi ini sudah disetujui dan terkunci permanen.
                        </p>
                    )}
                    <DetailMedia url={transaction.evidence_url} label="Bukti Transaksi" />
                    <div className="flex flex-wrap gap-2">
                        {!isLocked && (
                            <Link href={route('transactions.edit', transaction.id)} className="btn-muted">
                                <Edit className="h-4 w-4" /> Edit
                            </Link>
                        )}
                        {!isLocked && transaction.type === 'pengeluaran' && (
                            <button
                                onClick={() => router.post(route('transactions.lunas', transaction.id))}
                                className="btn-primary"
                            >
                                <CheckCircle2 className="h-4 w-4" /> Tandai Lunas
                            </button>
                        )}
                        {isAdmin && !isLocked && (
                            <button
                                type="button"
                                onClick={() => requestDelete({ id: transaction.id })}
                                className="btn-muted text-rose-600"
                            >
                                <Trash2 className="h-4 w-4" /> Hapus
                            </button>
                        )}
                    </div>
                </div>
                <div className="space-y-6">
                    {isAdmin && (
                        <div className="glass-card space-y-4 p-6">
                            <h3 className="flex items-center gap-2 text-lg font-black">
                                <ShieldCheck className="h-5 w-5" /> Verifikasi Transaksi
                            </h3>

                            {canVerify ? (
                                <form
                                    onSubmit={(e) => {
                                        e.preventDefault();
                                        verify.post(route('transactions.verify', transaction.id));
                                    }}
                                    className="space-y-4"
                                >
                                    <div>
                                        <label className="mb-1 block text-sm font-semibold text-slate-500">
                                            Keputusan
                                        </label>
                                        <select
                                            className="input"
                                            value={verify.data.verification_status}
                                            onChange={(e) =>
                                                verify.setData('verification_status', e.target.value)
                                            }
                                        >
                                            <option value="disetujui">Setujui</option>
                                            <option value="ditolak">Tolak</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-sm font-semibold text-slate-500">
                                            Catatan Admin
                                        </label>
                                        <textarea
                                            className="input min-h-24"
                                            placeholder="Catatan tambahan (opsional)"
                                            value={verify.data.verification_note}
                                            onChange={(e) =>
                                                verify.setData('verification_note', e.target.value)
                                            }
                                        />
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        <button className="btn-primary" disabled={verify.processing}>
                                            Simpan Verifikasi
                                        </button>
                                        <Link href={route('transactions.index')} className="btn-muted">
                                            <ArrowLeft className="h-4 w-4" /> Kembali
                                        </Link>
                                    </div>
                                </form>
                            ) : (
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between gap-3">
                                        <span className="text-sm text-slate-500">Status Verifikasi</span>
                                        <Badge value={transaction.verification_status} />
                                    </div>
                                    {transaction.verifier && (
                                        <p className="text-sm text-slate-500">
                                            Diverifikasi oleh {userDisplayName(transaction.verifier)}
                                            {transaction.verified_at
                                                ? ` · ${dateTime(transaction.verified_at)}`
                                                : ''}
                                        </p>
                                    )}
                                    {transaction.verification_note && (
                                        <p className="rounded-2xl bg-slate-50 p-3 text-sm dark:bg-slate-900">
                                            {transaction.verification_note}
                                        </p>
                                    )}
                                    {isLocked && (
                                        <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
                                            Data transaksi ini sudah disetujui dan terkunci permanen.
                                        </p>
                                    )}
                                    <Link href={route('transactions.index')} className="btn-muted">
                                        <ArrowLeft className="h-4 w-4" /> Kembali
                                    </Link>
                                </div>
                            )}
                        </div>
                    )}
                    <div className="glass-card p-6">
                        <h3 className="mb-4 text-lg font-black">Riwayat Audit</h3>
                        <div className="space-y-3">
                            {transaction.audits?.map((audit: any) => (
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
