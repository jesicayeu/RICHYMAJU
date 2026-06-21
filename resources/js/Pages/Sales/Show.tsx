import Badge from '@/Components/Badge';
import AppLayout from '@/Layouts/AppLayout';
import { useConfirmDelete } from '@/hooks/useConfirmDelete';
import { dateTime, formatQuantity, humanSalePaymentMethod, humanSalePaymentStatus, rupiah, userDisplayName } from '@/lib/format';
import { Link, router } from '@inertiajs/react';
import { Edit, Trash2 } from 'lucide-react';
import { useState } from 'react';
import type { ReactNode } from 'react';
import PaymentQrDialog from '@/Components/PaymentQrDialog';

function DetailCard({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div className="detail-metric-card">
            <div className="detail-metric-label">{label}</div>
            <div className="mt-2">{children}</div>
        </div>
    );
}

export default function SaleShow({
    sale,
    isAdmin,
    paymentQrPayload,
    paymentQrError,
    paymentInfo,
}: {
    sale: any;
    isAdmin: boolean;
    paymentQrPayload?: string | null;
    paymentQrError?: string | null;
    paymentInfo?: {
        merchant_name?: string | null;
        merchant_id?: string | null;
        provider_name?: string | null;
        has_qris?: boolean;
    };
}) {
    const [showPayment, setShowPayment] = useState(false);
    const { requestDelete, deleteModal } = useConfirmDelete({
        buildRoute: (id) => route('sales.destroy', id),
        title: 'Hapus Penjualan',
        message: () => 'Yakin hapus data penjualan ini? Tindakan tidak dapat dibatalkan.',
    });

    return (
        <AppLayout title="Detail Penjualan">
            <div className="glass-card space-y-5 p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <h2 className="text-2xl font-black">Detail Penjualan</h2>
                        <p className="text-sm text-slate-500">
                            {dateTime(sale.occurred_at)} · {userDisplayName(sale.user)}
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Link href={route('sales.edit', sale.id)} className="btn-primary">
                            <Edit className="h-4 w-4" /> Edit
                        </Link>
                        {isAdmin && (
                            <button
                                type="button"
                                onClick={() => requestDelete({ id: sale.id })}
                                className="btn-muted text-rose-600"
                            >
                                <Trash2 className="h-4 w-4" /> Hapus
                            </button>
                        )}
                    </div>
                </div>

                <div className="detail-metric-grid">
                    <DetailCard label="Metode Pembayaran">
                        <p className="detail-metric-value">{humanSalePaymentMethod(sale.payment_method)}</p>
                    </DetailCard>
                    <DetailCard label="Status Pembayaran">
                        <Badge
                            variant="solid"
                            value={sale.payment_status}
                            label={humanSalePaymentStatus(sale.payment_status)}
                        />
                    </DetailCard>
                    <DetailCard label="Total">
                        <p className="detail-metric-value tabular-nums">{rupiah(sale.total_amount)}</p>
                    </DetailCard>
                </div>

                {(sale.payment_method === 'barcode' ||
                    sale.payment_method === 'qris_dana' ||
                    sale.payment_method === 'qris_gopay') &&
                    sale.payment_status === 'belum_lunas' && (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/40 dark:bg-amber-950/20">
                        <p className="text-sm font-bold text-amber-800 dark:text-amber-200">Menunggu pembayaran QRIS</p>
                        <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
                            {paymentInfo?.merchant_name} · {paymentInfo?.merchant_id} · Ref: {sale.code}
                        </p>
                        <button type="button" onClick={() => setShowPayment(true)} className="btn-primary mt-3">
                            Tampilkan QR & Konfirmasi
                        </button>
                    </div>
                )}

                <div className="overflow-hidden rounded-2xl border border-slate-100 dark:border-slate-800">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-800/50">
                            <tr>
                                <th className="px-4 py-3 text-left font-bold">Barang</th>
                                <th className="px-4 py-3 text-left font-bold">Jumlah</th>
                                <th className="px-4 py-3 text-right font-bold">Harga</th>
                                <th className="px-4 py-3 text-right font-bold">Subtotal</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sale.items.map((item: any) => (
                                <tr key={item.id} className="border-t border-slate-100 dark:border-slate-800">
                                    <td className="px-4 py-3 font-medium">
                                        {item.item_name}
                                        {item.barcode && (
                                            <div className="font-mono text-xs text-slate-500">{item.barcode}</div>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">{formatQuantity(item.quantity, item.unit)}</td>
                                    <td className="px-4 py-3 text-right tabular-nums">{rupiah(item.price)}</td>
                                    <td className="px-4 py-3 text-right font-semibold tabular-nums">
                                        {rupiah(item.subtotal)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot className="border-t border-slate-100 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/50">
                            <tr>
                                <td colSpan={3} className="px-4 py-3 text-right font-bold">
                                    Total
                                </td>
                                <td className="px-4 py-3 text-right text-lg font-black tabular-nums">
                                    {rupiah(sale.total_amount)}
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                <DetailCard label="Catatan">
                    <p className="detail-metric-value">{sale.notes?.trim() || '-'}</p>
                </DetailCard>
            </div>
            {deleteModal}
            {showPayment && (
                <PaymentQrDialog
                    saleId={sale.id}
                    saleCode={sale.code}
                    paymentQrPayload={paymentQrPayload}
                    paymentQrError={paymentQrError}
                    amount={sale.total_amount}
                    paymentInfo={paymentInfo}
                    onClose={() => setShowPayment(false)}
                    onConfirmed={() => router.reload()}
                />
            )}
        </AppLayout>
    );
}
