import BarcodeScanner from '@/Components/BarcodeScanner';
import AppLayout from '@/Layouts/AppLayout';
import { Link } from '@inertiajs/react';
import { ArrowLeft, Keyboard } from 'lucide-react';
import { useState } from 'react';

export default function ScannerTest() {
    const [history, setHistory] = useState<string[]>([]);

    const handleScan = (barcode: string) => {
        setHistory((prev) => [barcode, ...prev].slice(0, 20));
    };

    return (
        <AppLayout title="Tes Scanner">
            <div className="mx-auto max-w-xl space-y-4">
                <div className="flex items-center gap-3">
                    <Link href={route('sales.scanner-setup')} className="btn-muted">
                        <ArrowLeft className="h-4 w-4" /> Setup Scanner
                    </Link>
                    <Link href={route('sales.pos')} className="btn-muted">
                        <ArrowLeft className="h-4 w-4" /> Kembali ke Kasir
                    </Link>
                </div>

                <div className="glass-card p-5">
                    <div className="mb-4 flex items-center gap-2">
                        <Keyboard className="h-6 w-6 text-indigo-500" />
                        <div>
                            <h2 className="text-xl font-black">Tes Koneksi Scanner USB</h2>
                            <p className="text-sm text-slate-500">
                                Halaman ini untuk memastikan scanner Tori terhubung ke laptop & browser.
                            </p>
                        </div>
                    </div>

                    <BarcodeScanner
                        label="Scan di sini untuk tes"
                        onScan={handleScan}
                        debug
                        placeholder="Klik kolom ini, lalu scan barcode..."
                    />

                    <div className="mt-6 rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
                        <h3 className="mb-2 text-sm font-bold">Langkah diagnosa</h3>
                        <ol className="list-decimal space-y-2 pl-5 text-sm text-slate-600 dark:text-slate-400">
                            <li>Colok scanner Tori USB ke laptop.</li>
                            <li>
                                Buka <strong>Notepad</strong>, scan barcode. Harus muncul angka. Jika kosong →
                                masalah scanner/kabel, bukan web.
                            </li>
                            <li>Kembali ke halaman ini, klik kolom scan.</li>
                            <li>Scan lagi. Angka harus muncul di kolom &quot;Membaca: ...&quot;</li>
                            <li>
                                Jika muncul di sini tapi tidak di Kasir → barcode belum terdaftar di Kelola Produk.
                            </li>
                        </ol>
                    </div>

                    {history.length > 0 && (
                        <div className="mt-4">
                            <h3 className="mb-2 text-sm font-bold text-green-600">Riwayat scan berhasil</h3>
                            <ul className="space-y-1 font-mono text-sm">
                                {history.map((code, i) => (
                                    <li key={i} className="rounded-lg bg-green-50 px-3 py-1 dark:bg-green-950/30">
                                        {code}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
