import Badge from '@/Components/Badge';
import AppLayout from '@/Layouts/AppLayout';
import { useConfirmDelete } from '@/hooks/useConfirmDelete';
import { dateTime, formatQuantity, humanStockStatus, humanStockType, userDisplayName } from '@/lib/format';
import { Link } from '@inertiajs/react';
import { Edit, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';

function DetailCard({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div className="detail-metric-card">
            <div className="detail-metric-label">{label}</div>
            <div className="mt-2">{children}</div>
        </div>
    );
}

export default function StockShow({ movement, isAdmin }: { movement: any; isAdmin: boolean }) {
    const { requestDelete, deleteModal } = useConfirmDelete({
        buildRoute: (id) => route('stocks.destroy', id),
        title: 'Hapus Stok',
        message: () => 'Yakin hapus data stok ini? Tindakan tidak dapat dibatalkan.',
    });

    return (
        <AppLayout title="Detail Stok">
            <div className="glass-card space-y-5 p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <h2 className="text-2xl font-black">Detail Stok Barang</h2>
                        <p className="text-sm text-slate-500">
                            {dateTime(movement.occurred_at)} · {userDisplayName(movement.user)}
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Link href={route('stocks.edit', movement.id)} className="btn-primary">
                            <Edit className="h-4 w-4" /> Edit
                        </Link>
                        {isAdmin && (
                            <button
                                type="button"
                                onClick={() => requestDelete({ id: movement.id })}
                                className="btn-muted text-rose-600"
                            >
                                <Trash2 className="h-4 w-4" /> Hapus
                            </button>
                        )}
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="detail-metric-grid">
                        <DetailCard label="Jenis">
                            <Badge
                                variant="solid"
                                value={movement.type}
                                label={humanStockType(movement.type)}
                            />
                        </DetailCard>
                        <DetailCard label="Jumlah">
                            <p className="detail-metric-value">
                                {formatQuantity(movement.quantity, movement.unit)}
                            </p>
                        </DetailCard>
                        <DetailCard label="Status">
                            <Badge
                                variant="solid"
                                value={movement.status}
                                label={humanStockStatus(movement.status)}
                            />
                        </DetailCard>
                        <DetailCard label="Nama Barang">
                            <p className="detail-metric-value">{movement.item_name}</p>
                        </DetailCard>
                    </div>

                    <DetailCard label="Catatan">
                        <p className="detail-metric-value">{movement.notes?.trim() || '-'}</p>
                    </DetailCard>
                </div>
            </div>
            {deleteModal}
        </AppLayout>
    );
}
