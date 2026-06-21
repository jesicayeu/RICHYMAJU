import Badge from '@/Components/Badge';
import { dateTime, dateTimeCompact, formatQuantity, humanStockType, rupiah, userDisplayName, cleanPosDescription } from '@/lib/format';
import { Link } from '@inertiajs/react';
import type { ReactNode } from 'react';

type RecentListProps = {
    title: string;
    indexRoute: string;
    emptyMessage: string;
    children: ReactNode;
};

function RecentListCard({ title, indexRoute, emptyMessage, children }: RecentListProps) {
    const isEmpty = !children || (Array.isArray(children) && children.length === 0);

    return (
        <div className="glass-card p-4 sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-base font-black sm:text-lg">{title}</h2>
                <Link href={indexRoute} className="btn-muted text-sm">
                    Lihat Semua
                </Link>
            </div>
            {isEmpty ? (
                <p className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500 dark:border-slate-700">
                    {emptyMessage}
                </p>
            ) : (
                <div className="space-y-3">{children}</div>
            )}
        </div>
    );
}

function RecentItemLink({ href, children }: { href: string; children: ReactNode }) {
    return (
        <Link
            href={href}
            className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 p-4 dark:border-slate-800"
        >
            {children}
        </Link>
    );
}

export function DashboardRecentTransactions({
    items,
    showUser = false,
}: {
    items: any[];
    showUser?: boolean;
}) {
    return (
        <RecentListCard
            title="Transaksi Terbaru"
            indexRoute={route('transactions.index')}
            emptyMessage="Belum ada transaksi."
        >
            {items.length > 0 &&
                items.map((trx) => (
                    <RecentItemLink key={trx.id} href={route('transactions.show', trx.id)}>
                        <div className="min-w-0">
                            <div className="truncate font-bold">
                                {showUser
                                    ? userDisplayName(trx.user)
                                    : cleanPosDescription(trx.description) || trx.type}
                            </div>
                            <div className="text-sm text-slate-500">
                                {showUser && trx.description
                                    ? `${cleanPosDescription(trx.description)} · `
                                    : ''}
                                {rupiah(trx.amount)} · {dateTime(trx.occurred_at)}
                            </div>
                        </div>
                        <Badge value={trx.type} />
                    </RecentItemLink>
                ))}
        </RecentListCard>
    );
}

export function DashboardRecentStocks({ items }: { items: any[] }) {
    return (
        <RecentListCard title="Stok Terbaru" indexRoute={route('stocks.index')} emptyMessage="Belum ada pergerakan stok.">
            {items.length > 0 &&
                items.map((stock) => (
                    <RecentItemLink key={stock.id} href={route('stocks.show', stock.id)}>
                        <div className="min-w-0">
                            <div className="truncate font-bold">{stock.item_name}</div>
                            <div className="text-sm text-slate-500">
                                {formatQuantity(stock.quantity, stock.unit)} · {dateTimeCompact(stock.occurred_at)}
                            </div>
                        </div>
                        <Badge value={stock.type} label={humanStockType(stock.type)} />
                    </RecentItemLink>
                ))}
        </RecentListCard>
    );
}

export function DashboardRecentSales({ items, showUser = false }: { items: any[]; showUser?: boolean }) {
    return (
        <RecentListCard
            title="Penjualan Terbaru"
            indexRoute={route('sales.index')}
            emptyMessage="Belum ada penjualan."
        >
            {items.length > 0 &&
                items.map((sale) => (
                    <RecentItemLink key={sale.id} href={route('sales.show', sale.id)}>
                        <div className="min-w-0">
                            <div className="truncate font-bold">
                                {showUser ? userDisplayName(sale.user) : rupiah(sale.total_amount)}
                            </div>
                            <div className="text-sm text-slate-500">
                                {showUser ? `${rupiah(sale.total_amount)} · ` : ''}
                                {dateTime(sale.occurred_at)}
                            </div>
                        </div>
                        <Badge value={sale.payment_status} />
                    </RecentItemLink>
                ))}
        </RecentListCard>
    );
}

export function DashboardRecentDebts({ items }: { items: any[] }) {
    return (
        <RecentListCard title="Utang Terbaru" indexRoute={route('debts.index')} emptyMessage="Belum ada utang.">
            {items.length > 0 &&
                items.map((debt) => (
                    <RecentItemLink key={debt.id} href={route('debts.show', debt.id)}>
                        <div className="min-w-0">
                            <div className="truncate font-bold">{debt.party_name}</div>
                            <div className="text-sm text-slate-500">
                                {rupiah(debt.amount)} · {dateTime(debt.occurred_at)}
                            </div>
                        </div>
                        <Badge value={debt.status} />
                    </RecentItemLink>
                ))}
        </RecentListCard>
    );
}
