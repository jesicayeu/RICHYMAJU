import Badge from '@/Components/Badge';
import AppLayout from '@/Layouts/AppLayout';
import { useConfirmDelete } from '@/hooks/useConfirmDelete';
import { Link, router } from '@inertiajs/react';
import { Pencil, Plus, Power, RotateCcw, Trash2 } from 'lucide-react';
import { useState } from 'react';

export default function UsersIndex({ users, filters }: any) {
    const [search, setSearch] = useState(filters.search ?? '');
    const { requestDelete, deleteModal } = useConfirmDelete({
        buildRoute: (id) => route('admin.users.destroy', id),
        title: 'Hapus Akun',
        message: (target) =>
            `Yakin ingin menghapus akun "${target.label ?? 'ini'}"? Tindakan ini tidak dapat dibatalkan.`,
    });

    return (
        <AppLayout title="Kelola Akun">
            <div className="glass-card overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-3 p-6">
                    <div>
                        <h2 className="text-xl font-black">Akun Kasir & Admin</h2>
                    </div>
                    <Link href={route('admin.users.create')} className="btn-primary">
                        <Plus className="h-4 w-4" /> Tambah Akun
                    </Link>
                </div>
                <div className="flex gap-2 border-t border-slate-100 p-4 dark:border-slate-800">
                    <input
                        className="input max-w-md"
                        placeholder="Cari nama/username/email/HP"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                    <button onClick={() => router.get(route('admin.users.index'), { search })} className="btn-muted">
                        Cari
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 text-left dark:bg-slate-900">
                            <tr>
                                <th className="p-4">Nama</th>
                                <th className="p-4">Username</th>
                                <th className="p-4">Email</th>
                                <th className="p-4">Nomor HP</th>
                                <th className="p-4">Role</th>
                                <th className="p-4">Status</th>
                                <th className="p-4 text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.data.map((user: any) => (
                                <tr key={user.id} className="border-t border-slate-100 dark:border-slate-800">
                                    <td className="p-4 font-bold">{user.name}</td>
                                    <td className="p-4">@{user.username}</td>
                                    <td className="p-4 text-slate-600 dark:text-slate-300">{user.email}</td>
                                    <td className="p-4 text-slate-600 dark:text-slate-300">{user.phone || '—'}</td>
                                    <td className="p-4">
                                        <Badge value={user.role} />
                                    </td>
                                    <td className="p-4">
                                        <Badge value={user.status} />
                                    </td>
                                    <td className="flex justify-end gap-2 p-4">
                                        <Link
                                            href={route('admin.users.edit', user.id)}
                                            className="btn-muted !px-3"
                                            title="Edit akun"
                                        >
                                            <Pencil className="h-4 w-4" />
                                        </Link>
                                        <button
                                            onClick={() =>
                                                confirm('Ubah status akun?') &&
                                                router.patch(route('admin.users.toggle', user.id))
                                            }
                                            className="btn-muted !px-3"
                                            title="Aktif/nonaktif"
                                        >
                                            <Power className="h-4 w-4" />
                                        </button>
                                        <button
                                            onClick={() => {
                                                const password =
                                                    prompt('Password baru (kosongkan untuk generate otomatis)') ?? '';
                                                router.post(route('admin.users.reset-password', user.id), { password });
                                            }}
                                            className="btn-muted !px-3"
                                            title="Reset password"
                                        >
                                            <RotateCcw className="h-4 w-4" />
                                        </button>
                                        <button
                                            onClick={() => requestDelete({ id: user.id, label: user.name })}
                                            className="btn-muted !px-3 text-rose-600"
                                            title="Hapus"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            {deleteModal}
        </AppLayout>
    );
}
