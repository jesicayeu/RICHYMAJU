import KontakTab from '@/Pages/Admin/WhatsApp/KontakTab';
import PesanTab from '@/Pages/Admin/WhatsApp/PesanTab';
import TesTab from '@/Pages/Admin/WhatsApp/TesTab';
import PasswordInput from '@/Components/PasswordInput';
import { PageProps } from '@/types';
import { useForm, usePage } from '@inertiajs/react';
import { motion } from 'framer-motion';
import { ExternalLink, Link2 } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';

type Settings = {
    host_url: string;
    api_key: string;
    connection_status: string;
    last_checked_at: string | null;
};

type Config = {
    session: string;
};

type MessageTemplate = {
    id: number;
    title: string;
    action_key: string;
    action_label: string;
    contact_trigger_label: string | null;
    body: string;
};

type ActionGroups = Record<string, Record<string, string>>;
type ActionTypeVariables = Record<string, Record<string, string>>;

type ContactRow = {
    id: number;
    user_id: number;
    name: string;
    phone: string;
    forms_received: string;
    action_keys: string[];
    chat_id: string;
};

type AccountOption = {
    id: number;
    label: string;
    phone: string;
};

type TriggerOptions = Record<string, string>;

type TestRecipient = {
    id: number;
    label: string;
    phone: string;
    chat_id: string;
};

const tabs = ['config', 'pesan', 'kontak', 'tes'] as const;
type Tab = (typeof tabs)[number];

const tabLabels: Record<Tab, string> = {
    config: 'Config',
    pesan: 'Pesan',
    kontak: 'Kontak',
    tes: 'Test chat',
};

const statusLabels: Record<string, string> = {
    belum_terhubung: 'Belum terhubung',
    terhubung: 'Terhubung',
    gagal: 'Gagal',
};

function ConnectionStatus({ status }: { status: string }) {
    const isConnected = status === 'terhubung';
    const isFailed = status === 'gagal';

    return (
        <span
            className={`inline-flex items-center whitespace-nowrap rounded-full px-3 py-1 text-xs font-bold ${
                isConnected
                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                    : isFailed
                      ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300'
                      : 'bg-slate-500/10 text-slate-600 dark:text-slate-300'
            }`}
        >
            {statusLabels[status] ?? status}
        </span>
    );
}

export default function WhatsAppPanel({
    settings,
    config,
    messageTemplates,
    actionGroups,
    actionTriggerMap,
    actionTypeVariables,
    contacts,
    accountOptions,
    triggerOptions,
    testRecipients,
}: {
    settings: Settings;
    config: Config;
    messageTemplates: MessageTemplate[];
    actionGroups: ActionGroups;
    actionTriggerMap: Record<string, string | null>;
    actionTypeVariables: ActionTypeVariables;
    contacts: ContactRow[];
    accountOptions: AccountOption[];
    triggerOptions: TriggerOptions;
    testRecipients: TestRecipient[];
}) {
    const { flash } = usePage<PageProps>().props;
    const [activeTab, setActiveTab] = useState<Tab>('config');

    useEffect(() => {
        const tab = flash?.whatsapp_tab;
        if (tab && tabs.includes(tab)) {
            setActiveTab(tab);
        }
    }, [flash?.whatsapp_tab]);

    const form = useForm({
        host_url: settings.host_url,
        api_key: settings.api_key,
        session: config.session,
    });

    useEffect(() => {
        form.setData({
            host_url: settings.host_url,
            api_key: settings.api_key,
            session: config.session,
        });
    }, [settings.host_url, settings.api_key, config.session]);

    const connect = (e: FormEvent) => {
        e.preventDefault();
        form.post(route('admin.whatsapp.connect'));
    };

    return (
        <motion.div className="space-y-6">
            <motion.div className="glass-card p-6">
                <h2 className="text-xl font-black">Konfigurasi Integrasi WhatsApp</h2>
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
                            <label className="mb-1 block text-xs font-semibold text-slate-500">Waktu Status</label>
                            <div className="input flex w-full items-center bg-slate-50 text-slate-600 dark:bg-slate-900/50 dark:text-slate-300">
                                {settings.last_checked_at
                                    ? new Date(settings.last_checked_at).toLocaleString('id-ID')
                                    : '—'}
                            </div>
                        </div>
                    </div>

                    <form onSubmit={connect} className="mt-6 grid gap-4 md:grid-cols-2">
                        <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-500">Host</label>
                            <input
                                className="input w-full"
                                value={form.data.host_url}
                                onChange={(e) => form.setData('host_url', e.target.value)}
                                placeholder="https://wa.richymaju.my.id"
                                required
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-500">API Key</label>
                            <PasswordInput
                                value={form.data.api_key}
                                onChange={(value) => form.setData('api_key', value)}
                                placeholder="Masukkan API key"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="mb-1 block text-xs font-semibold text-slate-500">Session</label>
                            <input
                                className="input w-full"
                                value={form.data.session}
                                onChange={(e) => form.setData('session', e.target.value)}
                                placeholder="default"
                                required
                            />
                        </div>
                        <div className="flex flex-wrap gap-2 md:col-span-2">
                            <button type="submit" className="btn-primary" disabled={form.processing}>
                                <Link2 className="h-4 w-4" /> Connect
                            </button>
                            <a
                                href="https://wa.richymaju.my.id/dashboard"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn-muted"
                            >
                                <ExternalLink className="h-4 w-4" /> Open Config
                            </a>
                        </div>
                    </form>
                </motion.div>
            )}

            {activeTab === 'pesan' && (
                <PesanTab
                    messageTemplates={messageTemplates}
                    actionGroups={actionGroups}
                    actionTriggerMap={actionTriggerMap}
                    actionTypeVariables={actionTypeVariables}
                />
            )}

            {activeTab === 'kontak' && (
                <KontakTab
                    contacts={contacts}
                    accountOptions={accountOptions}
                    triggerOptions={triggerOptions}
                />
            )}

            <div className={activeTab === 'tes' ? undefined : 'hidden'}>
                <TesTab testRecipients={testRecipients} />
            </div>
        </motion.div>
    );
}
