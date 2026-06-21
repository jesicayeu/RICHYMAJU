import AppLayout from '@/Layouts/AppLayout';
import { Link } from '@inertiajs/react';
import { ArrowLeft, Download, ExternalLink, RotateCcw, Usb, Zap } from 'lucide-react';

const MANUALS = [
    {
        title: 'Manual Scanner Laser (Generik — kemungkinan cocok Tori)',
        url: 'https://vial.by/pdf/barcode-scanner-user-manual(3208R).pdf',
        note: 'Buka PDF → cari barcode "USB-KBW" dan "Restore All Factory Defaults"',
    },
    {
        title: 'Manual Scanner 2D (Alternatif)',
        url: 'https://pssolution.co.th/wp-content/uploads/2024/04/NITA-Barcode-Scanner-User-Manual-V3.6.pdf',
        note: 'Cari barcode "Enter setup" → "USB-KBW" → "Add terminal CR" → "Exit setup"',
    },
    {
        title: 'Manual HPRT Handheld Scanner',
        url: 'https://scanberry.ru/cache/files/models/41515/Barcode_Scanner_User_Manual_Rev.1.3.pdf',
        note: 'Cari "HID Virtual Keyboard Setting"',
    },
];

export default function ScannerSetup() {
    return (
        <AppLayout title="Setup Scanner Tori">
            <div className="mx-auto max-w-2xl space-y-4">
                <Link href={route('sales.pos')} className="btn-muted inline-flex">
                    <ArrowLeft className="h-4 w-4" /> Kembali ke Kasir
                </Link>

                <div className="glass-card p-5 sm:p-6">
                    <h2 className="text-xl font-black">Setup Scanner Tori Tanpa Buku Manual</h2>
                    <p className="mt-1 text-sm text-slate-500">
                        Scanner Tori biasanya scanner OEM — manual generik di bawah sering bisa dipakai.
                    </p>

                    <div className="mt-6 space-y-4">
                        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
                            <div className="mb-2 flex items-center gap-2 font-bold text-amber-900 dark:text-amber-200">
                                <RotateCcw className="h-4 w-4" />
                                Langkah 1 — Reset Tanpa Manual
                            </div>
                            <ol className="list-decimal space-y-2 pl-5 text-sm text-amber-900/90 dark:text-amber-100/90">
                                <li>
                                    <strong>Cabut</strong> kabel USB dari laptop.
                                </li>
                                <li>
                                    <strong>Tahan trigger kuning</strong> scanner (jangan dilepas).
                                </li>
                                <li>
                                    Sambil tahan trigger, <strong>colokkan USB</strong> ke laptop.
                                </li>
                                <li>
                                    Tunggu bunyi <strong>beep</strong> (2–3 detik), lalu lepas trigger.
                                </li>
                                <li>Buka Notepad, scan barcode kemasan produk — cek apakah muncul angka.</li>
                            </ol>
                        </section>

                        <section className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4 dark:border-indigo-900 dark:bg-indigo-950/30">
                            <div className="mb-2 flex items-center gap-2 font-bold text-indigo-900 dark:text-indigo-200">
                                <Download className="h-4 w-4" />
                                Langkah 2 — Download Manual Generik
                            </div>
                            <p className="mb-3 text-sm text-indigo-900/80 dark:text-indigo-100/80">
                                Buka PDF di HP atau laptop, lalu <strong>scan barcode konfigurasi dari layar</strong>{' '}
                                menggunakan scanner Tori:
                            </p>
                            <div className="space-y-3">
                                {MANUALS.map((manual) => (
                                    <a
                                        key={manual.url}
                                        href={manual.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="block rounded-xl border border-indigo-200 bg-white p-3 transition hover:border-indigo-400 dark:border-indigo-800 dark:bg-slate-900"
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <span className="text-sm font-bold">{manual.title}</span>
                                            <ExternalLink className="h-4 w-4 shrink-0 text-indigo-500" />
                                        </div>
                                        <p className="mt-1 text-xs text-slate-500">{manual.note}</p>
                                    </a>
                                ))}
                            </div>
                        </section>

                        <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/30">
                            <div className="mb-2 flex items-center gap-2 font-bold text-emerald-900 dark:text-emerald-200">
                                <Usb className="h-4 w-4" />
                                Langkah 3 — Set Mode USB Keyboard dari PDF
                            </div>
                            <p className="mb-2 text-sm text-emerald-900/80 dark:text-emerald-100/80">
                                Di salah satu PDF di atas, scan barcode ini <strong>berurutan</strong>:
                            </p>
                            <ol className="list-decimal space-y-1 pl-5 text-sm font-mono text-emerald-900 dark:text-emerald-100">
                                <li>Restore All Factory Defaults</li>
                                <li>USB-KBW (atau USB HID Keyboard)</li>
                                <li>Add Suffix CR / Enter (tambah Enter setelah scan)</li>
                            </ol>
                            <p className="mt-3 text-xs text-emerald-800 dark:text-emerald-200">
                                Setelah itu tes di Notepad — harus muncul angka barcode.
                            </p>
                        </section>

                        <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/50">
                            <div className="mb-2 flex items-center gap-2 font-bold">
                                <Zap className="h-4 w-4 text-yellow-500" />
                                Langkah 4 — Cek Daya & Kabel
                            </div>
                            <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                                <li>• Pastikan <strong>lampu indikator</strong> scanner menyala setelah USB dicolok.</li>
                                <li>• Jika ada <strong>konektor listrik bulat</strong> di kabel, colokkan adaptor listrik.</li>
                                <li>• Ganti <strong>kabel USB</strong> — pastikan kabel data, bukan charger saja.</li>
                                <li>• Coba <strong>port USB lain</strong> di laptop.</li>
                                <li>• Scan <strong>barcode garis di kemasan</strong>, bukan QR code di layar.</li>
                            </ul>
                        </section>

                        <section className="rounded-2xl border border-slate-200 p-4">
                            <h3 className="font-bold">Langkah 5 — Hubungi Penjual</h3>
                            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                                Jika semua langkah gagal, hubungi toko tempat Anda beli scanner Tori. Minta:
                            </p>
                            <ul className="mt-2 space-y-1 text-sm text-slate-600 dark:text-slate-400">
                                <li>• Buku manual / kartu barcode konfigurasi</li>
                                <li>• Bantuan set mode USB Keyboard</li>
                                <li>• Ganti unit jika rusak (garansi)</li>
                            </ul>
                        </section>

                        <div className="flex flex-wrap gap-2 pt-2">
                            <Link href={route('sales.scanner-test')} className="btn-primary">
                                Tes Scanner di Web
                            </Link>
                            <Link href={route('sales.pos')} className="btn-muted">
                                Buka Kasir POS
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
