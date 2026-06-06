export const rupiah = (value: number | string | null | undefined) =>
    new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0,
    }).format(Number(value ?? 0));

const APP_TIMEZONE = 'Asia/Jayapura';

export const humanStatus = (value?: string) => (value ?? '-').replaceAll('_', ' ');

const debtStatusLabels: Record<string, string> = {
    belum_selesai: 'belum',
    sudah_selesai: 'selesai',
};

export const humanDebtStatus = (value?: string) => debtStatusLabels[value ?? ''] ?? humanStatus(value);

const transactionUiStatusLabels: Record<string, string> = {
    belum_selesai: 'Belum',
    selesai: 'Selesai',
};

export const humanTransactionUiStatus = (value?: string) =>
    transactionUiStatusLabels[value ?? ''] ?? humanStatus(value);

export const isPendingVerification = (status?: string | null) =>
    status == null || status === '' || status === 'menunggu';

/** Nama terdaftar saat pembuatan akun (field `name`), bukan nama tampilan/alias. */
export const registeredUserName = (user?: { name?: string | null }) => {
    const name = user?.name?.trim();
    return name || '-';
};

export const userDisplayName = (user?: { display_name?: string | null; name?: string | null }) =>
    user?.display_name || user?.name || '-';

export const rupiahShort = (value: number | string | null | undefined) => {
    const n = Number(value ?? 0);
    const abs = Math.abs(n);
    if (abs >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(abs >= 10_000_000_000 ? 0 : 1)}M`;
    if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1)}jt`;
    if (abs >= 1_000) return `${(n / 1_000).toFixed(abs >= 10_000 ? 0 : 1)}rb`;
    return n.toString();
};

export const dateOnly = (value?: string) =>
    value
        ? new Intl.DateTimeFormat('id-ID', {
              dateStyle: 'medium',
              timeZone: APP_TIMEZONE,
          }).format(new Date(value))
        : '-';

export const dateTime = (value?: string) =>
    value
        ? new Intl.DateTimeFormat('id-ID', {
              dateStyle: 'medium',
              timeStyle: 'short',
              timeZone: APP_TIMEZONE,
          }).format(new Date(value))
        : '-';

/** Tanggal & jam tanpa detik (untuk status login / terakhir aktif). */
export const dateTimeNoSeconds = (value?: string) =>
    value
        ? new Intl.DateTimeFormat('id-ID', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
              timeZone: APP_TIMEZONE,
          }).format(new Date(value))
        : '-';

/** Format ringkas untuk sel tabel agar muat di layar kecil */
export const dateTimeCompact = (value?: string) =>
    value
        ? new Intl.DateTimeFormat('id-ID', {
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
              timeZone: APP_TIMEZONE,
          }).format(new Date(value))
        : '-';

const stockTypeLabels: Record<string, string> = {
    masuk: 'Masuk',
    keluar: 'Keluar',
};

export const humanStockType = (value?: string) => stockTypeLabels[value ?? ''] ?? humanStatus(value);

const stockStatusLabels: Record<string, string> = {
    selesai: 'Selesai',
    diproses: 'Diproses',
};

export const humanStockStatus = (value?: string) => stockStatusLabels[value ?? ''] ?? humanStatus(value);

export const formatQuantity = (quantity: number | string, unit?: string) => {
    const formatted = new Intl.NumberFormat('id-ID', {
        maximumFractionDigits: 2,
    }).format(Number(quantity ?? 0));

    return unit ? `${formatted} ${unit}` : formatted;
};
