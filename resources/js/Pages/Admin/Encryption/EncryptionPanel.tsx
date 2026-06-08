import FileTab from '@/Pages/Admin/Encryption/FileTab';
import TextTab from '@/Pages/Admin/Encryption/TextTab';
import { PageProps } from '@/types';
import { usePage } from '@inertiajs/react';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

type TextSettings = {
    text_key: string;
    key_type: string;
    configured?: boolean;
};

type FileSettings = {
    file_key: string;
    key_type: string;
    configured?: boolean;
};

type KeyTypeOptions = Record<string, string>;

const tabs = ['text', 'file'] as const;
type Tab = (typeof tabs)[number];

const tabLabels: Record<Tab, string> = {
    text: 'Enkrip Text',
    file: 'Enkrip File',
};

export default function EncryptionPanel({
    textSettings,
    fileSettings,
    keyTypes,
}: {
    textSettings: TextSettings;
    fileSettings: FileSettings;
    keyTypes: KeyTypeOptions;
}) {
    const { flash } = usePage<PageProps>().props;
    const [activeTab, setActiveTab] = useState<Tab>('text');

    useEffect(() => {
        if (flash?.encryption_tab === 'text' || flash?.encryption_tab === 'file') {
            setActiveTab(flash.encryption_tab);
        }
    }, [flash?.encryption_tab]);

    return (
        <motion.div className="space-y-6">
            <motion.div className="glass-card p-6">
                <h2 className="text-xl font-black">Konfigurasi Enkripsi</h2>
                <div className="mt-4 flex flex-wrap gap-2">
                    <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${
                            textSettings.configured
                                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                                : 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                        }`}
                    >
                        Kunci teks: {textSettings.configured ? 'sudah dikonfigurasi' : 'belum dikonfigurasi'}
                    </span>
                    <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${
                            fileSettings.configured
                                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                                : 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                        }`}
                    >
                        Kunci file: {fileSettings.configured ? 'sudah dikonfigurasi' : 'belum dikonfigurasi'}
                    </span>
                </div>
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

            {activeTab === 'text' ? (
                <TextTab
                    key={`text-${textSettings.key_type}-${textSettings.configured ? '1' : '0'}`}
                    settings={textSettings}
                    keyTypes={keyTypes}
                />
            ) : null}
            {activeTab === 'file' ? (
                <FileTab
                    key={`file-${fileSettings.key_type}-${fileSettings.configured ? '1' : '0'}`}
                    settings={fileSettings}
                    keyTypes={keyTypes}
                />
            ) : null}
        </motion.div>
    );
}
