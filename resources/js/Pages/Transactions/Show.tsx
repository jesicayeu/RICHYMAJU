import Badge from '@/Components/Badge';
import DetailMedia from '@/Components/DetailMedia';
import AppLayout from '@/Layouts/AppLayout';
import { useConfirmDelete } from '@/hooks/useConfirmDelete';
import { dateTime, humanTransactionUiStatus, rupiah, userDisplayName } from '@/lib/format';
import { Link, router, useForm } from '@inertiajs/react';
import { CheckCircle2, Edit, ShieldCheck, Trash2 } from 'lucide-react';

export default function TransactionShow({ transaction, isAdmin }: any) {
    const verify = useForm({ verification_status: 'disetujui', verification_note: '' });
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
                            <div className="mt-1 text-xl font-black">{transaction.description}</div>
                        </div>
                    </div>
                    {transaction.verifier && (
                        <p className="text-sm text-slate-500">
                            Diverifikasi oleh {userDisplayName(transaction.verifier)}
                            {transaction.verified_at ? ` · ${dateTime(transaction.verified_at)}` : ''}
                        </p>
                    )}
                    <DetailMedia url={transaction.evidence_url} label="Bukti Transaksi" />
                    <div className="flex flex-wrap gap-2">
                        <Link href={route('transactions.edit', transaction.id)} className="btn-muted">
                            <Edit className="h-4 w-4" /> Edit
                        </Link>
                        {transaction.type === 'pengeluaran' && (
                            <button
                                onClick={() => router.post(route('transactions.lunas', transaction.id))}
                                className="btn-primary"
                            >
                                <CheckCircle2 className="h-4 w-4" /> Tandai Lunas
                            </button>
                        )}
                        {isAdmin && (
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
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                verify.post(route('transactions.verify', transaction.id));
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
