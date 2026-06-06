import InputError from '@/Components/InputError';
import { useForm } from '@inertiajs/react';
import { ExternalLink, Save } from 'lucide-react';
import { FormEvent, useEffect } from 'react';

type Sheets = {
    transactions: string;
    stocks: string;
    debts: string;
};

function sheetUrl(sheetRef: string): string {
    const trimmed = sheetRef.trim();
    if (! trimmed) {
        return '';
    }

    if (trimmed.startsWith('http')) {
        return trimmed;
    }

    return `https://docs.google.com/spreadsheets/d/${trimmed}`;
}

function SheetIdField({
    label,
    value,
    onChange,
    placeholder,
    error,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
    error?: string;
}) {
    const sheetRef = value.trim();
    const canOpen = sheetRef.length > 0;

    return (
        <label>
            <span className="mb-1 block text-xs font-semibold text-slate-500">{label}</span>
            <div className="flex gap-2">
                <input
                    className="input min-w-0 flex-1"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    required
                />
                <a
                    href={canOpen ? sheetUrl(sheetRef) : undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={canOpen ? `Buka ${label} di Google Sheets` : `${label} belum diisi`}
                    className={`btn-muted grid h-[42px] w-[42px] shrink-0 place-items-center !rounded-2xl !p-0 ${
                        canOpen ? '' : 'pointer-events-none opacity-40'
                    }`}
                    tabIndex={canOpen ? 0 : -1}
                >
                    <ExternalLink className="h-4 w-4" />
                </a>
            </div>
            <InputError message={error} />
        </label>
    );
}

export default function SheetTab({ sheets }: { sheets: Sheets }) {
    const form = useForm({
        sheet_transactions: sheets.transactions,
        sheet_stocks: sheets.stocks,
        sheet_debts: sheets.debts,
    });

    useEffect(() => {
        form.setData({
            sheet_transactions: sheets.transactions,
            sheet_stocks: sheets.stocks,
            sheet_debts: sheets.debts,
        });
    }, [sheets.transactions, sheets.stocks, sheets.debts]);

    const submit = (e: FormEvent) => {
        e.preventDefault();
        form.post(route('admin.google-drive.sheets'));
    };

    return (
        <form onSubmit={submit} className="glass-card space-y-4 p-6">
            <h3 className="font-black">Sheet</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
                Masukkan ID sheet Google Sheets untuk setiap modul. Format: ID spreadsheet beserta gid tab sheet.
                Data transaksi, stok, dan utang akan otomatis tersinkron ke sheet saat ditambah, diubah, atau dihapus.
                Klik ikon link di samping input untuk membuka sheet di tab baru.
            </p>
            <p className="rounded-2xl bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
                Pastikan <strong>Google Sheets API</strong> sudah diaktifkan di Google Cloud Console project yang sama
                dengan OAuth Client ID. Setelah itu, admin perlu <strong>Putus Koneksi</strong> lalu{' '}
                <strong>Connect</strong> ulang di tab Config agar izin Google Sheets aktif.
            </p>

            <SheetIdField
                label="ID Sheet Transaksi"
                value={form.data.sheet_transactions}
                onChange={(v) => form.setData('sheet_transactions', v)}
                placeholder="1J8R7DZ817w9MLaWcDCn7Jx20TKyJj_krAoY8j1LZ5m0/edit?gid=0#gid=0"
                error={form.errors.sheet_transactions}
            />

            <SheetIdField
                label="ID Sheet Stok Barang"
                value={form.data.sheet_stocks}
                onChange={(v) => form.setData('sheet_stocks', v)}
                placeholder="1J8R7DZ817w9MLaWcDCn7Jx20TKyJj_krAoY8j1LZ5m0/edit?gid=728848999#gid=728848999"
                error={form.errors.sheet_stocks}
            />

            <SheetIdField
                label="ID Sheet Utang"
                value={form.data.sheet_debts}
                onChange={(v) => form.setData('sheet_debts', v)}
                placeholder="1J8R7DZ817w9MLaWcDCn7Jx20TKyJj_krAoY8j1LZ5m0/edit?gid=1109585085#gid=1109585085"
                error={form.errors.sheet_debts}
            />

            <button type="submit" className="btn-primary" disabled={form.processing}>
                <Save className="h-4 w-4" /> Simpan
            </button>
        </form>
    );
}
