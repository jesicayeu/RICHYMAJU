import { motion } from 'framer-motion';
import axios, { isAxiosError } from 'axios';
import { CheckCircle2, Send, XCircle } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { toast } from 'sonner';

type TestRecipient = {
    id: number;
    label: string;
    phone: string;
    chat_id: string;
};

type StatusAlert = {
    type: 'success' | 'error';
    message: string;
};

function extractErrorMessage(error: unknown): string {
    if (isAxiosError(error)) {
        const status = error.response?.status;
        const data = error.response?.data as
            | { message?: string; errors?: Record<string, string[]> }
            | undefined;

        if (data?.message) {
            return data.message;
        }

        if (data?.errors) {
            const first = Object.values(data.errors)[0]?.[0];
            if (first) {
                return first;
            }
        }

        if (status === 404) {
            return 'Layanan kirim pesan tidak ditemukan. Muat ulang halaman (Ctrl+Shift+R).';
        }

        if (status === 419) {
            return 'Sesi habis. Muat ulang halaman lalu coba lagi.';
        }

        if (status === 401 || status === 403) {
            return 'Tidak memiliki akses. Login ulang sebagai admin.';
        }

        if (!error.response) {
            return 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.';
        }
    }

    return 'Gagal kirim pesan. Coba lagi.';
}

export default function TesTab({ testRecipients }: { testRecipients: TestRecipient[] }) {
    const [contactId, setContactId] = useState('');
    const [message, setMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [statusAlert, setStatusAlert] = useState<StatusAlert | null>(null);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

    const submit = async (e: FormEvent) => {
        e.preventDefault();
        setStatusAlert(null);
        setFieldErrors({});
        setSending(true);

        try {
            const { data } = await axios.post<{ ok: boolean; message: string; chat_id?: string }>(
                route('admin.whatsapp.test-send'),
                {
                    contact_id: Number(contactId),
                    message,
                },
                {
                    headers: {
                        Accept: 'application/json',
                        'Content-Type': 'application/json',
                    },
                },
            );

            const alert: StatusAlert = { type: 'success', message: data.message };
            setStatusAlert(alert);
            toast.success(data.message);
            setMessage('');
        } catch (error) {
            const errorMessage = extractErrorMessage(error);
            const alert: StatusAlert = { type: 'error', message: errorMessage };
            setStatusAlert(alert);
            toast.error(errorMessage);

            if (isAxiosError(error) && error.response?.status === 422) {
                const errors = (error.response.data as { errors?: Record<string, string[]> })?.errors;
                if (errors) {
                    const mapped: Record<string, string> = {};
                    for (const [key, messages] of Object.entries(errors)) {
                        if (messages[0]) {
                            mapped[key] = messages[0];
                        }
                    }
                    setFieldErrors(mapped);
                }
            }
        } finally {
            setSending(false);
        }
    };

    return (
        <motion.div className="glass-card p-6">
            <h3 className="font-black">Tes Kirim Pesan</h3>

            {statusAlert && (
                <div
                    className={`mt-4 flex items-start gap-3 rounded-2xl px-4 py-3 text-sm ${
                        statusAlert.type === 'success'
                            ? 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-200'
                            : 'bg-rose-500/10 text-rose-800 dark:text-rose-200'
                    }`}
                    role="alert"
                >
                    {statusAlert.type === 'success' ? (
                        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
                    ) : (
                        <XCircle className="mt-0.5 h-5 w-5 shrink-0" />
                    )}
                    <p className="font-semibold">{statusAlert.message}</p>
                </div>
            )}

            {testRecipients.length === 0 ? (
                <p className="mt-6 rounded-2xl bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
                    Belum ada kontak. Tambahkan kontak di tab Kontak terlebih dahulu.
                </p>
            ) : (
                <form onSubmit={submit} className="mt-6 grid gap-4">
                    <div>
                        <label className="mb-1 block text-xs font-semibold text-slate-500">Nomor HP</label>
                        <select
                            className="input w-full"
                            value={contactId}
                            onChange={(e) => setContactId(e.target.value)}
                            required
                            disabled={sending}
                        >
                            <option value="">Pilih nomor HP</option>
                            {testRecipients.map((recipient) => (
                                <option key={recipient.id} value={recipient.id}>
                                    {recipient.label}
                                </option>
                            ))}
                        </select>
                        {fieldErrors.contact_id && (
                            <p className="mt-1 text-xs text-rose-600">{fieldErrors.contact_id}</p>
                        )}
                    </div>

                    <div>
                        <label className="mb-1 block text-xs font-semibold text-slate-500">Isi pesan</label>
                        <textarea
                            className="input min-h-[140px] w-full resize-y"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Tulis pesan tes..."
                            required
                            maxLength={5000}
                            disabled={sending}
                        />
                        {fieldErrors.message && (
                            <p className="mt-1 text-xs text-rose-600">{fieldErrors.message}</p>
                        )}
                    </div>

                    <div>
                        <button type="submit" className="btn-primary" disabled={sending}>
                            <Send className="h-4 w-4" />
                            {sending ? 'Mengirim...' : 'Kirim pesan'}
                        </button>
                    </div>
                </form>
            )}
        </motion.div>
    );
}
