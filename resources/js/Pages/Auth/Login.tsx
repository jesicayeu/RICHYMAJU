import InputError from '@/Components/InputError';
import { Head, Link, useForm } from '@inertiajs/react';
import { Eye, EyeOff, LockKeyhole, Moon, Sun, User } from 'lucide-react';
import { FormEventHandler, useState } from 'react';
import { useTheme } from '@/hooks/useTheme';

export default function Login({ status }: { status?: string }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        username: '',
        password: '',
        remember: false as boolean,
    });
    const [showPassword, setShowPassword] = useState(false);
    const { isDark, toggleTheme } = useTheme();

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('login'), {
            onFinish: () => reset('password'),
        });
    };

    return (
        <div className="relative flex min-h-screen items-center justify-center px-4 py-6 text-slate-900 dark:text-slate-100">
            <Head title="Login" />

            <button
                onClick={toggleTheme}
                className="btn-muted !rounded-full !p-2 absolute right-3 top-3 sm:right-6 sm:top-6"
                aria-label="Toggle theme"
            >
                {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            <form
                onSubmit={submit}
                className="glass-card relative z-10 w-full max-w-sm p-5 sm:p-6"
            >
                <div className="mb-5 text-center">
                    <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-brand-logo text-base font-black text-white shadow-brand">
                        RM
                    </div>
                    <p className="text-[10px] font-semibold tracking-[0.3em] text-indigo-600 dark:text-indigo-400">Aplikasi Akuntansi</p>
                    <h1 className="mt-0.5 text-xl font-black tracking-tight">Richy Maju</h1>
                </div>

                {status && (
                    <div className="mb-3 rounded-xl border border-emerald-200 bg-emerald-50 p-2.5 text-xs font-semibold text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200">
                        {status}
                    </div>
                )}

                <label className="mb-3 block">
                    <span className="mb-1.5 block text-xs font-semibold">Username</span>
                    <div className="relative">
                        <User className="pointer-events-none absolute left-3.5 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                            className="input !py-2 !pl-10 text-sm"
                            value={data.username}
                            autoFocus
                            autoComplete="username"
                            placeholder="username"
                            onChange={(e) => setData('username', e.target.value)}
                        />
                    </div>
                    <InputError message={errors.username} className="mt-1.5" />
                </label>

                <label className="mb-3 block">
                    <span className="mb-1.5 block text-xs font-semibold">Password</span>
                    <div className="relative">
                        <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                            type={showPassword ? 'text' : 'password'}
                            className="input !py-2 !pl-10 !pr-10 text-sm"
                            value={data.password}
                            autoComplete="current-password"
                            placeholder="********"
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

                <div className="mb-4 flex items-center justify-between gap-2 text-xs">
                    <label className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                        <input
                            type="checkbox"
                            checked={data.remember}
                            onChange={(e) => setData('remember', e.target.checked)}
                            className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900"
                        />
                        Ingat sesi saya
                    </label>
                    <Link
                        href={route('password.request')}
                        className="font-semibold text-indigo-600 transition hover:text-indigo-500 dark:text-indigo-400"
                    >
                        Lupa password?
                    </Link>
                </div>

                <button
                    type="submit"
                    disabled={processing}
                    className="btn-primary w-full !py-2.5 text-sm"
                >
                    {processing ? (
                        <>
                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/70 border-t-transparent" />
                            Memproses...
                        </>
                    ) : (
                        <>
                            <LockKeyhole className="h-4 w-4" />
                            Login
                        </>
                    )}
                </button>
            </form>
        </div>
    );
}
