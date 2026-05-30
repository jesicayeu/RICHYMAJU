import InputError from '@/Components/InputError';
import AppLayout from '@/Layouts/AppLayout';
import { useForm } from '@inertiajs/react';
import { KeyRound, Mail, Phone, Save } from 'lucide-react';
import { FormEvent } from 'react';

type ManagedUser = {
    id: number;
    name: string;
    username: string;
    email: string;
    phone?: string | null;
    role: string;
    status: string;
};

type Props = {
    managedUser?: ManagedUser | null;
};

export default function UserForm({ managedUser = null }: Props) {
    const isEdit = !!managedUser;

    const { data, setData, post, put, processing, errors } = useForm({
        name: managedUser?.name ?? '',
        username: managedUser?.username ?? '',
        email: managedUser?.email ?? '',
        phone: managedUser?.phone ?? '',
        password: '',
        role: managedUser?.role ?? 'kasir',
        status: managedUser?.status ?? 'aktif',
    });

    const generate = () => setData('password', Math.random().toString(36).slice(2, 12));

    const submit = (e: FormEvent) => {
        e.preventDefault();
        if (isEdit && managedUser) {
            put(route('admin.users.update', managedUser.id));
        } else {
            post(route('admin.users.store'));
        }
    };

    return (
        <AppLayout title={isEdit ? 'Edit Akun' : 'Tambah Akun'}>
            <form onSubmit={submit} className="glass-card mx-auto max-w-3xl space-y-5 p-6">
                <label>
                    <span className="mb-2 block text-sm font-bold">Nama</span>
                    <input className="input" value={data.name} onChange={(e) => setData('name', e.target.value)} />
                    <InputError message={errors.name} />
                </label>

                <label>
                    <span className="mb-2 block text-sm font-bold">Username</span>
                    <input
                        className="input"
                        value={data.username}
                        onChange={(e) => setData('username', e.target.value)}
                    />
                    <InputError message={errors.username} />
                </label>

                <label>
                    <span className="mb-2 block text-sm font-bold">Email</span>
                    <div className="relative">
                        <Mail className="pointer-events-none absolute left-3.5 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                            type="email"
                            className="input !pl-10"
                            value={data.email}
                            placeholder="nama@email.com"
                            onChange={(e) => setData('email', e.target.value)}
                        />
                    </div>
                    <InputError message={errors.email} />
                </label>

                <label>
                    <span className="mb-2 block text-sm font-bold">Nomor HP</span>
                    <div className="relative">
                        <Phone className="pointer-events-none absolute left-3.5 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                            type="tel"
                            className="input !pl-10"
                            value={data.phone}
                            placeholder="08xxxxxxxxxx"
                            onChange={(e) => setData('phone', e.target.value)}
                        />
                    </div>
                    <InputError message={errors.phone} />
                </label>

                {!isEdit && (
                    <label>
                        <span className="mb-2 block text-sm font-bold">Password</span>
                        <div className="flex gap-2">
                            <input
                                className="input"
                                value={data.password}
                                onChange={(e) => setData('password', e.target.value)}
                            />
                            <button type="button" onClick={generate} className="btn-muted">
                                <KeyRound className="h-4 w-4" /> Generate
                            </button>
                        </div>
                        <InputError message={errors.password} />
                    </label>
                )}

                <div className="grid gap-4 md:grid-cols-2">
                    <label>
                        <span className="mb-2 block text-sm font-bold">Role</span>
                        <select className="input" value={data.role} onChange={(e) => setData('role', e.target.value)}>
                            <option value="kasir">Kasir</option>
                            <option value="admin">Admin</option>
                        </select>
                    </label>
                    <label>
                        <span className="mb-2 block text-sm font-bold">Status</span>
                        <select className="input" value={data.status} onChange={(e) => setData('status', e.target.value)}>
                            <option value="aktif">Aktif</option>
                            <option value="nonaktif">Nonaktif</option>
                        </select>
                    </label>
                </div>

                <button disabled={processing} className="btn-primary">
                    <Save className="h-4 w-4" /> {isEdit ? 'Simpan Perubahan' : 'Simpan Akun'}
                </button>
            </form>
        </AppLayout>
    );
}
