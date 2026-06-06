import FileTab from '@/Pages/Admin/Encryption/FileTab';
import TextTab from '@/Pages/Admin/Encryption/TextTab';
import { PageProps } from '@/types';
import { router, usePage } from '@inertiajs/react';
import { motion } from 'framer-motion';
import { Database } from 'lucide-react';
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
    const [reencrypting, setReencrypting] = useState(false);

    const reencryptAll = () => {
        if (
            !confirm(
                'Enkripsi ulang seluruh data database dan file dengan kunci saat ini? Proses ini dapat memakan waktu.',
            )
        ) {
            return;
        }

        setReencrypting(true);
        router.post(route('admin.encryption.reencrypt-all'), {}, {
            preserveScroll: true,
            onFinish: () => setReencrypting(false),
        });
    };

    useEffect(() => {
        if (flash?.encryption_tab === 'text' || flash?.encryption_tab === 'file') {
            setActiveTab(flash.encryption_tab);
        }
    }, [flash?.encryption_tab]);

    return (
        <motion.div className="space-y-6">
            <motion.div className="glass-card p-6">
                <h2 className="text-xl font-black">Konfigurasi Enkripsi</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Kelola kunci AES terpisah untuk enkripsi data teks dan file gambar. Data terbaca normal di aplikasi, tersimpan terenkripsi di database dan Google Drive.
                </p>
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

                <div className="mt-6 border-t border-slate-200 pt-6 dark:border-slate-700">
                    <h3 className="font-bold">Perbaikan Path Gambar</h3>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        Jika gambar tidak tampil setelah mengubah kunci teks, jalankan perbaikan ini (path file tidak lagi memakai kunci teks). Jika gagal, sementara kembalikan kunci teks lama, jalankan perbaikan, lalu ganti kunci teks baru dan enkripsi ulang data teks.
                    </p>
                    <button
                        type="button"
                        onClick={() => {
                            if (!confirm('Perbaiki path gambar di database?')) {
                                return;
                            }
                            router.post(route('admin.encryption.migrate-storage-paths'), {}, { preserveScroll: true });
                        }}
                        className="btn-muted mt-4"
                    >
                        Perbaiki Path Gambar
                    </button>
                </div>

                <div className="mt-6 border-t border-slate-200 pt-6 dark:border-slate-700">
                    <h3 className="font-bold">Enkripsi Ulang Database</h3>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        Terapkan kunci teks dan file saat ini ke seluruh data yang tersimpan (transaksi, utang, stok, chat, profil, audit, WhatsApp, dan file lampiran).
                    </p>
                    <button
                        type="button"
                        onClick={reencryptAll}
                        disabled={reencrypting || !textSettings.configured || !fileSettings.configured}
                        className="btn-primary mt-4"
                    >
                        <Database className="h-4 w-4" />
                        {reencrypting ? 'Memproses...' : 'Enkripsi Ulang Semua Data'}
                    </button>
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
