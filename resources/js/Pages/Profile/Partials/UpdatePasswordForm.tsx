import InputError from '@/Components/InputError';
import { Transition } from '@headlessui/react';
import { useForm } from '@inertiajs/react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, KeyRound, LockKeyhole, Save, ShieldCheck } from 'lucide-react';
import { FormEventHandler, useRef, useState } from 'react';

export default function UpdatePasswordForm({ className = '' }: { className?: string }) {
    const passwordInput = useRef<HTMLInputElement>(null);
    const currentPasswordInput = useRef<HTMLInputElement>(null);

    const { data, setData, errors, put, reset, processing, recentlySuccessful } = useForm({
        current_password: '',
        password: '',
        password_confirmation: '',
    });

    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const updatePassword: FormEventHandler = (e) => {
        e.preventDefault();
        put(route('password.update'), {
            preserveScroll: true,
            onSuccess: () => reset(),
            onError: (errs) => {
                if (errs.password) {
                    reset('password', 'password_confirmation');
                    passwordInput.current?.focus();
                }
                if (errs.current_password) {
                    reset('current_password');
                    currentPasswordInput.current?.focus();
                }
            },
        });
    };

    const renderPasswordInput = (
        id: string,
        value: string,
        setter: (v: string) => void,
        show: boolean,
        toggle: () => void,
        autoComplete: string,
        ref?: React.RefObject<HTMLInputElement>,
    ) => (
        <div className="relative">
            <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
                id={id}
                ref={ref as any}
                type={show ? 'text' : 'password'}
                className="input !pl-10 !pr-10"
                value={value}
                onChange={(e) => setter(e.target.value)}
                autoComplete={autoComplete}
            />
            <button
                type="button"
                onClick={toggle}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label={show ? 'Sembunyikan' : 'Tampilkan'}
            >
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
        </div>
    );

    return (
        <section className={className}>
            <header className="mb-6">
                <h2 className="flex items-center gap-2 text-lg font-black">
                    <KeyRound className="h-5 w-5 text-indigo-500" />
                    Ubah Password
                </h2>
            </header>

            <form onSubmit={updatePassword} className="space-y-5">
                <label className="block">
                    <span className="mb-1.5 block text-sm font-bold">Password Saat Ini</span>
                    {renderPasswordInput(
                        'current_password',
                        data.current_password,
                        (v) => setData('current_password', v),
                        showCurrent,
                        () => setShowCurrent(!showCurrent),
                        'current-password',
                        currentPasswordInput,
                    )}
                    <InputError message={errors.current_password} className="mt-1.5" />
                </label>

                <div className="grid gap-5 sm:grid-cols-2">
                    <label className="block">
                        <span className="mb-1.5 block text-sm font-bold">Password Baru</span>
                        {renderPasswordInput(
                            'password',
                            data.password,
                            (v) => setData('password', v),
                            showNew,
                            () => setShowNew(!showNew),
                            'new-password',
                            passwordInput,
                        )}
                        <InputError message={errors.password} className="mt-1.5" />
                    </label>

                    <label className="block">
                        <span className="mb-1.5 block text-sm font-bold">Konfirmasi Password</span>
                        {renderPasswordInput(
                            'password_confirmation',
                            data.password_confirmation,
                            (v) => setData('password_confirmation', v),
                            showConfirm,
                            () => setShowConfirm(!showConfirm),
                            'new-password',
                        )}
                        <InputError message={errors.password_confirmation} className="mt-1.5" />
                    </label>
                </div>

                <div className="flex items-center gap-3">
                    <motion.button whileTap={{ scale: 0.97 }} disabled={processing} className="btn-primary">
                        {processing ? (
                            <>
                                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/70 border-t-transparent" />
                                Menyimpan...
                            </>
                        ) : (
                            <>
                                <Save className="h-4 w-4" />
                                Simpan Password
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
                        <p className="flex items-center gap-1 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                            <ShieldCheck className="h-4 w-4" />
                            Tersimpan.
                        </p>
                    </Transition>
                </div>
            </form>
        </section>
    );
}
