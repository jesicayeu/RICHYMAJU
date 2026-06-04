import InputError from '@/Components/InputError';
import PasswordInput from '@/Components/PasswordInput';
import { useForm } from '@inertiajs/react';
import { Save } from 'lucide-react';
import { FormEvent, useEffect } from 'react';

type KeySettings = {
    text_key: string;
    key_type: string;
    configured?: boolean;
};

type KeyTypeOptions = Record<string, string>;

export default function TextTab({
    settings,
    keyTypes,
}: {
    settings: KeySettings;
    keyTypes: KeyTypeOptions;
}) {
    const form = useForm({
        text_key: settings.text_key,
        key_type: settings.key_type,
    });

    useEffect(() => {
        form.setData({
            text_key: settings.text_key,
            key_type: settings.key_type,
        });
    }, [settings.text_key, settings.key_type]);

    const submit = (e: FormEvent) => {
        e.preventDefault();
        form.post(route('admin.encryption.text'), {
            preserveScroll: true,
        });
    };

    return (
        <form onSubmit={submit} className="glass-card space-y-4 p-6">
            <h3 className="font-black">Enkrip Text</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
                Kunci AES ini dipakai untuk mengunci data teks: keterangan transaksi, catatan stok, nama pihak/barang utang, isi chat, dan riwayat audit.
            </p>
            {settings.configured ? (
                <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    Kunci teks sudah dikonfigurasi.
                </p>
            ) : (
                <p className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                    Kunci teks belum dikonfigurasi.
                </p>
            )}

            <label>
                <span className="mb-1 block text-xs font-semibold text-slate-500">Kunci Teks</span>
                <PasswordInput
                    value={form.data.text_key}
                    onChange={(value) => form.setData('text_key', value)}
                    placeholder="Masukkan kunci enkripsi teks"
                />
                <InputError message={form.errors.text_key} />
            </label>

            <label>
                <span className="mb-1 block text-xs font-semibold text-slate-500">Jenis Kunci Teks</span>
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
                <Save className="h-4 w-4" /> Simpan Kunci Teks
            </button>
        </form>
    );
}
