import { LucideIcon } from 'lucide-react';

export default function StatCard({
    title,
    value,
    subtitle,
    icon: Icon,
    tone = 'indigo',
}: {
    title: string;
    value: string;
    subtitle?: string;
    icon: LucideIcon;
    tone?: 'indigo' | 'emerald' | 'rose' | 'sky' | 'violet' | 'amber';
}) {
    const colors = {
        indigo: 'from-indigo-600 to-violet-500',
        emerald: 'from-emerald-500 to-teal-400',
        rose: 'from-rose-500 to-orange-400',
        sky: 'from-sky-500 to-cyan-400',
        violet: 'from-violet-600 to-purple-500',
        amber: 'from-amber-500 to-orange-400',
    };

    return (
        <div className="glass-card min-w-0 overflow-hidden p-4 sm:p-5">
            <div className="flex items-start justify-between gap-2">
                <p className="min-w-0 flex-1 pr-1 text-xs font-semibold leading-snug text-slate-500 dark:text-slate-400 sm:text-sm">
                    {title}
                </p>
                <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br sm:h-11 sm:w-11 ${colors[tone]} text-white shadow-lg`}
                >
                    <Icon className="h-5 w-5" strokeWidth={2} />
                </div>
            </div>
            <p className="mt-2.5 break-words text-base font-black tabular-nums leading-tight tracking-tight sm:mt-3 sm:text-lg lg:text-xl">
                {value}
            </p>
            {subtitle && <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">{subtitle}</p>}
        </div>
    );
}
