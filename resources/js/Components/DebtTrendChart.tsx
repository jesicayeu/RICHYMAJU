import { rupiah, rupiahShort } from '@/lib/format';
import { Link } from '@inertiajs/react';
import { TrendingUp, Wallet } from 'lucide-react';
import { useId } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export type DebtChartData = {
    total: number;
    points: { label: string; value: number }[];
    period: string;
    changePercent: number;
};

const periodLabels: Record<string, string> = {
    '1d': 'hari ini',
    '3d': '3 hari terakhir',
    '1w': '7 hari terakhir',
    '1m': '30 hari terakhir',
    '3m': '3 bulan terakhir',
    '6m': '6 bulan terakhir',
    '1y': '1 tahun terakhir',
    '2y': '2 tahun terakhir',
};

export default function DebtTrendChart({
    chartDebt,
    showLink = true,
    className = '',
}: {
    chartDebt?: DebtChartData;
    showLink?: boolean;
    className?: string;
}) {
    const gradientId = useId();
    const periodLabel = periodLabels[chartDebt?.period ?? '1w'] ?? '7 hari terakhir';
    const changeUp = (chartDebt?.changePercent ?? 0) >= 0;
    const hasData = chartDebt && chartDebt.points.length > 0;

    return (
        <div className={`glass-card p-4 sm:p-6 ${className}`}>
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h2 className="text-base font-black sm:text-lg">Grafik Utang</h2>
                    <p className="text-sm text-slate-500">Tren nominal utang · {periodLabel}</p>
                    {chartDebt && (
                        <>
                            <p className="mt-2 text-xl font-black tabular-nums sm:text-2xl">{rupiah(chartDebt.total)}</p>
                            <p className={`mt-1 text-xs font-semibold ${changeUp ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {changeUp ? '↑' : '↓'} {Math.abs(chartDebt.changePercent)}% dari periode sebelumnya
                            </p>
                        </>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <TrendingUp className="h-6 w-6 text-sky-500" />
                    {showLink && (
                        <Link href={route('debts.index')} className="btn-muted text-sm">
                            <Wallet className="h-4 w-4" />
                        </Link>
                    )}
                </div>
            </div>

            <div className="h-52 sm:h-56">
                {hasData ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartDebt.points} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.35} />
                                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.02} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" opacity={0.18} vertical={false} />
                            <XAxis
                                dataKey="label"
                                tick={{ fontSize: 11, fill: '#64748b' }}
                                tickMargin={8}
                                axisLine={false}
                                tickLine={false}
                            />
                            <YAxis
                                tick={{ fontSize: 11, fill: '#64748b' }}
                                tickFormatter={(v) => rupiahShort(v)}
                                width={52}
                                axisLine={false}
                                tickLine={false}
                            />
                            <Tooltip
                                formatter={(value) => [rupiah(Number(value)), 'Total Utang']}
                                labelFormatter={(label) => `Tanggal ${label}`}
                                contentStyle={{
                                    borderRadius: 12,
                                    fontSize: 12,
                                    border: '1px solid rgba(148,163,184,0.25)',
                                    boxShadow: '0 8px 24px rgba(15,23,42,0.08)',
                                }}
                            />
                            <Area
                                type="monotone"
                                name="Total Utang"
                                dataKey="value"
                                stroke="#0284c7"
                                strokeWidth={2.5}
                                fill={`url(#${gradientId})`}
                                dot={false}
                                activeDot={{ r: 5, fill: '#0284c7', stroke: '#fff', strokeWidth: 2 }}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-slate-200 text-sm text-slate-500 dark:border-slate-700">
                        Belum ada data utang untuk ditampilkan.
                    </div>
                )}
            </div>
        </div>
    );
}
