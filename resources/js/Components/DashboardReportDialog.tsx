import Badge from '@/Components/Badge';
import { useLockBodyScroll } from '@/hooks/useLockBodyScroll';
import {
    dateTime,
    formatQuantity,
    humanDebtStatus,
    humanStockType,
    rupiah,
    userDisplayName,
} from '@/lib/format';
import { usePage } from '@inertiajs/react';
import {
    FileDown,
    FileText,
    HandCoins,
    Package,
    Receipt,
    ShoppingCart,
    TrendingDown,
    TrendingUp,
    X,
} from 'lucide-react';
import type { ReactNode } from 'react';
import type { PageProps } from '@/types';

type DashboardStats = {
    incomeToday: number;
    expenseToday: number;
    salesToday: number;
    totalIncomeToday?: number;
    profitToday?: number;
};

type DashboardSummary = {
    penjualan: { total: number; count: number; today: number };
    transaksi: { pemasukan: number; pengeluaran: number; count: number };
    stok: { masuk: number; keluar: number; produk_aktif: number; stok_rendah: number };
    utang: { belum_selesai: number; sudah_selesai: number; count: number };
};

type DashboardReportDialogProps = {
    stats: DashboardStats;
    summary: DashboardSummary;
    recentSales: any[];
    recentTransactions: any[];
    recentStocks: any[];
    recentDebts: any[];
    isAdmin?: boolean;
    onClose: () => void;
};

function hasModuleData(key: keyof DashboardSummary, summary: DashboardSummary): boolean {
    switch (key) {
        case 'penjualan':
            return summary.penjualan.total > 0 || summary.penjualan.count > 0 || summary.penjualan.today > 0;
        case 'transaksi':
            return summary.transaksi.pemasukan > 0 || summary.transaksi.pengeluaran > 0 || summary.transaksi.count > 0;
        case 'stok':
            return summary.stok.masuk > 0 || summary.stok.keluar > 0;
        case 'utang':
            return summary.utang.belum_selesai > 0 || summary.utang.sudah_selesai > 0 || summary.utang.count > 0;
        default:
            return false;
    }
}

const moduleMeta = [
    {
        key: 'penjualan' as const,
        title: 'Penjualan',
        icon: ShoppingCart,
        tone: 'text-violet-600 bg-violet-50 dark:bg-violet-950/40',
    },
    {
        key: 'transaksi' as const,
        title: 'Transaksi',
        icon: Receipt,
        tone: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40',
    },
    {
        key: 'stok' as const,
        title: 'Stok Barang',
        icon: Package,
        tone: 'text-sky-600 bg-sky-50 dark:bg-sky-950/40',
    },
    {
        key: 'utang' as const,
        title: 'Utang',
        icon: HandCoins,
        tone: 'text-amber-600 bg-amber-50 dark:bg-amber-950/40',
    },
];

function moduleLines(key: keyof DashboardSummary, summary: DashboardSummary) {
    switch (key) {
        case 'penjualan':
            return [
                { label: 'Total penjualan', value: rupiah(summary.penjualan.total) },
                { label: 'Hari ini', value: rupiah(summary.penjualan.today) },
                { label: 'Jumlah transaksi', value: `${summary.penjualan.count} data` },
            ];
        case 'transaksi':
            return [
                { label: 'Pemasukan', value: rupiah(summary.transaksi.pemasukan) },
                { label: 'Pengeluaran', value: rupiah(summary.transaksi.pengeluaran) },
                { label: 'Total data', value: `${summary.transaksi.count} data` },
            ];
        case 'stok':
            return [
                { label: 'Barang masuk', value: `${summary.stok.masuk} kali` },
                { label: 'Barang keluar', value: `${summary.stok.keluar} kali` },
                { label: 'Produk aktif', value: `${summary.stok.produk_aktif} item` },
            ];
        case 'utang':
            return [
                { label: 'Belum selesai', value: rupiah(summary.utang.belum_selesai) },
                { label: 'Sudah selesai', value: rupiah(summary.utang.sudah_selesai) },
                { label: 'Total data', value: `${summary.utang.count} data` },
            ];
        default:
            return [];
    }
}

export default function DashboardReportDialog({
    stats,
    summary,
    recentSales,
    recentTransactions,
    recentStocks,
    recentDebts,
    isAdmin = false,
    onClose,
}: DashboardReportDialogProps) {
    useLockBodyScroll();

    const { auth } = usePage<PageProps>().props;
    const totalIncome = stats.totalIncomeToday ?? stats.incomeToday + stats.salesToday;
    const profit = stats.profitToday ?? totalIncome - stats.expenseToday;
    const isProfit = profit >= 0;
    const periodLabel = new Intl.DateTimeFormat('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: 'Asia/Jayapura',
    }).format(new Date());

    const activeModules = moduleMeta.filter((module) => hasModuleData(module.key, summary));
    const hasRecentSales = recentSales.length > 0;
    const hasRecentTransactions = recentTransactions.length > 0;
    const hasRecentStocks = recentStocks.length > 0;
    const hasRecentDebts = recentDebts.length > 0;
    const hasDetailSections = hasRecentSales || hasRecentTransactions || hasRecentStocks || hasRecentDebts;

    const handleDownload = () => {
        window.location.href = route('dashboard.export');
    };

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
            <div className="glass-card flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden">
                <div className="flex items-start justify-between gap-3 border-b border-slate-100 p-5 dark:border-slate-800 sm:p-6">
                    <div className="flex items-start gap-3">
                        <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-300">
                            <FileText className="h-5 w-5" />
                        </span>
                        <div>
                            <h3 className="text-lg font-black sm:text-xl">Pratinjau Laporan</h3>
                            <p className="text-sm text-slate-500">Ringkasan keuangan hari ini · {periodLabel}</p>
                        </div>
                    </div>
                    <button type="button" onClick={onClose} className="btn-muted !rounded-full !p-2">
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <div className="flex-1 space-y-5 overflow-y-auto p-5 sm:p-6">
                    <div>
                        <h4 className="mb-3 text-sm font-black uppercase tracking-wide text-slate-500">Rincian Keuangan Hari Ini</h4>
                        <div className="grid gap-3 sm:grid-cols-2">
                            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/30">
                                <div className="mb-1 flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
                                    <TrendingUp className="h-4 w-4" />
                                    <span className="text-xs font-bold uppercase">Pemasukan</span>
                                </div>
                                <p className="text-lg font-black">{rupiah(stats.incomeToday)}</p>
                            </div>
                            <div className="rounded-2xl border border-rose-100 bg-rose-50/70 p-4 dark:border-rose-900/40 dark:bg-rose-950/30">
                                <div className="mb-1 flex items-center gap-2 text-rose-700 dark:text-rose-300">
                                    <TrendingDown className="h-4 w-4" />
                                    <span className="text-xs font-bold uppercase">Pengeluaran</span>
                                </div>
                                <p className="text-lg font-black">{rupiah(stats.expenseToday)}</p>
                            </div>
                            <div className="rounded-2xl border border-violet-100 bg-violet-50/70 p-4 dark:border-violet-900/40 dark:bg-violet-950/30">
                                <div className="mb-1 flex items-center gap-2 text-violet-700 dark:text-violet-300">
                                    <ShoppingCart className="h-4 w-4" />
                                    <span className="text-xs font-bold uppercase">Penjualan POS</span>
                                </div>
                                <p className="text-lg font-black">{rupiah(stats.salesToday)}</p>
                            </div>
                            <div
                                className={`rounded-2xl border p-4 ${
                                    isProfit
                                        ? 'border-indigo-100 bg-indigo-50/70 dark:border-indigo-900/40 dark:bg-indigo-950/30'
                                        : 'border-amber-100 bg-amber-50/70 dark:border-amber-900/40 dark:bg-amber-950/30'
                                }`}
                            >
                                <div
                                    className={`mb-1 flex items-center gap-2 ${
                                        isProfit
                                            ? 'text-indigo-700 dark:text-indigo-300'
                                            : 'text-amber-700 dark:text-amber-300'
                                    }`}
                                >
                                    <Receipt className="h-4 w-4" />
                                    <span className="text-xs font-bold uppercase">{isProfit ? 'Laba Hari Ini' : 'Kerugian Hari Ini'}</span>
                                </div>
                                <p className="text-lg font-black">{rupiah(Math.abs(profit))}</p>
                                <p className="mt-1 text-xs text-slate-500">Total pemasukan {rupiah(totalIncome)}</p>
                            </div>
                        </div>
                    </div>

                    {activeModules.length > 0 && (
                        <div>
                            <h4 className="mb-3 text-sm font-black uppercase tracking-wide text-slate-500">Ringkasan Modul</h4>
                            <div className="grid gap-3 sm:grid-cols-2">
                                {activeModules.map((module) => {
                                    const Icon = module.icon;
                                    const lines = moduleLines(module.key, summary);

                                    return (
                                        <div
                                            key={module.key}
                                            className="rounded-2xl border border-slate-100 p-4 dark:border-slate-800"
                                        >
                                            <div className="mb-3 flex items-center gap-3">
                                                <span className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${module.tone}`}>
                                                    <Icon className="h-4 w-4" />
                                                </span>
                                                <span className="font-bold">{module.title}</span>
                                            </div>
                                            <div className="space-y-1.5">
                                                {lines.map((line) => (
                                                    <div key={line.label} className="flex items-center justify-between gap-2 text-sm">
                                                        <span className="text-slate-500">{line.label}</span>
                                                        <span className="font-semibold">{line.value}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {hasDetailSections && (
                        <div>
                            <h4 className="mb-3 text-sm font-black uppercase tracking-wide text-slate-500">Data Terbaru</h4>
                            <div className="space-y-4">
                                {hasRecentSales && (
                                    <ReportSection title="Penjualan Terbaru">
                                        {recentSales.map((sale) => (
                                            <ReportRow
                                                key={sale.id}
                                                title={sale.code}
                                                subtitle={`${rupiah(sale.total_amount)} · ${dateTime(sale.occurred_at)}`}
                                                badge={sale.payment_status}
                                            />
                                        ))}
                                    </ReportSection>
                                )}

                                {hasRecentTransactions && (
                                    <ReportSection title="Transaksi Terbaru">
                                        {recentTransactions.map((trx) => (
                                            <ReportRow
                                                key={trx.id}
                                                title={isAdmin ? userDisplayName(trx.user) : trx.description || trx.type}
                                                subtitle={`${rupiah(trx.amount)} · ${dateTime(trx.occurred_at)}`}
                                                badge={trx.type}
                                            />
                                        ))}
                                    </ReportSection>
                                )}

                                {hasRecentStocks && (
                                    <ReportSection title="Stok Terbaru">
                                        {recentStocks.map((stock) => (
                                            <ReportRow
                                                key={stock.id}
                                                title={stock.item_name}
                                                subtitle={`${formatQuantity(stock.quantity, stock.unit)} · ${dateTime(stock.occurred_at)}`}
                                                badge={stock.type}
                                                badgeLabel={humanStockType(stock.type)}
                                            />
                                        ))}
                                    </ReportSection>
                                )}

                                {hasRecentDebts && (
                                    <ReportSection title="Utang Terbaru">
                                        {recentDebts.map((debt) => (
                                            <ReportRow
                                                key={debt.id}
                                                title={debt.party_name}
                                                subtitle={`${rupiah(debt.amount)} · ${dateTime(debt.occurred_at)}`}
                                                badge={debt.status}
                                                badgeLabel={humanDebtStatus(debt.status)}
                                            />
                                        ))}
                                    </ReportSection>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="rounded-2xl border border-dashed border-indigo-200 bg-indigo-50/50 p-4 text-sm text-slate-600 dark:border-indigo-900/50 dark:bg-indigo-950/20 dark:text-slate-400">
                        <p>
                            Laporan PDF akan berisi ringkasan keuangan hari ini
                            {activeModules.length > 0 ? ' dan modul yang memiliki data' : ''}
                            {hasDetailSections ? ', serta daftar data terbaru' : ''}.
                            Bagian kosong tidak dimasukkan ke file PDF.
                        </p>
                        <p className="mt-2 text-xs text-slate-500">Dicetak oleh: {userDisplayName(auth.user)}</p>
                    </div>
                </div>

                <div className="flex flex-col gap-3 border-t border-slate-100 p-5 dark:border-slate-800 sm:flex-row sm:p-6">
                    <button type="button" onClick={handleDownload} className="btn-primary flex-1">
                        <FileDown className="h-4 w-4" />
                        Download PDF
                    </button>
                    <button type="button" onClick={onClose} className="btn-muted flex-1">
                        Tutup
                    </button>
                </div>
            </div>
        </div>
    );
}

function ReportSection({ title, children }: { title: string; children: ReactNode }) {
    return (
        <div className="rounded-2xl border border-slate-100 p-4 dark:border-slate-800">
            <h5 className="mb-3 text-sm font-bold">{title}</h5>
            <div className="space-y-2">{children}</div>
        </div>
    );
}

function ReportRow({
    title,
    subtitle,
    badge,
    badgeLabel,
}: {
    title: string;
    subtitle: string;
    badge: string;
    badgeLabel?: string;
}) {
    return (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 px-3 py-2.5 dark:border-slate-800">
            <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{title}</p>
                <p className="truncate text-xs text-slate-500">{subtitle}</p>
            </div>
            <Badge value={badge} label={badgeLabel} />
        </div>
    );
}
