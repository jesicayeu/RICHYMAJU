import { dateTime, formatQuantity, humanSalePaymentMethod, rupiah, userDisplayName } from '@/lib/format';
import { usePage } from '@inertiajs/react';
import { CheckCircle2, Printer, X } from 'lucide-react';
import { useCallback } from 'react';
import type { PageProps } from '@/types';

export type ReceiptSale = {
    id: number;
    code: string;
    notes?: string | null;
    total_amount: number;
    cash_paid_amount?: number | null;
    change_amount?: number | null;
    payment_method: string;
    payment_status: string;
    occurred_at: string;
    paid_at?: string | null;
    items: Array<{
        item_name: string;
        barcode?: string | null;
        quantity: number;
        unit: string;
        price: number;
        subtotal: number;
    }>;
    user?: { display_name?: string | null; name?: string | null };
};

type SaleReceiptDialogProps = {
    sale: ReceiptSale;
    onClose: () => void;
};

export default function SaleReceiptDialog({ sale, onClose }: SaleReceiptDialogProps) {
    const { auth } = usePage<PageProps>().props;

    const cashierName = userDisplayName(sale.user ?? auth.user);
    const paidAt = sale.paid_at ?? sale.occurred_at;

    const handlePrint = useCallback(() => {
        window.print();
    }, []);

    return (
        <>
            <style>{`
                @media print {
                    body * {
                        visibility: hidden !important;
                    }
                    #sale-receipt-print,
                    #sale-receipt-print * {
                        visibility: visible !important;
                    }
                    #sale-receipt-print {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 80mm;
                        padding: 4mm;
                        font-family: 'Courier New', Courier, monospace;
                        font-size: 11px;
                        line-height: 1.35;
                        color: #000 !important;
                        background: #fff !important;
                    }
                }
            `}</style>

            <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm print:hidden">
                <div className="glass-card max-h-[90vh] w-full max-w-md overflow-y-auto p-6">
                    <div className="mb-4 flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                            <div className="rounded-full bg-emerald-100 p-2 dark:bg-emerald-950">
                                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black">Pembayaran Berhasil</h3>
                                <p className="text-sm text-slate-500">Struk siap dicetak</p>
                            </div>
                        </div>
                        <button type="button" onClick={onClose} className="btn-muted !rounded-full !p-2">
                            <X className="h-4 w-4" />
                        </button>
                    </div>

                    <div className="mb-4 rounded-2xl border border-slate-100 bg-white p-4 font-mono text-xs dark:border-slate-800 dark:bg-slate-900">
                        <ReceiptContent
                            sale={sale}
                            cashierName={cashierName}
                            paidAt={paidAt}
                        />
                    </div>

                    <button type="button" onClick={handlePrint} className="btn-primary w-full">
                        <Printer className="h-4 w-4" />
                        Cetak Struk
                    </button>
                    <button type="button" onClick={onClose} className="btn-muted mt-3 w-full">
                        Selesai
                    </button>
                </div>
            </div>

            <div id="sale-receipt-print" className="hidden print:block">
                <ReceiptContent sale={sale} cashierName={cashierName} paidAt={paidAt} />
            </div>
        </>
    );
}

function ReceiptContent({
    sale,
    cashierName,
    paidAt,
}: {
    sale: ReceiptSale;
    cashierName: string;
    paidAt: string;
}) {
    return (
        <div className="space-y-3 text-center">
            <div>
                <p className="text-sm font-black uppercase tracking-wide">Richy Maju</p>
                <p className="text-[10px] text-slate-600">Struk Penjualan</p>
            </div>

            <div className="border-y border-dashed border-slate-300 py-2 text-left text-[10px] leading-relaxed">
                <p>No: {sale.code}</p>
                <p>Tanggal: {dateTime(paidAt)}</p>
                <p>Kasir: {cashierName}</p>
                <p>Bayar: {humanSalePaymentMethod(sale.payment_method)}</p>
            </div>

            <div className="space-y-2 text-left">
                {sale.items.map((item, index) => (
                    <div key={`${item.item_name}-${index}`} className="text-[10px]">
                        <p className="font-bold">{item.item_name}</p>
                        <div className="flex justify-between gap-2 tabular-nums">
                            <span>
                                {formatQuantity(item.quantity, item.unit)} × {rupiah(item.price)}
                            </span>
                            <span className="font-bold">{rupiah(item.subtotal)}</span>
                        </div>
                    </div>
                ))}
            </div>

            <div className="space-y-1 border-t border-dashed border-slate-300 pt-2 text-left text-[10px] tabular-nums">
                <div className="flex justify-between">
                    <span className="font-bold">Jumlah Total</span>
                    <span className="font-black">{rupiah(sale.total_amount)}</span>
                </div>
                {sale.payment_method === 'tunai' && sale.cash_paid_amount != null && (
                    <div className="flex justify-between">
                        <span className="font-bold">Uang Bayar</span>
                        <span>{rupiah(sale.cash_paid_amount)}</span>
                    </div>
                )}
                {sale.payment_method === 'tunai' && sale.change_amount != null && sale.change_amount > 0 && (
                    <div className="flex justify-between">
                        <span className="font-bold">Kembali</span>
                        <span className="font-black">{rupiah(sale.change_amount)}</span>
                    </div>
                )}
            </div>

            {sale.notes?.trim() && (
                <p className="text-left text-[10px] text-slate-600">Catatan: {sale.notes.trim()}</p>
            )}

            <p className="text-[10px] text-slate-600">Terima kasih atas kunjungan Anda</p>
        </div>
    );
}
