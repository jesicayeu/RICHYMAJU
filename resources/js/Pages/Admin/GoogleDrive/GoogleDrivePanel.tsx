import FolderTab from '@/Pages/Admin/GoogleDrive/FolderTab';
import SheetTab from '@/Pages/Admin/GoogleDrive/SheetTab';
import PasswordInput from '@/Components/PasswordInput';
import { router, useForm } from '@inertiajs/react';
import { motion } from 'framer-motion';
import { Link2, Unlink } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';

type Settings = {
    client_id: string;
    client_secret: string;
    redirect_uri: string;
    connection_status: string;
    connected_email: string | null;
    connected_at: string | null;
};

type Folders = {
    transactions: string;
    stocks: string;
    debts: string;
    chat: string;
    profile: string;
};

type Sheets = {
    transactions: string;
    stocks: string;
    debts: string;
};

const tabs = ['config', 'folder', 'sheet'] as const;
type Tab = (typeof tabs)[number];

const tabLabels: Record<Tab, string> = {
    config: 'Config',
    folder: 'Folder',
    sheet: 'Sheet',
};

const statusLabels: Record<string, string> = {
    belum_terhubung: 'Belum terhubung',
    terhubung: 'Terhubung',
};

function ConnectionStatus({ status }: { status: string }) {
    const isConnected = status === 'terhubung';

    return (
        <span
            className={`inline-flex items-center whitespace-nowrap rounded-full px-3 py-1 text-xs font-bold ${
                isConnected
                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                    : 'bg-slate-500/10 text-slate-600 dark:text-slate-300'
            }`}
        >
            {statusLabels[status] ?? status}
        </span>
    );
}

export default function GoogleDrivePanel({
    settings,
    folders,
    sheets,
}: {
    settings: Settings;
    folders: Folders;
    sheets: Sheets;
}) {
    const [activeTab, setActiveTab] = useState<Tab>('config');

    const form = useForm({
        client_id: settings.client_id,
        client_secret: settings.client_secret,
    });

    useEffect(() => {
        form.setData({
            client_id: settings.client_id,
            client_secret: settings.client_secret,
        });
    }, [settings.client_id, settings.client_secret]);

    const connect = (e: FormEvent) => {
        e.preventDefault();
        form.post(route('admin.google-drive.connect'));
    };

    const disconnect = () => {
        if (!confirm('Putus koneksi Google Drive? Upload file akan gagal sampai dihubungkan kembali.')) {
            return;
        }

        router.post(route('admin.google-drive.disconnect'));
    };

    return (
        <motion.div className="space-y-6">
            <motion.div className="glass-card p-6">
                <h2 className="text-xl font-black">Konfigurasi Integrasi Google Drive</h2>
            </motion.div>

            <motion.div className="flex flex-wrap gap-2">
                {tabs.map((tab) => (
                    <button
                        key={tab}
                        type="button"
                        onClick={() => setActiveTab(tab)}
                        className={`rounded-2xl px-4 py-2 text-sm font-bold transition ${
                            activeTab === tab
                                ? 'bg-indigo-600 text-white shadow-md'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                        }`}
                    >
                        {tabLabels[tab]}
                    </button>
                ))}
            </motion.div>

            {activeTab === 'config' && (
                <motion.div className="glass-card p-6">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <h3 className="font-black">Config</h3>
                        <ConnectionStatus status={settings.connection_status} />
                    </div>

                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                        <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-500">Status</label>
                            <div className="input flex w-full items-center bg-slate-50 dark:bg-slate-900/50">
                                <ConnectionStatus status={settings.connection_status} />
                            </div>
                        </div>
                        <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-500">Akun Terhubung</label>
                            <div className="input flex w-full items-center bg-slate-50 text-slate-600 dark:bg-slate-900/50 dark:text-slate-300">
                                {settings.connected_email ?? '—'}
                            </div>
                        </div>
                        <div className="sm:col-span-2">
                            <label className="mb-1 block text-xs font-semibold text-slate-500">Waktu Terhubung</label>
                            <div className="input flex w-full items-center bg-slate-50 text-slate-600 dark:bg-slate-900/50 dark:text-slate-300">
                                {settings.connected_at
                                    ? new Date(settings.connected_at).toLocaleString('id-ID')
                                    : '—'}
                            </div>
                        </div>
                    </div>

                    <form onSubmit={connect} className="mt-6 grid gap-4 md:grid-cols-2">
                        <div className="md:col-span-2">
                            <label className="mb-1 block text-xs font-semibold text-slate-500">
                                OAuth Redirect URL
                            </label>
                            <input
                                className="input w-full bg-slate-50 text-slate-600 dark:bg-slate-900/50 dark:text-slate-300"
                                value={settings.redirect_uri}
                                readOnly
                            />
                            <p className="mt-1 text-xs text-slate-500">
                                Salin URL ini ke Authorized redirect URIs di Google Cloud Console.
                            </p>
                        </div>
                        <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-500">Client ID</label>
                            <input
                                className="input w-full"
                                value={form.data.client_id}
                                onChange={(e) => form.setData('client_id', e.target.value)}
                                placeholder="xxx.apps.googleusercontent.com"
                                required
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-500">Client Secret</label>
                            <PasswordInput
                                value={form.data.client_secret}
                                onChange={(value) => form.setData('client_secret', value)}
                                placeholder="Masukkan client secret"
                            />
                        </div>
                        <div className="flex flex-wrap gap-3 md:col-span-2">
                            <button type="submit" className="btn-primary" disabled={form.processing}>
                                <Link2 className="h-4 w-4" /> Connect
                            </button>
                            {settings.connection_status === 'terhubung' ? (
                                <button type="button" onClick={disconnect} className="btn-muted inline-flex items-center gap-2">
                                    <Unlink className="h-4 w-4" />
                                    Putus Koneksi
                                </button>
                            ) : null}
                        </div>
                    </form>
                </motion.div>
            )}

            {activeTab === 'folder' && <FolderTab folders={folders} />}

            {activeTab === 'sheet' && <SheetTab sheets={sheets} />}
        </motion.div>
    );
}
