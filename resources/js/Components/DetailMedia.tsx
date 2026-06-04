type DetailMediaProps = {
    url?: string | null;
    label?: string;
    alt?: string;
};

function isPdfUrl(url: string): boolean {
    return /\.pdf($|[?#])/i.test(url) || url.includes('application/pdf');
}

export default function DetailMedia({ url, label = 'Gambar', alt }: DetailMediaProps) {
    if (!url) {
        return null;
    }

    if (isPdfUrl(url)) {
        return (
            <div className="space-y-2">
                <div className="text-sm font-bold text-slate-500 dark:text-slate-400">{label}</div>
                <iframe
                    src={url}
                    title={alt ?? label}
                    className="h-[28rem] w-full rounded-2xl border border-slate-200 bg-white dark:border-slate-700"
                />
            </div>
        );
    }

    return (
        <div className="space-y-2">
            <div className="text-sm font-bold text-slate-500 dark:text-slate-400">{label}</div>
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900">
                <img
                    src={url}
                    alt={alt ?? label}
                    className="mx-auto max-h-[28rem] w-full object-contain"
                    loading="lazy"
                />
            </div>
        </div>
    );
}
