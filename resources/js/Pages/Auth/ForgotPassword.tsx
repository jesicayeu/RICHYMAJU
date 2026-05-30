import InputError from '@/Components/InputError';
import { useTheme } from '@/hooks/useTheme';
import { Head, Link, useForm } from '@inertiajs/react';
import { motion } from 'framer-motion';
import { ArrowLeft, KeyRound, Mail, Moon, Sun } from 'lucide-react';
import { FormEventHandler } from 'react';

export default function ForgotPassword({ status }: { status?: string }) {
    const { data, setData, post, processing, errors } = useForm({
        email: '',
    });
    const { isDark, toggleTheme } = useTheme();

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('password.email'));
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="relative flex min-h-screen items-center justify-center px-4 py-6 text-slate-900 dark:text-slate-100"
        >
            <Head title="Lupa Password" />

            <button
                onClick={toggleTheme}
                className="btn-muted !rounded-full !p-2 absolute right-3 top-3 sm:right-6 sm:top-6"
                aria-label="Toggle theme"
            >
                {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            <motion.div
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
                    <h1 className="mt-0.5 text-xl font-black tracking-tight">Lupa Password</h1>
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                        Masukkan <strong>email yang terdaftar di akun</strong> Anda. Link reset akan dikirim ke
                        alamat tersebut. Permintaan ulang dapat dilakukan setelah <strong>1 menit</strong>.
                    </p>
                </div>

                {status && !errors.email && (
                    <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-3 rounded-xl border border-emerald-200 bg-emerald-50 p-2.5 text-xs font-semibold text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200"
                    >
                        {status}
                    </motion.div>
                )}

                {errors.email && (
                    <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-3 rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-xs font-semibold text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200"
                    >
                        {errors.email}
                    </motion.div>
                )}

                <form onSubmit={submit}>
                    <label className="mb-4 block">
                        <span className="mb-1.5 block text-xs font-semibold">Email</span>
                        <div className="relative">
                            <Mail className="pointer-events-none absolute left-3.5 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <input
                                type="email"
                                className="input !py-2 !pl-10 text-sm"
                                value={data.email}
                                autoFocus
                                autoComplete="email"
                                placeholder="nama@email.com"
                                onChange={(e) => setData('email', e.target.value)}
                            />
                        </div>
                        <InputError message={errors.email} className="mt-1.5" />
                    </label>

                    <motion.button
                        type="submit"
                        whileTap={{ scale: 0.97 }}
                        disabled={processing}
                        className="btn-primary w-full !py-2.5 text-sm"
                    >
                        {processing ? (
                            <>
                                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/70 border-t-transparent" />
                                Mengirim...
                            </>
                        ) : (
                            <>
                                <KeyRound className="h-4 w-4" />
                                Kirim ke Email
                            </>
                        )}
                    </motion.button>
                </form>

                <Link
                    href={route('login')}
                    className="mt-4 flex items-center justify-center gap-1.5 text-xs font-semibold text-indigo-600 transition hover:text-indigo-500 dark:text-indigo-400"
                >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Kembali ke login
                </Link>
            </motion.div>
        </motion.div>
    );
}
