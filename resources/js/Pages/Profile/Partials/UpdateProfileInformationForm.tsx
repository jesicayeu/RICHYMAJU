import ImageInput from '@/Components/ImageInput';
import InputError from '@/Components/InputError';
import { Transition } from '@headlessui/react';
import { useForm, usePage } from '@inertiajs/react';
import { motion } from 'framer-motion';
import { Mail, Phone, Save, Trash2, User as UserIcon } from 'lucide-react';
import { FormEventHandler, useMemo, useState } from 'react';

export default function UpdateProfileInformation({ className = '' }: { className?: string }) {
    const user = usePage().props.auth.user;

    const { data, setData, post, errors, processing, recentlySuccessful, reset } = useForm({
        _method: 'patch' as 'patch',
        name: user.name ?? '',
        email: user.email ?? '',
        phone: user.phone ?? '',
        avatar: null as File | null,
        remove_avatar: false as boolean,
    });

    const [preview, setPreview] = useState<string | null>(null);

    const currentAvatarUrl = useMemo(() => {
        if (preview) return preview;
        if (data.remove_avatar) return null;
        return user.avatar_url ?? null;
    }, [preview, data.remove_avatar, user.avatar_url]);

    const initial = (data.name || user.username || '?').charAt(0).toUpperCase();

    const onAvatarChange = (file: File) => {
        setData((current) => ({ ...current, avatar: file, remove_avatar: false }));
        const reader = new FileReader();
        reader.onload = () => setPreview(typeof reader.result === 'string' ? reader.result : null);
        reader.readAsDataURL(file);
    };

    const removeAvatar = () => {
        setData((current) => ({ ...current, avatar: null, remove_avatar: true }));
        setPreview(null);
    };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('profile.update'), {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                reset('avatar');
                setData('remove_avatar', false);
                setPreview(null);
            },
        });
    };

    return (
        <section className={className}>
            <header className="mb-6">
                <h2 className="text-lg font-black">Informasi Profil</h2>
            </header>

            <form onSubmit={submit} className="space-y-6">
                <div className="flex flex-col items-center gap-5 rounded-3xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-700 dark:bg-slate-800 sm:flex-row sm:items-center">
                    <motion.div
                        whileHover={{ scale: 1.03, rotate: -2 }}
                        transition={{ type: 'spring', stiffness: 260, damping: 18 }}
                        className="relative grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-3xl bg-indigo-600 text-3xl font-black text-white shadow-md"
                    >
                        {currentAvatarUrl ? (
                            <img src={currentAvatarUrl} alt="Avatar" className="h-full w-full object-cover" />
                        ) : (
                            <span>{initial}</span>
                        )}
                    </motion.div>

                    <div className="flex-1 text-center sm:text-left">
                        <div className="text-base font-black">Foto Profil</div>
                        <div className="mt-3 space-y-2">
                            <ImageInput
                                onChange={onAvatarChange}
                                error={errors.avatar}
                                facingMode="user"
                                pickLabel={currentAvatarUrl ? 'Ganti dari Galeri' : 'Pilih dari Galeri'}
                            />
                            {currentAvatarUrl && (
                                <div className="flex justify-center sm:justify-start">
                                    <button
                                        type="button"
                                        onClick={removeAvatar}
                                        className="btn-muted !py-2 text-rose-600 dark:text-rose-400"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                        Hapus
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <label className="block">
                    <span className="mb-1.5 flex items-center gap-1.5 text-sm font-bold">
                        <UserIcon className="h-3.5 w-3.5 text-indigo-500" />
                        Nama Lengkap
                    </span>
                    <input
                        className="input"
                        value={data.name}
                        onChange={(e) => setData('name', e.target.value)}
                        autoComplete="name"
                        required
                    />
                    <InputError className="mt-1.5" message={errors.name} />
                </label>

                <motion.div className="grid gap-4 sm:grid-cols-2">
                    <label className="block">
                        <span className="mb-1.5 flex items-center gap-1.5 text-sm font-bold">
                            <Mail className="h-3.5 w-3.5 text-indigo-500" />
                            Email (opsional)
                        </span>
                        <input
                            type="email"
                            className="input"
                            value={data.email}
                            onChange={(e) => setData('email', e.target.value)}
                            placeholder="email@contoh.com"
                            autoComplete="email"
                        />
                        <InputError className="mt-1.5" message={errors.email} />
                    </label>

                    <label className="block">
                        <span className="mb-1.5 flex items-center gap-1.5 text-sm font-bold">
                            <Phone className="h-3.5 w-3.5 text-indigo-500" />
                            Nomor HP (opsional)
                        </span>
                        <input
                            type="tel"
                            className="input"
                            value={data.phone}
                            onChange={(e) => setData('phone', e.target.value)}
                            placeholder="08xxxxxxxxxx"
                            autoComplete="tel"
                        />
                        <InputError className="mt-1.5" message={errors.phone} />
                    </label>
                </motion.div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
                    <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-700 dark:text-slate-200">Username:</span>
                        <span className="font-mono">@{user.username}</span>
                    </div>
                    <p className="mt-1">Username tidak dapat diubah. Hubungi admin jika perlu diganti.</p>
                </div>

                <div className="flex items-center gap-3">
                    <motion.button
                        whileTap={{ scale: 0.97 }}
                        disabled={processing}
                        className="btn-primary"
                    >
                        {processing ? (
                            <>
                                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/70 border-t-transparent" />
                                Menyimpan...
                            </>
                        ) : (
                            <>
                                <Save className="h-4 w-4" />
                                Simpan Perubahan
                            </>
                        )}
                    </motion.button>

                    <Transition
                        show={recentlySuccessful}
                        enter="transition ease-in-out"
                        enterFrom="opacity-0"
                        leave="transition ease-in-out"
                        leaveTo="opacity-0"
                    >
                        <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">Tersimpan.</p>
                    </Transition>
                </div>
            </form>
        </section>
    );
}
