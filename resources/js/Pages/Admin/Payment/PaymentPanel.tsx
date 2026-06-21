import InputError from '@/Components/InputError';
import { PageProps } from '@/types';
import { useForm, usePage } from '@inertiajs/react';
import { motion } from 'framer-motion';
import { CreditCard, Save } from 'lucide-react';
import { FormEvent } from 'react';

type PaymentSettings = {
    merchant_name: string;
    merchant_id: string;
    provider_name: string;
    static_qris_payload: string;
    configured: boolean;
};

export default function PaymentPanel({
    merchant_name,
    merchant_id,
    provider_name,
    static_qris_payload,
    configured,
}: PaymentSettings) {
    const { errors } = usePage<PageProps>().props as PageProps & { errors: Record<string, string> };
    const { data, setData, post, processing } = useForm({
        merchant_name: merchant_name ?? '',
        merchant_id: merchant_id ?? '',
        provider_name: provider_name ?? '',
        static_qris_payload: static_qris_payload ?? '',
    });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        post(route('admin.settings.payment'), { preserveScroll: true });
    };

    return (
        <motion.div className="glass-card space-y-5 p-6">
            <div className="flex items-start gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-indigo-600 text-white">
                    <CreditCard className="h-5 w-5" />
                </div>
                <div>
                    <h3 className="text-lg font-black">Pembayaran QRIS</h3>
                    <p className="text-sm text-slate-500">
                        Satu QRIS merchant untuk semua aplikasi pembayaran (Dana, GoPay, OVO, mobile banking, dll).
                    </p>
                    {configured && (
                        <p className="mt-1 text-xs font-semibold text-emerald-600">QRIS sudah aktif.</p>
                    )}
                </div>
            </div>

            <form onSubmit={submit} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                    <label>
                        <span className="mb-2 block text-sm font-bold">Nama Merchant</span>
                        <input
                            className="input"
                            placeholder="Contoh: TOKO RICHY MAJU, GROSIR"
                            value={data.merchant_name}
                            onChange={(e) => setData('merchant_name', e.target.value)}
                        />
                        <InputError message={errors.merchant_name} />
                    </label>
                    <label>
                        <span className="mb-2 block text-sm font-bold">NMID / ID Merchant</span>
                        <input
                            className="input font-mono"
                            placeholder="Contoh: ID1026534716224"
                            value={data.merchant_id}
                            onChange={(e) => setData('merchant_id', e.target.value)}
                        />
                        <InputError message={errors.merchant_id} />
                    </label>
                </div>

                <label>
                    <span className="mb-2 block text-sm font-bold">Penyelenggara (opsional)</span>
                    <input
                        className="input"
                        placeholder="Contoh: GoPay QRIS, BCA QRIS"
                        value={data.provider_name}
                        onChange={(e) => setData('provider_name', e.target.value)}
                    />
                    <InputError message={errors.provider_name} />
                </label>

                <label>
                    <span className="mb-2 block text-sm font-bold">Payload QRIS Statis</span>
                    <textarea
                        className="input min-h-28 font-mono text-xs"
                        placeholder="Tempel string QRIS statis dari poster merchant / aplikasi QRIS Anda"
                        value={data.static_qris_payload}
                        onChange={(e) => setData('static_qris_payload', e.target.value)}
                    />
                    <InputError message={errors.static_qris_payload} />
                    <p className="mt-2 text-xs text-slate-500">
                        Salin string QRIS dari poster merchant Anda. Sistem akan otomatis mengubahnya menjadi QRIS
                        dinamis sesuai nominal penjualan di kasir.
                    </p>
                </label>

                <button type="submit" disabled={processing} className="btn-primary">
                    <Save className="h-4 w-4" /> Simpan Pengaturan QRIS
                </button>
            </form>
        </motion.div>
    );
}
