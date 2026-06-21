import AppLayout from '@/Layouts/AppLayout';
import { Link } from '@inertiajs/react';
import { ArrowLeft, ExternalLink } from 'lucide-react';

function isMediaUrl(value: string): boolean {
    return value.includes('/media') && value.includes('t=');
}

export default function SheetBrowse({
    moduleLabel,
    sheetRef,
    sheetUrl,
    headers,
    rows,
    error,
}: {
    module: string;
    moduleLabel: string;
    sheetRef: string;
    sheetUrl: string;
    headers: string[];
    rows: string[][];
    error: string | null;
}) {
    return (
        <AppLayout title={`Sheet ${moduleLabel}`}>
            <div className="space-y-6">
                <div className="glass-card p-6">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                            <Link
                                href={route('admin.settings.index', { tab: 'google-drive' })}
                                className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-300"
                            >
                                <ArrowLeft className="h-4 w-4" />
                                Kembali ke Pengaturan
                            </Link>
                            <h2 className="text-xl font-black">Sheet {moduleLabel}</h2>
                            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                Pratinjau data terdekripsi lewat aplikasi web. Jika sheet dibuka langsung di Google
                                Sheets, data tetap terenkripsi.
                            </p>
                            <p className="mt-2 break-all font-mono text-xs text-slate-400">{sheetRef}</p>
                        </div>
                        <a
                            href={sheetUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-muted shrink-0"
                        >
                            <ExternalLink className="h-4 w-4" />
                            Buka di Google Sheets
                        </a>
                    </div>
                </div>

                {error ? (
                    <div className="glass-card p-6 text-sm text-rose-600 dark:text-rose-300">{error}</div>
                ) : rows.length === 0 ? (
                    <div className="glass-card p-6 text-sm text-slate-500 dark:text-slate-400">
                        Belum ada data di sheet ini.
                    </div>
                ) : (
                    <div className="glass-card overflow-x-auto">
                        <table className="min-w-full text-left text-sm">
                            <thead>
                                <tr className="border-b border-slate-200 dark:border-slate-700">
                                    {headers.map((header) => (
                                        <th
                                            key={header}
                                            className="whitespace-nowrap px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500"
                                        >
                                            {header}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((row, rowIndex) => (
                                    <tr
                                        key={rowIndex}
                                        className="border-b border-slate-100 last:border-0 dark:border-slate-800"
                                    >
                                        {row.map((cell, cellIndex) => (
                                            <td
                                                key={`${rowIndex}-${cellIndex}`}
                                                className="max-w-xs px-4 py-3 align-top text-slate-700 dark:text-slate-200"
                                            >
                                                {isMediaUrl(cell) ? (
                                                    <a
                                                        href={cell}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="font-semibold text-indigo-600 hover:underline dark:text-indigo-300"
                                                    >
                                                        Buka bukti terdekripsi
                                                    </a>
                                                ) : (
                                                    <span className="break-words">{cell || '—'}</span>
                                                )}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
