import InputError from '@/Components/InputError';
import { useForm } from '@inertiajs/react';
import { ExternalLink, Save } from 'lucide-react';
import { FormEvent, useEffect } from 'react';

type FolderModule = 'transactions' | 'stocks' | 'debts' | 'chat' | 'profile';

type Folders = {
    transactions: string;
    stocks: string;
    debts: string;
    chat: string;
    profile: string;
};

function folderBrowseUrl(module: FolderModule): string {
    return route('admin.google-drive.folders.browse', { module });
}

function FolderIdField({
    label,
    module,
    value,
    onChange,
    placeholder,
    error,
}: {
    label: string;
    module: FolderModule;
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
    error?: string;
}) {
    const folderId = value.trim();
    const canOpen = folderId.length > 0;

    return (
        <label>
            <span className="mb-1 block text-xs font-semibold text-slate-500">{label}</span>
            <div className="flex gap-2">
                <input
                    className="input min-w-0 flex-1"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    required
                />
                <a
                    href={canOpen ? folderBrowseUrl(module) : undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={canOpen ? `Buka ${label} dengan file terdekripsi` : `${label} belum diisi`}
                    className={`btn-muted grid h-[42px] w-[42px] shrink-0 place-items-center !rounded-2xl !p-0 ${
                        canOpen ? '' : 'pointer-events-none opacity-40'
                    }`}
                    tabIndex={canOpen ? 0 : -1}
                >
                    <ExternalLink className="h-4 w-4" />
                </a>
            </div>
            <InputError message={error} />
        </label>
    );
}

export default function FolderTab({ folders }: { folders: Folders }) {
    const form = useForm({
        folder_transactions: folders.transactions,
        folder_stocks: folders.stocks,
        folder_debts: folders.debts,
        folder_chat: folders.chat,
        folder_profile: folders.profile,
    });

    useEffect(() => {
        form.setData({
            folder_transactions: folders.transactions,
            folder_stocks: folders.stocks,
            folder_debts: folders.debts,
            folder_chat: folders.chat,
            folder_profile: folders.profile,
        });
    }, [folders.transactions, folders.stocks, folders.debts, folders.chat, folders.profile]);

    const submit = (e: FormEvent) => {
        e.preventDefault();
        form.post(route('admin.google-drive.folders'));
    };

    return (
        <form onSubmit={submit} className="glass-card space-y-4 p-6">
            <h3 className="font-black">Folder</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
                Masukkan ID folder Google Drive untuk setiap modul. File upload akan disimpan terenkripsi ke folder
                yang sesuai. Klik ikon link di samping input untuk membuka pratinjau file terdekripsi dari Google
                Drive lewat aplikasi web. Jika folder atau file dibuka langsung di Google Drive, isinya tetap
                terenkripsi. Pastikan klik Simpan jika ID folder baru diubah.
            </p>

            <FolderIdField
                label="ID Folder Transaksi"
                module="transactions"
                value={form.data.folder_transactions}
                onChange={(v) => form.setData('folder_transactions', v)}
                placeholder="1kW5Yx9PqlW89rflyHNUb8mbFT1saetwD"
                error={form.errors.folder_transactions}
            />

            <FolderIdField
                label="ID Folder Stok Barang"
                module="stocks"
                value={form.data.folder_stocks}
                onChange={(v) => form.setData('folder_stocks', v)}
                placeholder="1XOsiByHFDqgxpMQLvKyxTPN94NeVBsX4"
                error={form.errors.folder_stocks}
            />

            <FolderIdField
                label="ID Folder Utang"
                module="debts"
                value={form.data.folder_debts}
                onChange={(v) => form.setData('folder_debts', v)}
                placeholder="10MoyTWS9qzCnEH0_Cf0HTm2sHEsHr2hy"
                error={form.errors.folder_debts}
            />

            <FolderIdField
                label="ID Folder Chat"
                module="chat"
                value={form.data.folder_chat}
                onChange={(v) => form.setData('folder_chat', v)}
                placeholder="1rg9s8c3fWOCN7XchB-5vSpQHhEsgWcr2"
                error={form.errors.folder_chat}
            />

            <FolderIdField
                label="ID Folder Profil"
                module="profile"
                value={form.data.folder_profile}
                onChange={(v) => form.setData('folder_profile', v)}
                placeholder="Masukkan ID folder Google Drive untuk foto profil"
                error={form.errors.folder_profile}
            />

            <button type="submit" className="btn-primary" disabled={form.processing}>
                <Save className="h-4 w-4" /> Simpan
            </button>
        </form>
    );
}
