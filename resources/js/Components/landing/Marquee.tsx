const items = [
    'Transaksi Real-time',
    'Manajemen Stok',
    'Utang & Piutang',
    'Dashboard Analytics',
    'Chat Internal',
    'WhatsApp Notif',
    'Export PDF',
    'Multi Role',
];

export default function Marquee() {
    const row = [...items, ...items];

    return (
        <div className="relative overflow-hidden border-y border-slate-200/70 bg-white/55 py-5 shadow-[0_-8px_30px_-10px_rgba(99,102,241,0.1),0_8px_30px_-10px_rgba(99,102,241,0.1)] backdrop-blur-sm dark:border-slate-700/60 dark:bg-slate-800/40 dark:shadow-[0_-8px_30px_-10px_rgba(99,102,241,0.12),0_8px_30px_-10px_rgba(99,102,241,0.12)]">
            <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-[#f8fafc] to-transparent dark:from-[#0c1222]" />
            <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-[#f8fafc] to-transparent dark:from-[#0c1222]" />
            <div className="animate-marquee flex w-max gap-10">
                {row.map((item, i) => (
                    <span
                        key={`${item}-${i}`}
                        className="flex shrink-0 items-center gap-10 text-sm font-semibold uppercase tracking-[0.2em]"
                    >
                        <span className="text-brand-gradient">{item}</span>
                        <span className="h-1.5 w-1.5 rounded-full bg-indigo-400/60 dark:bg-indigo-500/50" />
                    </span>
                ))}
            </div>
        </div>
    );
}
