import { rupiah } from '@/lib/format';
import { Link } from '@inertiajs/react';
import { HandCoins, Package, Receipt, ShoppingCart } from 'lucide-react';

type Summary = {
    penjualan: { total: number; count: number; today: number };
    transaksi: { pemasukan: number; pengeluaran: number; count: number };
    stok: { masuk: number; keluar: number; produk_aktif: number; stok_rendah: number };
    utang: { belum_selesai: number; sudah_selesai: number; count: number };
};

const modules = [
    {
        key: 'penjualan' as const,
        title: 'Penjualan',
        icon: ShoppingCart,
        route: 'sales.index',
        tone: 'text-violet-600 bg-violet-50 dark:bg-violet-950/40',
    },
    {
        key: 'transaksi' as const,
        title: 'Transaksi',
        icon: Receipt,
        route: 'transactions.index',
        tone: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40',
    },
    {
        key: 'stok' as const,
        title: 'Stok Barang',
        icon: Package,
        route: 'stocks.index',
        tone: 'text-sky-600 bg-sky-50 dark:bg-sky-950/40',
    },
    {
        key: 'utang' as const,
        title: 'Utang',
        icon: HandCoins,
        route: 'debts.index',
        tone: 'text-amber-600 bg-amber-50 dark:bg-amber-950/40',
    },
];

function moduleLines(key: keyof Summary, summary: Summary) {
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

export default function DashboardSummary({ summary }: { summary: Summary }) {
    return (
        <div className="glass-card p-4 sm:p-6">
            <div className="mb-4">
                <h2 className="text-base font-black sm:text-lg">Data Terpusat</h2>
                <p className="text-sm text-slate-500">Ringkasan semua modul dalam satu tampilan</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {modules.map((module) => {
                    const Icon = module.icon;
                    const lines = moduleLines(module.key, summary);

                    return (
                        <Link
                            key={module.key}
                            href={route(module.route)}
                            className="rounded-2xl border border-slate-100 p-4 transition hover:border-indigo-200 hover:shadow-sm dark:border-slate-800 dark:hover:border-indigo-800"
                        >
                            <div className="mb-3 flex items-center gap-3">
                                <span className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${module.tone}`}>
                                    <Icon className="h-5 w-5" />
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
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
