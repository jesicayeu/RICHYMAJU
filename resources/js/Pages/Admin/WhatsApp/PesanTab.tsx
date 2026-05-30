import ConfirmModal from '@/Components/ConfirmModal';
import { router, useForm } from '@inertiajs/react';
import { motion } from 'framer-motion';
import { Pencil, Plus, Save, Trash2 } from 'lucide-react';
import { FormEvent, useMemo, useState } from 'react';

type MessageTemplate = {
    id: number;
    title: string;
    action_key: string;
    action_label: string;
    body: string;
};

type ActionGroups = Record<string, Record<string, string>>;
type ActionTypeVariables = Record<string, Record<string, string>>;

function parseActionType(actionKey: string): string | null {
    const match = actionKey.match(/^user_\d+_(.+)$/);
    return match ? match[1] : null;
}

export default function PesanTab({
    messageTemplates,
    actionGroups,
    actionTypeVariables,
}: {
    messageTemplates: MessageTemplate[];
    actionGroups: ActionGroups;
    actionTypeVariables: ActionTypeVariables;
}) {
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<MessageTemplate | null>(null);
    const [deleteProcessing, setDeleteProcessing] = useState(false);

    const form = useForm({
        title: '',
        action_key: '',
        body: '',
    });

    const selectedActionType = useMemo(
        () => (form.data.action_key ? parseActionType(form.data.action_key) : null),
        [form.data.action_key],
    );

    const availableVariables = useMemo(() => {
        if (!selectedActionType || !actionTypeVariables[selectedActionType]) {
            return [];
        }

        return Object.entries(actionTypeVariables[selectedActionType]);
    }, [selectedActionType, actionTypeVariables]);

    const insertVariable = (varName: string) => {
        const token = `{${varName}}`;
        const current = form.data.body;
        form.setData('body', current ? `${current} ${token}` : token);
    };

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

    const openEditForm = (template: MessageTemplate) => {
        form.setData({
            title: template.title,
            action_key: template.action_key,
            body: template.body,
        });
        form.clearErrors();
        setEditingId(template.id);
        setShowAddForm(true);
    };

    const submit = (e: FormEvent) => {
        e.preventDefault();

        if (editingId) {
            form.put(route('admin.whatsapp.message-templates.update', editingId), {
                onSuccess: () => resetForm(),
            });
            return;
        }

        form.post(route('admin.whatsapp.message-templates.store'), {
            onSuccess: () => resetForm(),
        });
    };

    const confirmDelete = () => {
        if (!deleteTarget) return;

        setDeleteProcessing(true);
        router.delete(route('admin.whatsapp.message-templates.destroy', deleteTarget.id), {
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
                    <h3 className="font-black">Pesan</h3>
                    {!showAddForm && (
                        <button type="button" className="btn-primary" onClick={openAddForm}>
                            <Plus className="h-4 w-4" /> Tambah Pesan
                        </button>
                    )}
                </div>

                {showAddForm && (
                    <form onSubmit={submit} className="mt-6 space-y-4 rounded-2xl border border-slate-100 p-4 dark:border-slate-800">
                        <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-500">Judul Pesan</label>
                            <input
                                className="input w-full"
                                value={form.data.title}
                                onChange={(e) => form.setData('title', e.target.value)}
                                placeholder="Contoh: Notifikasi chat pesan kasir ke pemilik"
                                required
                            />
                            {form.errors.title && <p className="mt-1 text-xs text-rose-500">{form.errors.title}</p>}
                        </div>

                        <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-500">Tombol Pemicu</label>
                            <select
                                className="input w-full"
                                value={form.data.action_key}
                                onChange={(e) => form.setData('action_key', e.target.value)}
                                required
                            >
                                <option value="">— Pilih tombol pemicu —</option>
                                {Object.entries(actionGroups).map(([group, options]) => (
                                    <optgroup key={group} label={group}>
                                        {Object.entries(options).map(([value, label]) => (
                                            <option key={value} value={value}>
                                                {label}
                                            </option>
                                        ))}
                                    </optgroup>
                                ))}
                            </select>
                            {form.errors.action_key && (
                                <p className="mt-1 text-xs text-rose-500">{form.errors.action_key}</p>
                            )}
                        </div>

                        {availableVariables.length > 0 && (
                            <div>
                                <label className="mb-2 block text-xs font-semibold text-slate-500">
                                    Variabel Pesan (klik untuk sisipkan)
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {availableVariables.map(([varName, label]) => (
                                        <button
                                            key={varName}
                                            type="button"
                                            className="rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-indigo-100 hover:text-indigo-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-indigo-900/40 dark:hover:text-indigo-300"
                                            onClick={() => insertVariable(varName)}
                                            title={label}
                                        >
                                            {'{'}{varName}{'}'}
                                        </button>
                                    ))}
                                </div>
                                <p className="mt-2 text-xs text-slate-400">
                                    Variabel diambil dari semua input pada halaman terkait tombol pemicu yang dipilih.
                                </p>
                            </div>
                        )}

                        <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-500">Isi Pesan</label>
                            <textarea
                                className="input min-h-[120px] w-full text-sm"
                                value={form.data.body}
                                onChange={(e) => form.setData('body', e.target.value)}
                                placeholder="Contoh: Halo pemilik toko ada pesan masuk dari kasir dengan isi pesan {message}"
                            />
                            {form.errors.body && <p className="mt-1 text-xs text-rose-500">{form.errors.body}</p>}
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

                {!showAddForm && messageTemplates.length === 0 && (
                    <p className="mt-6 rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-400 dark:border-slate-700">
                        Belum ada pesan. Klik &quot;Tambah Pesan&quot; untuk membuat.
                    </p>
                )}

                {messageTemplates.length > 0 && (
                    <div className="mt-6 overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 text-left dark:bg-slate-900">
                                <tr>
                                    <th className="p-3">Judul</th>
                                    <th className="p-3">Tombol Pemicu</th>
                                    <th className="p-3">Isi Pesan</th>
                                    <th className="p-3 text-right">Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {messageTemplates.map((template) => (
                                    <tr key={template.id} className="border-t border-slate-100 dark:border-slate-800">
                                        <td className="p-3 font-bold">{template.title}</td>
                                        <td className="p-3 text-slate-600 dark:text-slate-300">{template.action_label}</td>
                                        <td className="max-w-xs truncate p-3 text-slate-500">{template.body || '—'}</td>
                                        <td className="p-3">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    type="button"
                                                    className="btn-muted !p-2"
                                                    title="Ubah"
                                                    onClick={() => openEditForm(template)}
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </button>
                                                <button
                                                    type="button"
                                                    className="btn-muted !p-2 text-rose-600"
                                                    title="Hapus"
                                                    onClick={() => setDeleteTarget(template)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </motion.div>

            <ConfirmModal
                show={deleteTarget !== null}
                title="Hapus Pesan"
                message={
                    deleteTarget
                        ? `Yakin ingin menghapus pesan "${deleteTarget.title}"? Tindakan ini tidak dapat dibatalkan.`
                        : ''
                }
                onClose={() => !deleteProcessing && setDeleteTarget(null)}
                onConfirm={confirmDelete}
                processing={deleteProcessing}
            />
        </>
    );
}
