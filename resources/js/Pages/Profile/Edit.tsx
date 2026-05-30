import AppLayout from '@/Layouts/AppLayout';
import { markPresenceOffline } from '@/lib/presence';
import { router } from '@inertiajs/react';
import { motion } from 'framer-motion';
import { LogOut } from 'lucide-react';
import UpdatePasswordForm from './Partials/UpdatePasswordForm';
import UpdateProfileInformationForm from './Partials/UpdateProfileInformationForm';

export default function Edit() {
    const logout = () => {
        if (confirm('Yakin ingin keluar dari sesi?')) {
            void markPresenceOffline().finally(() => {
                router.post(route('logout'));
            });
        }
    };

    return (
        <AppLayout title="Profil">
            <div className="mx-auto max-w-4xl space-y-6">
                <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.22 }}
                    className="glass-card p-6 sm:p-8"
                >
                    <UpdateProfileInformationForm />
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.22, delay: 0.05 }}
                    className="glass-card p-6 sm:p-8"
                >
                    <UpdatePasswordForm />
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.22, delay: 0.1 }}
                    className="glass-card p-6 sm:p-8"
                >
                    <h2 className="text-lg font-black">Keluar dari Akun</h2>
                    <button
                        type="button"
                        onClick={logout}
                        className="btn-muted mt-4 !text-rose-600 dark:!text-rose-400"
                    >
                        <LogOut className="h-4 w-4" />
                        Logout
                    </button>
                </motion.div>
            </div>
        </AppLayout>
    );
}
