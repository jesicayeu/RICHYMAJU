import Modal from '@/Components/Modal';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Camera, X } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';

const BARCODE_FORMATS = [
    Html5QrcodeSupportedFormats.EAN_13,
    Html5QrcodeSupportedFormats.EAN_8,
    Html5QrcodeSupportedFormats.CODE_128,
    Html5QrcodeSupportedFormats.CODE_39,
    Html5QrcodeSupportedFormats.UPC_A,
    Html5QrcodeSupportedFormats.UPC_E,
    Html5QrcodeSupportedFormats.ITF,
    Html5QrcodeSupportedFormats.CODABAR,
];

type CameraBarcodeScannerProps = {
    show: boolean;
    onClose: () => void;
    onScan: (barcode: string) => void;
};

export default function CameraBarcodeScanner({ show, onClose, onScan }: CameraBarcodeScannerProps) {
    const regionId = useId().replace(/:/g, '');
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const lastScanRef = useRef('');
    const [error, setError] = useState<string | null>(null);
    const [starting, setStarting] = useState(false);

    const stopScanner = async () => {
        const scanner = scannerRef.current;
        scannerRef.current = null;
        if (!scanner) return;

        try {
            if (scanner.isScanning) {
                await scanner.stop();
            }
            scanner.clear();
        } catch {
            // Abaikan error saat cleanup
        }
    };

    useEffect(() => {
        if (!show) {
            void stopScanner();
            setError(null);
            setStarting(false);
            lastScanRef.current = '';
            return;
        }

        let cancelled = false;

        const start = async () => {
            setStarting(true);
            setError(null);
            await stopScanner();

            if (cancelled) return;

            const scanner = new Html5Qrcode(regionId, {
                formatsToSupport: BARCODE_FORMATS,
                verbose: false,
            });
            scannerRef.current = scanner;

            try {
                await scanner.start(
                    { facingMode: 'environment' },
                    {
                        fps: 10,
                        qrbox: (viewfinderWidth, viewfinderHeight) => ({
                            width: Math.min(viewfinderWidth * 0.85, 320),
                            height: Math.min(viewfinderHeight * 0.45, 160),
                        }),
                    },
                    (decodedText) => {
                        const barcode = decodedText.trim();
                        if (!barcode || barcode.length < 3 || barcode === lastScanRef.current) return;

                        lastScanRef.current = barcode;
                        onScan(barcode);
                        onClose();
                    },
                    () => {},
                );
            } catch {
                if (!cancelled) {
                    setError('Tidak dapat mengakses kamera. Izinkan akses kamera di browser.');
                }
            } finally {
                if (!cancelled) setStarting(false);
            }
        };

        void start();

        return () => {
            cancelled = true;
            void stopScanner();
        };
    }, [show, regionId, onScan, onClose]);

    return (
        <Modal show={show} onClose={onClose} maxWidth="md">
            <div className="p-4 sm:p-6">
                <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Camera className="h-5 w-5 text-indigo-500" />
                        <h3 className="text-lg font-black">Scan Barcode Kamera</h3>
                    </div>
                    <button type="button" onClick={onClose} className="btn-muted !p-2" aria-label="Tutup">
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {error ? (
                    <p className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-600 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-400">
                        {error}
                    </p>
                ) : (
                    <div className="overflow-hidden rounded-2xl bg-black">
                        <div id={regionId} className="min-h-[240px] w-full [&_video]:!rounded-2xl" />
                    </div>
                )}

                <p className="mt-3 text-center text-xs text-slate-500">
                    {starting
                        ? 'Membuka kamera...'
                        : 'Arahkan kamera ke barcode garis pada kemasan produk.'}
                </p>
            </div>
        </Modal>
    );
}
