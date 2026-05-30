import ConfirmModal from '@/Components/ConfirmModal';
import { phoneToChatId } from '@/lib/whatsappChatId';
import { router, useForm } from '@inertiajs/react';
import { motion } from 'framer-motion';
import { Pencil, Plus, Save, Trash2 } from 'lucide-react';
import { FormEvent, useMemo, useState } from 'react';

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

export default function KontakTab({
    contacts,
    accountOptions,
    triggerOptions,
}: {
    contacts: ContactRow[];
    accountOptions: AccountOption[];
    triggerOptions: TriggerOptions;
}) {
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<ContactRow | null>(null);
    const [deleteProcessing, setDeleteProcessing] = useState(false);

    const form = useForm<{ user_id: string; action_keys: string[] }>({
        user_id: '',
        action_keys: [],
    });

    const selectedChatId = useMemo(() => {
        const account = accountOptions.find((a) => String(a.id) === form.data.user_id);
        return account ? phoneToChatId(account.phone) : null;
    }, [accountOptions, form.data.user_id]);

    const resetForm = () => {
        form.reset();
        form.clearErrors();
        setShowAddForm(false);
        setEditingId(null);
    };

    const openAddForm = () => {
        form.reset();
        form.clearErrors();
        setEditingId(null);
        setShowAddForm(true);
    };

    const openEditForm = (contact: ContactRow) => {
        form.setData({
            user_id: String(contact.user_id),
            action_keys: contact.action_keys,
        });
        form.clearErrors();
        setEditingId(contact.id);
        setShowAddForm(true);
    };

    const toggleActionKey = (key: string) => {
        const current = form.data.action_keys;
        if (current.includes(key)) {
            form.setData('action_keys', current.filter((k) => k !== key));
            return;
        }
        form.setData('action_keys', [...current, key]);
    };

    const submit = (e: FormEvent) => {
        e.preventDefault();

        if (editingId) {
            form.put(route('admin.whatsapp.contacts.update', editingId), {
                onSuccess: () => resetForm(),
            });
            return;
        }

        form.post(route('admin.whatsapp.contacts.store'), {
            onSuccess: () => resetForm(),
        });
    };

    const confirmDelete = () => {
        if (!deleteTarget) return;

        setDeleteProcessing(true);
        router.delete(route('admin.whatsapp.contacts.destroy', deleteTarget.id), {
            onFinish: () => {
                setDeleteProcessing(false);
                setDeleteTarget(null);
            },
        });
    };

    return (
        <>
            <motion.div className="glass-card p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="font-black">Kontak</h3>
                    {!showAddForm && (
                        <button type="button" className="btn-primary" onClick={openAddForm}>
                            <Plus className="h-4 w-4" /> Tambah Kontak
                        </button>
                    )}
                </div>

                {showAddForm && (
                    <form onSubmit={submit} className="mt-6 space-y-4 rounded-2xl border border-slate-100 p-4 dark:border-slate-800">
                        <p className="text-sm font-bold text-slate-600 dark:text-slate-300">
                            {editingId ? 'Ubah Kontak' : 'Tambah Kontak'}
                        </p>
                        <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-500">Nomor HP</label>
                            <select
                                className="input w-full"
                                value={form.data.user_id}
                                onChange={(e) => form.setData('user_id', e.target.value)}
                                required
                            >
                                <option value="">— Pilih nomor HP dari Kelola Akun —</option>
                                {accountOptions.map((account) => (
                                    <option key={account.id} value={account.id}>
                                        {account.label}
                                    </option>
                                ))}
                            </select>
                            {form.errors.user_id && <p className="mt-1 text-xs text-rose-500">{form.errors.user_id}</p>}
                            {selectedChatId && (
                                <p className="mt-2 text-xs text-slate-500">Chat ID: {selectedChatId}</p>
                            )}
                        </div>

                        <div>
                            <label className="mb-2 block text-xs font-semibold text-slate-500">Form Diterima</label>
                            <div className="grid gap-2 sm:grid-cols-2">
                                {Object.entries(triggerOptions).map(([key, label]) => (
                                    <label
                                        key={key}
                                        className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-100 p-3 text-sm dark:border-slate-800"
                                    >
                                        <input
                                            type="checkbox"
                                            className="mt-0.5 rounded border-slate-300"
                                            checked={form.data.action_keys.includes(key)}
                                            onChange={() => toggleActionKey(key)}
                                        />
                                        <span>{label}</span>
                                    </label>
                                ))}
                            </div>
                            {form.errors.action_keys && (
                                <p className="mt-1 text-xs text-rose-500">{form.errors.action_keys}</p>
                            )}
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <button type="submit" className="btn-primary" disabled={form.processing}>
                                <Save className="h-4 w-4" /> Simpan
                            </button>
                            <button type="button" className="btn-muted" onClick={resetForm} disabled={form.processing}>
                                Batal
                            </button>
                        </div>
                    </form>
                )}

                <div className={`overflow-x-auto ${showAddForm ? 'mt-6' : 'mt-6'}`}>
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 text-left dark:bg-slate-900">
                            <tr>
                                <th className="p-3">Nama</th>
                                <th className="p-3">No. HP</th>
                                <th className="p-3">Form Diterima</th>
                                <th className="p-3">Chat ID</th>
                                <th className="p-3 text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {contacts.map((contact) => (
                                <tr key={contact.id} className="border-t border-slate-100 dark:border-slate-800">
                                    <td className="p-3 font-bold">{contact.name}</td>
                                    <td className="p-3 font-mono text-xs">{contact.phone}</td>
                                    <td className="max-w-xs p-3 text-slate-600 dark:text-slate-300">{contact.forms_received}</td>
                                    <td className="p-3 font-mono text-xs">{contact.chat_id}</td>
                                    <td className="p-3">
                                        <div className="flex justify-end gap-2">
                                            <button
                                                type="button"
                                                className="btn-muted !p-2"
                                                title="Ubah"
                                                onClick={() => openEditForm(contact)}
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </button>
                                            <button
                                                type="button"
                                                className="btn-muted !p-2 text-rose-600"
                                                title="Hapus"
                                                onClick={() => setDeleteTarget(contact)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {contacts.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-slate-400">
                                        Belum ada kontak. Klik &quot;Tambah Kontak&quot; untuk menambahkan.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </motion.div>

            <ConfirmModal
                show={deleteTarget !== null}
                title="Hapus Kontak"
                message={
                    deleteTarget
                        ? `Yakin ingin menghapus kontak "${deleteTarget.name}"? Tindakan ini tidak dapat dibatalkan.`
                        : ''
                }
                onClose={() => !deleteProcessing && setDeleteTarget(null)}
                onConfirm={confirmDelete}
                processing={deleteProcessing}
            />
        </>
    );
}
