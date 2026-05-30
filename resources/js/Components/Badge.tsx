import { humanStatus } from '@/lib/format';

const solidTones: Record<string, string> = {
    pemasukan: 'bg-emerald-900/60 text-emerald-200',
    pengeluaran: 'bg-rose-900/60 text-rose-200',
    selesai: 'bg-[#1a3b2a] text-[#bbf7d0]',
    sudah_selesai: 'bg-[#1a3b2a] text-[#bbf7d0]',
    belum_selesai: 'bg-amber-900/50 text-amber-200',
    menunggu: 'bg-sky-900/50 text-sky-200',
    disetujui: 'bg-[#1a3b2a] text-[#bbf7d0]',
    ditolak: 'bg-[#3b1a1a] text-[#fecaca]',
    aktif: 'bg-[#1a3b2a] text-[#bbf7d0]',
    nonaktif: 'bg-slate-700 text-slate-300',
    masuk: 'bg-[#1a3b2a] text-[#bbf7d0]',
    keluar: 'bg-[#3b1a1a] text-[#fecaca]',
    diproses: 'bg-amber-900/50 text-amber-200',
};

const tones: Record<string, string> = {
    pemasukan: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
    pengeluaran: 'bg-rose-500/10 text-rose-700 dark:text-rose-300',
    selesai: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
    sudah_selesai: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
    belum_selesai: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
    menunggu: 'bg-sky-500/10 text-sky-700 dark:text-sky-300',
    disetujui: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
    ditolak: 'bg-rose-500/10 text-rose-700 dark:text-rose-300',
    aktif: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
    nonaktif: 'bg-slate-500/10 text-slate-700 dark:text-slate-300',
    masuk: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
    keluar: 'bg-rose-500/10 text-rose-700 dark:text-rose-300',
    diproses: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
};

export default function Badge({
    value,
    label,
    variant = 'soft',
}: {
    value?: string;
    label?: string;
    variant?: 'soft' | 'solid';
}) {
    const palette = variant === 'solid' ? solidTones : tones;

    return (
        <span
            className={`inline-flex items-center whitespace-nowrap rounded-full px-3 py-1 text-xs font-bold capitalize ${palette[value ?? ''] ?? (variant === 'solid' ? 'bg-slate-700 text-slate-300' : 'bg-slate-500/10 text-slate-600')}`}
        >
            {label ?? humanStatus(value)}
        </span>
    );
}
