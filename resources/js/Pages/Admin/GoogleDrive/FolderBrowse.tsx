import AppLayout from '@/Layouts/AppLayout';
import { Link } from '@inertiajs/react';
import { ArrowLeft, ExternalLink, FileText, ImageIcon } from 'lucide-react';

type DriveFile = {
    id: string;
    name: string;
    mime_type: string;
    size: number | null;
    created_at: string | null;
    url: string | null;
    drive_url: string;
};

function formatBytes(size: number | null): string {
    if (size === null) {
        return '—';
    }

    if (size < 1024) {
        return `${size} B`;
    }

    if (size < 1024 * 1024) {
        return `${(size / 1024).toFixed(1)} KB`;
    }

    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function isImage(mimeType: string): boolean {
    return mimeType.startsWith('image/');
}

export default function FolderBrowse({
    moduleLabel,
    folderId,
    driveFolderUrl,
    files,
    error,
}: {
    module: string;
    moduleLabel: string;
    folderId: string;
    driveFolderUrl: string;
    files: DriveFile[];
    error: string | null;
}) {
    return (
        <AppLayout title={`Folder ${moduleLabel}`}>
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
                            <h2 className="text-xl font-black">Folder {moduleLabel}</h2>
                            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                Pratinjau file terdekripsi lewat aplikasi web. File di Google Drive tetap tersimpan
                                terenkripsi jika dibuka langsung di luar aplikasi.
                            </p>
                            <p className="mt-2 font-mono text-xs text-slate-400">{folderId}</p>
                        </div>
                        <a
                            href={driveFolderUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-muted shrink-0"
                        >
                            <ExternalLink className="h-4 w-4" />
                            Buka di Google Drive
                        </a>
                    </div>
                </div>

                {error ? (
                    <div className="glass-card p-6 text-sm text-rose-600 dark:text-rose-300">{error}</div>
                ) : files.length === 0 ? (
                    <div className="glass-card p-6 text-sm text-slate-500 dark:text-slate-400">
                        Belum ada file di folder ini.
                    </div>
                ) : (
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                        {files.map((file) => (
                            <article key={file.id} className="glass-card overflow-hidden">
                                <div className="flex aspect-video items-center justify-center bg-slate-100 dark:bg-slate-900/60">
                                    {file.url && isImage(file.mime_type) ? (
                                        <a href={file.url} target="_blank" rel="noopener noreferrer">
                                            <img
                                                src={file.url}
                                                alt={file.name}
                                                className="h-full max-h-56 w-full object-contain"
                                                loading="lazy"
                                            />
                                        </a>
                                    ) : (
                                        <div className="flex flex-col items-center gap-2 text-slate-400">
                                            {file.mime_type === 'application/pdf' ? (
                                                <FileText className="h-10 w-10" />
                                            ) : (
                                                <ImageIcon className="h-10 w-10" />
                                            )}
                                            <span className="text-xs font-semibold uppercase tracking-wide">
                                                {file.mime_type.split('/')[1] ?? 'file'}
                                            </span>
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-2 p-4">
                                    <h3 className="truncate text-sm font-bold" title={file.name}>
                                        {file.name}
                                    </h3>
                                    <div className="flex flex-wrap gap-2 text-xs text-slate-500 dark:text-slate-400">
                                        <span>{formatBytes(file.size)}</span>
                                        {file.created_at ? (
                                            <span>{new Date(file.created_at).toLocaleString('id-ID')}</span>
                                        ) : null}
                                    </div>
                                    {file.url ? (
                                        <div className="flex flex-col gap-2">
                                            <a
                                                href={file.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="btn-primary inline-flex w-full justify-center"
                                            >
                                                Buka file terdekripsi
                                            </a>
                                            <a
                                                href={file.drive_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="btn-muted inline-flex w-full justify-center text-xs"
                                            >
                                                <ExternalLink className="h-3.5 w-3.5" />
                                                Buka di Google Drive (terenkripsi)
                                            </a>
                                        </div>
                                    ) : null}
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
