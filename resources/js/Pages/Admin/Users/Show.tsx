import Badge from '@/Components/Badge';
import DetailMedia from '@/Components/DetailMedia';
import AppLayout from '@/Layouts/AppLayout';
import { useConfirmDelete } from '@/hooks/useConfirmDelete';
import { rupiah } from '@/lib/format';
import { router } from '@inertiajs/react';
import { Power, RotateCcw, Trash2 } from 'lucide-react';

export default function UserShow({ managedUser }: any) {
    const { requestDelete, deleteModal } = useConfirmDelete({
        buildRoute: (id) => route('admin.users.destroy', id),
        title: 'Hapus Akun',
        message: (target) =>
            `Yakin ingin menghapus akun "${target.label ?? 'ini'}"? Tindakan ini tidak dapat dibatalkan.`,
    });

    return (
        <AppLayout title={`Detail ${managedUser.name}`}>
            <div className="glass-card mx-auto max-w-3xl p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-black">{managedUser.name}</h2>
                        <p className="text-slate-500">
                            @{managedUser.username} - {managedUser.email}
                        </p>
                        {managedUser.phone ? <p className="mt-1 text-slate-500">HP: {managedUser.phone}</p> : null}
                    </div>
                    <div className="flex gap-2">
                        <Badge value={managedUser.role} />
                        <Badge value={managedUser.status} />
                    </div>
                </div>

                <DetailMedia url={managedUser.avatar_url} label="Foto Profil" alt={managedUser.name} />
                <div className="mt-6 grid gap-4 md:grid-cols-2"><div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900"><div className="text-sm text-slate-500">Transaksi</div><div className="text-2xl font-black">{managedUser.transactions?.length ?? 0}</div></div><div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900"><div className="text-sm text-slate-500">Utang</div><div className="text-2xl font-black">{managedUser.debts?.length ?? 0}</div></div></div>
                <div className="mt-6 flex flex-wrap gap-2">
                    <button
                        onClick={() => confirm('Ubah status akun?') && router.patch(route('admin.users.toggle', managedUser.id))}
                        className="btn-muted"
                    >
                        <Power className="h-4 w-4" /> Aktif/Nonaktif
                    </button>
                    <button
                        onClick={() => {
                            const password = prompt('Password baru (kosongkan untuk generate otomatis)') ?? '';
                            router.post(route('admin.users.reset-password', managedUser.id), { password });
                        }}
                        className="btn-muted"
                    >
                        <RotateCcw className="h-4 w-4" /> Reset Password
                    </button>
                    <button
                        onClick={() => requestDelete({ id: managedUser.id, label: managedUser.name })}
                        className="btn-muted text-rose-600"
                    >
                        <Trash2 className="h-4 w-4" /> Hapus
                    </button>
                </div>
            </div>
            {deleteModal}
        </AppLayout>
    );
}
