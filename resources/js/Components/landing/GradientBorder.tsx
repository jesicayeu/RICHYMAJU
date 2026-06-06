import { ReactNode } from 'react';

export default function GradientBorder({
    children,
    className = '',
    rounded = 'rounded-3xl',
}: {
    children: ReactNode;
    className?: string;
    rounded?: string;
}) {
    return (
        <div className={`group relative ${rounded} ${className}`}>
            <div
                className={`pointer-events-none absolute -inset-[1px] ${rounded} opacity-80 transition-opacity duration-500 group-hover:opacity-100`}
            >
                <div
                    className={`absolute inset-0 ${rounded} animate-gradient-x bg-brand-gradient bg-[length:200%_auto]`}
                />
            </div>
            <div
                className={`relative ${rounded} border border-slate-200/60 bg-white/90 shadow-lg shadow-indigo-100/40 backdrop-blur-xl dark:border-slate-700/50 dark:bg-slate-800/90 dark:shadow-indigo-500/10`}
            >
                {children}
            </div>
        </div>
    );
}
