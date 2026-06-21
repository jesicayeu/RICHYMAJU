import { useLockBodyScroll } from '@/hooks/useLockBodyScroll';
import { rupiah } from '@/lib/format';
import { router } from '@inertiajs/react';
import QRCode from 'react-qr-code';
import { CheckCircle2, Copy, X } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

type PaymentInfo = {
    merchant_name?: string | null;
    merchant_id?: string | null;
    provider_name?: string | null;
    has_qris?: boolean;
};

type PaymentQrDialogProps = {
    saleId: number;
    saleCode: string;
    paymentQrPayload?: string | null;
    paymentQrError?: string | null;
    amount: number;
    paymentInfo?: PaymentInfo;
    onClose: () => void;
    onConfirmed: () => void;
};

function csrfToken(): string {
    return document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ?? '';
}

export default function PaymentQrDialog({
    saleId,
    saleCode,
    paymentQrPayload,
    paymentQrError,
    amount,
    paymentInfo,
    onClose,
    onConfirmed,
}: PaymentQrDialogProps) {
    const [confirming, setConfirming] = useState(false);

    useLockBodyScroll();

    const copyMerchantId = async () => {
        if (!paymentInfo?.merchant_id) return;
        await navigator.clipboard.writeText(paymentInfo.merchant_id);
        toast.success('ID merchant disalin.');
    };

    const confirmPayment = async () => {
        setConfirming(true);
        try {
            const response = await fetch(route('sales.confirm-payment', saleId), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-CSRF-TOKEN': csrfToken(),
                },
                body: JSON.stringify({ confirm_manual: true }),
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                toast.error(data.message ?? 'Gagal mengonfirmasi pembayaran.');
                return;
            }

            toast.success(data.message);
            onConfirmed();
        } catch {
            toast.error('Gagal mengonfirmasi pembayaran.');
        } finally {
            setConfirming(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center overflow-hidden bg-slate-900/60 p-4 backdrop-blur-sm">
            <div className="glass-card max-h-[90vh] w-full max-w-md overflow-y-auto p-6">
                <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                        <h3 className="text-xl font-black">Bayar via QRIS</h3>
                        <p className="text-sm text-slate-500">Scan QR — pembayaran masuk ke merchant toko</p>
                    </div>
                    <button type="button" onClick={onClose} className="btn-muted !rounded-full !p-2">
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {paymentQrPayload ? (
                    <div className="mx-auto mb-4 grid w-fit place-items-center rounded-2xl bg-white p-4 shadow-inner">
                        <QRCode value={paymentQrPayload} size={220} />
                    </div>
                ) : (
                    <div className="mb-4 rounded-2xl border border-dashed border-amber-300 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
                        {paymentQrError ??
                            'QRIS belum dikonfigurasi. Minta pelanggan transfer manual ke merchant di bawah.'}
                    </div>
                )}

                <div className="mb-4 rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/50">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Merchant tujuan</p>
                    <p className="mt-1 font-bold">{paymentInfo?.merchant_name || '-'}</p>
                    {paymentInfo?.provider_name && (
                        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{paymentInfo.provider_name}</p>
                    )}
                    <div className="mt-2 flex items-center justify-between gap-2">
                        <p className="font-mono text-lg font-black">{paymentInfo?.merchant_id || '-'}</p>
                        {paymentInfo?.merchant_id && (
                            <button type="button" onClick={copyMerchantId} className="btn-muted !p-2" title="Salin ID merchant">
                                <Copy className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                </div>

                <div className="mb-4 space-y-1 text-center">
                    <p className="text-sm text-slate-500">Total bayar</p>
                    <p className="text-2xl font-black tabular-nums">{rupiah(amount)}</p>
                    <p className="font-mono text-xs text-slate-500">Ref: {saleCode}</p>
                </div>

                <button
                    type="button"
                    onClick={confirmPayment}
                    disabled={confirming}
                    className="btn-primary w-full"
                >
                    <CheckCircle2 className="h-4 w-4" />
                    {confirming ? 'Memproses...' : 'Konfirmasi Transfer Diterima'}
                </button>

                <button
                    type="button"
                    onClick={() => router.visit(route('sales.show', saleId))}
                    className="btn-muted mt-3 w-full"
                >
                    Lihat Detail Penjualan
                </button>
            </div>
        </div>
    );
}
