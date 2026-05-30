import InputError from '@/Components/InputError';
import { useTheme } from '@/hooks/useTheme';
import { Head, Link, useForm } from '@inertiajs/react';
import { motion } from 'framer-motion';
import { ArrowLeft, Eye, EyeOff, KeyRound, LockKeyhole, Moon, Sun } from 'lucide-react';
import { FormEventHandler, useState } from 'react';

export default function ResetPassword({
    token,
    email,
    username,
    expireMinutes = 60,
}: {
    token: string;
    email: string;
    username?: string;
    expireMinutes?: number;
}) {
    const { data, setData, post, processing, errors, reset } = useForm({
        token,
        email,
        password: '',
        password_confirmation: '',
    });
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const { isDark, toggleTheme } = useTheme();

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('password.store'), {
            onFinish: () => reset('password', 'password_confirmation'),
        });
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="relative flex min-h-screen items-center justify-center px-4 py-6 text-slate-900 dark:text-slate-100"
        >
            <Head title="Reset Password" />

            <button
                onClick={toggleTheme}
                className="btn-muted !rounded-full !p-2 absolute right-3 top-3 sm:right-6 sm:top-6"
                aria-label="Toggle theme"
            >
                {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            <motion.form
                onSubmit={submit}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                className="glass-card relative z-10 w-full max-w-sm p-5 sm:p-6"
            >
                <div className="mb-5 text-center">
                    <motion.div
                        initial={{ scale: 0.85, rotate: -6 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: 'spring', stiffness: 220, damping: 14 }}
                        className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-indigo-600 text-base font-black text-white shadow-md"
                    >
                        RM
                    </motion.div>
                    <p className="text-[10px] font-semibold tracking-[0.3em] text-indigo-600 dark:text-indigo-400">
                        Aplikasi Akuntansi
                    </p>
                    <h1 className="mt-0.5 text-xl font-black tracking-tight">Password Baru</h1>
                    {username && (
                        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                            Akun: <span className="font-semibold text-slate-700 dark:text-slate-200">{username}</span>
                        </p>
                    )}
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                        Link reset berlaku <strong>{expireMinutes} menit</strong>. Selesaikan sebelum kedaluwarsa.
                    </p>
                </div>

                <input type="hidden" name="email" value={data.email} />
                <input type="hidden" name="token" value={data.token} />

                <label className="mb-3 block">
                    <span className="mb-1.5 block text-xs font-semibold">Password Baru</span>
                    <div className="relative">
                        <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                            type={showPassword ? 'text' : 'password'}
                            className="input !py-2 !pl-10 !pr-10 text-sm"
                            value={data.password}
                            autoFocus
                            autoComplete="new-password"
                            placeholder="Minimal 8 karakter"
                            onChange={(e) => setData('password', e.target.value)}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-800"
                            aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                        >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                    </div>
                    <InputError message={errors.password} className="mt-1.5" />
                </label>

                <label className="mb-4 block">
                    <span className="mb-1.5 block text-xs font-semibold">Konfirmasi Password</span>
                    <div className="relative">
                        <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                            type={showConfirm ? 'text' : 'password'}
                            className="input !py-2 !pl-10 !pr-10 text-sm"
                            value={data.password_confirmation}
                            autoComplete="new-password"
                            placeholder="Ulangi password"
                            onChange={(e) => setData('password_confirmation', e.target.value)}
                        />
                        <button
                            type="button"
                            onClick={() => setShowConfirm(!showConfirm)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-800"
                            aria-label={showConfirm ? 'Sembunyikan password' : 'Tampilkan password'}
                        >
                            {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                    </div>
                    <InputError message={errors.password_confirmation} className="mt-1.5" />
                </label>

                <InputError message={errors.email} className="mb-3" />

                <motion.button
                    type="submit"
                    whileTap={{ scale: 0.97 }}
                    disabled={processing}
                    className="btn-primary w-full !py-2.5 text-sm"
                >
                    {processing ? (
                        <>
                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/70 border-t-transparent" />
                            Menyimpan...
                        </>
                    ) : (
                        <>
                            <KeyRound className="h-4 w-4" />
                            Simpan Password
                        </>
                    )}
                </motion.button>

                <Link
                    href={route('login')}
                    className="mt-4 flex items-center justify-center gap-1.5 text-xs font-semibold text-indigo-600 transition hover:text-indigo-500 dark:text-indigo-400"
                >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Kembali ke login
                </Link>
            </motion.form>
        </motion.div>
    );
}
