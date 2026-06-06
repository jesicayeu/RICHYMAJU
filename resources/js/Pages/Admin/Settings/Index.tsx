import AppLayout from '@/Layouts/AppLayout';
import EncryptionPanel from '@/Pages/Admin/Encryption/EncryptionPanel';
import GoogleDrivePanel from '@/Pages/Admin/GoogleDrive/GoogleDrivePanel';
import WhatsAppPanel from '@/Pages/Admin/WhatsApp/WhatsAppPanel';
import { PageProps } from '@/types';
import { router, usePage } from '@inertiajs/react';
import { motion } from 'framer-motion';
import { Cloud, LockKeyhole, Phone } from 'lucide-react';
import { ComponentProps, useEffect, useState } from 'react';

const sections = ['whatsapp', 'google-drive', 'encryption'] as const;
type Section = (typeof sections)[number];

const sectionLabels: Record<Section, string> = {
    whatsapp: 'WhatsApp',
    'google-drive': 'Google Drive',
    encryption: 'Enkrip',
};

const sectionIcons: Record<Section, typeof Phone> = {
    whatsapp: Phone,
    'google-drive': Cloud,
    encryption: LockKeyhole,
};

export default function SettingsIndex({
    activeSection,
    whatsapp,
    googleDrive,
    encryption,
}: {
    activeSection: Section;
    whatsapp: ComponentProps<typeof WhatsAppPanel>;
    googleDrive: ComponentProps<typeof GoogleDrivePanel>;
    encryption: ComponentProps<typeof EncryptionPanel>;
}) {
    const { flash } = usePage<PageProps>().props;
    const [section, setSection] = useState<Section>(activeSection);

    useEffect(() => {
        setSection(activeSection);
    }, [activeSection]);

    useEffect(() => {
        const tab = flash?.settings_tab;
        if (tab && sections.includes(tab)) {
            setSection(tab);
        }
    }, [flash?.settings_tab]);

    const changeSection = (next: Section) => {
        setSection(next);
        router.get(
            route('admin.settings.index'),
            { tab: next },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    };

    return (
        <AppLayout title="Pengaturan">
            <motion.div className="space-y-6">
                <motion.div className="glass-card p-6">
                    <h2 className="text-xl font-black">Pengaturan Sistem</h2>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        Kelola integrasi WhatsApp, Google Drive, dan enkripsi data.
                    </p>
                </motion.div>

                <motion.div className="flex flex-wrap gap-2">
                    {sections.map((item) => {
                        const Icon = sectionIcons[item];

                        return (
                            <button
                                key={item}
                                type="button"
                                onClick={() => changeSection(item)}
                                className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-bold transition ${
                                    section === item
                                        ? 'bg-indigo-600 text-white shadow-md'
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                                }`}
                            >
                                <Icon className="h-4 w-4" />
                                {sectionLabels[item]}
                            </button>
                        );
                    })}
                </motion.div>

                {section === 'whatsapp' && <WhatsAppPanel {...whatsapp} />}
                {section === 'google-drive' && <GoogleDrivePanel {...googleDrive} />}
                {section === 'encryption' && <EncryptionPanel {...encryption} />}
            </motion.div>
        </AppLayout>
    );
}
