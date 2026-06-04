import InputError from '@/Components/InputError';
import PasswordInput from '@/Components/PasswordInput';
import { useForm } from '@inertiajs/react';
import { Save } from 'lucide-react';
import { FormEvent, useEffect } from 'react';

type KeySettings = {
    file_key: string;
    key_type: string;
    configured?: boolean;
};

type KeyTypeOptions = Record<string, string>;

export default function FileTab({
    settings,
    keyTypes,
}: {
    settings: KeySettings;
    keyTypes: KeyTypeOptions;
}) {
    const form = useForm({
        file_key: settings.file_key,
        key_type: settings.key_type,
    });

    useEffect(() => {
        form.setData({
            file_key: settings.file_key,
            key_type: settings.key_type,
        });
    }, [settings.file_key, settings.key_type]);

    const submit = (e: FormEvent) => {
        e.preventDefault();
        form.post(route('admin.encryption.file'), {
            preserveScroll: true,
        });
    };

    return (
        <form onSubmit={submit} className="glass-card space-y-4 p-6">
            <h3 className="font-black">Enkrip File</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
                Kunci AES ini dipakai untuk mengunci file gambar/lampiran sebelum disimpan ke Google Drive (transaksi, utang, chat, profil).
            </p>
            {settings.configured ? (
                <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    Kunci file sudah dikonfigurasi.
                </p>
            ) : (
                <p className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                    Kunci file belum dikonfigurasi.
                </p>
            )}

            <label>
                <span className="mb-1 block text-xs font-semibold text-slate-500">Kunci File</span>
                <PasswordInput
                    value={form.data.file_key}
                    onChange={(value) => form.setData('file_key', value)}
                    placeholder="Masukkan kunci enkripsi file"
                />
                <InputError message={form.errors.file_key} />
            </label>

            <label>
                <span className="mb-1 block text-xs font-semibold text-slate-500">Jenis Kunci File</span>
                <select
                    className="input w-full"
                    value={form.data.key_type}
                    onChange={(e) => form.setData('key_type', e.target.value)}
                >
                    {Object.entries(keyTypes).map(([value, label]) => (
                        <option key={value} value={value}>
                            {label}
                        </option>
                    ))}
                </select>
                <InputError message={form.errors.key_type} />
            </label>

            <button type="submit" className="btn-primary" disabled={form.processing}>
                <Save className="h-4 w-4" /> Simpan Kunci File
            </button>
        </form>
    );
}
