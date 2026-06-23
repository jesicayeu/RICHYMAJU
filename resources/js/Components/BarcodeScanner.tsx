import { ReactNode } from 'react';
import CameraBarcodeScanner from '@/Components/CameraBarcodeScanner';
import { enableDefaultTorch } from '@/lib/cameraTorch';
import { formatQuantity } from '@/lib/format';
import { playScanBeep } from '@/hooks/useUsbBarcodeScanner';
import { useEffect, useState } from 'react';
import { AlertCircle, Camera, CheckCircle2, ScanLine } from 'lucide-react';

export type ScanAddResult = {
    success: boolean;
    barcode: string;
    name: string | null;
    quantity?: number | null;
    unit?: string | null;
    /** Scan diabaikan (masih cooldown / proses scan lain) */
    skipped?: boolean;
};

export function ScanAddStatusContent({ status }: { status: ScanAddResult }) {
    return (
        <>
            <p className="font-bold">{status.success ? 'Status berhasil' : 'Status gagal'}</p>
            {status.name ? (
                <p className="mt-1">
                    Nama: <span className="font-medium">{status.name}</span>
                </p>
            ) : null}
            <p className="mt-1 font-mono text-xs sm:text-sm">
                ID: <span className="font-bold">{status.barcode}</span>
            </p>
            {status.quantity != null ? (
                <p className="mt-1">
                    Jumlah:{' '}
                    <span className="font-bold tabular-nums">
                        {formatQuantity(status.quantity, status.unit ?? undefined)}
                    </span>
                </p>
            ) : null}
        </>
    );
}

type BarcodeScannerVariant = 'pos' | 'register';

type BarcodeScannerProps = {
    onScan: (barcode: string) => void | ScanAddResult | Promise<void | ScanAddResult>;
    value?: string;
    label?: string;
    placeholder?: string;
    disabled?: boolean;
    beepOnScan?: boolean;
    debug?: boolean;
    /** Gaya tampilan: pos (kasir) atau register (daftar produk). Default: pos */
    variant?: BarcodeScannerVariant;
    /** Kunci scan setelah barcode terisi (cocok untuk form satu produk). */
    lockWhenFilled?: boolean;
    /** Tetap arahkan fokus ke kolom scan (cocok untuk POS). Default: true */
    retainFocus?: boolean;
    /** Kembalikan fokus ke kolom scan setelah berhasil scan. Default: true */
    refocusAfterScan?: boolean;
    /** Ganti input manual default (mis. combobox pencarian produk di POS) */
    manualInput?: ReactNode;
    /** Sembunyikan input manual default */
    hideManualInput?: boolean;
    /** Status tambah produk dari parent (mis. pilih dari combobox) */
    lastAddStatus?: ScanAddResult | null;
    /** Tanpa kotak pembungkus, mis. diletakkan di bawah input barcode */
    embedded?: boolean;
};

/**
 * Input scan barcode USB — cara paling sederhana & andal.
 * Scanner USB = keyboard: ketik angka + Enter ke kolom ini.
 */
export default function BarcodeScanner({
    onScan,
    value,
    label = 'Scan Barcode',
    disabled = false,
    beepOnScan = true,
    debug = false,
    variant = 'pos',
    lockWhenFilled = false,
    manualInput,
    lastAddStatus = null,
    embedded = false,
}: BarcodeScannerProps) {
    const isRegister = variant === 'register';
    const isFilled = lockWhenFilled && Boolean(value?.trim());
    const scanDisabled = disabled || isFilled;
    const [lastScan, setLastScan] = useState<string | null>(null);
    const [internalAddStatus, setInternalAddStatus] = useState<ScanAddResult | null>(null);
    const [keyLog, setKeyLog] = useState<string[]>([]);
    const [showCamera, setShowCamera] = useState(false);
    const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);

    const openCameraScanner = () => {
        if (scanDisabled) return;

        setShowCamera(true);

        void navigator.mediaDevices
            .getUserMedia({
                video: {
                    facingMode: { ideal: 'environment' },
                    width: { ideal: 1280, min: 640 },
                    height: { ideal: 720, min: 480 },
                },
                audio: false,
            })
            .then(async (stream) => {
                const track = stream.getVideoTracks()[0] ?? null;
                if (track) {
                    await enableDefaultTorch(track, null);
                }
                setCameraStream(stream);
            })
            .catch(() => {
                setCameraStream(null);
            });
    };

    const closeCameraScanner = () => {
        setShowCamera(false);
        setCameraStream((current) => {
            current?.getTracks().forEach((track) => track.stop());
            return null;
        });
    };

    useEffect(() => {
        if (!value) setLastScan(null);
    }, [value]);

    const logKey = (msg: string) => {
        if (!debug) return;
        setKeyLog((prev) => [msg, ...prev].slice(0, 8));
    };

    const processScan = async (barcode: string): Promise<ScanAddResult | void> => {
        if (lockWhenFilled && value?.trim()) {
            return;
        }

        if (beepOnScan) playScanBeep();
        logKey(`OK: ${barcode}`);

        const result = await Promise.resolve(onScan(barcode));

        if (result && typeof result === 'object' && 'success' in result) {
            setInternalAddStatus(result);
            setLastScan(null);
            return result;
        }

        setInternalAddStatus(null);
        setLastScan(barcode);
        return { success: true, barcode, name: null };
    };

    const registerButtonClass = `inline-flex w-full flex-nowrap items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700 sm:w-auto ${
        manualInput ? 'mb-3' : ''
    }`;

    const scanButton = (
        <button
            type="button"
            onClick={openCameraScanner}
            disabled={scanDisabled}
            className={
                isRegister
                    ? embedded
                        ? `mt-2 ${registerButtonClass}`
                        : registerButtonClass
                    : `btn-primary flex w-full flex-nowrap items-center justify-center gap-2 whitespace-nowrap !py-3.5 text-sm leading-none sm:text-base ${
                          manualInput ? 'mb-3' : ''
                      }`
            }
        >
            {isRegister ? (
                <ScanLine className="h-4 w-4 shrink-0" />
            ) : (
                <Camera className="h-5 w-5 shrink-0" />
            )}
            <span>{isRegister ? 'Scan Barcode Produk' : 'Scan Barcode dengan Kamera'}</span>
        </button>
    );

    const registerHint =
        isRegister && isFilled ? (
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                Satu produk per pendaftaran. Kosongkan kolom barcode untuk scan ulang.
            </p>
        ) : null;

    return (
        <div className={embedded ? undefined : 'space-y-3'}>
            {label && !embedded ? <span className="block text-sm font-bold">{label}</span> : null}

            {embedded && isRegister ? (
                <>
                    {scanButton}
                    {registerHint}
                </>
            ) : (
            <div
                className={
                    isRegister
                        ? 'overflow-visible rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900/50'
                        : 'overflow-visible rounded-2xl border-2 border-dashed border-indigo-300 bg-indigo-50/50 p-4 dark:border-indigo-800 dark:bg-indigo-950/30'
                }
            >
                {scanButton}

                {registerHint}

                {manualInput ? <div className="relative">{manualInput}</div> : null}

                {!isRegister &&
                    !showCamera &&
                    (() => {
                    const addStatus = lastAddStatus ?? internalAddStatus;

                    if (addStatus) {
                        return (
                            <div
                                className={`mt-3 rounded-xl border px-3 py-2 text-xs ${
                                    addStatus.success
                                        ? 'border-green-200 bg-green-50 text-green-800 dark:border-green-900 dark:bg-green-950/40 dark:text-green-200'
                                        : 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200'
                                }`}
                            >
                                <div className="flex items-start gap-2">
                                    {addStatus.success ? (
                                        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                                    ) : (
                                        <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                                    )}
                                    <div className="min-w-0">
                                        <ScanAddStatusContent status={addStatus} />
                                    </div>
                                </div>
                            </div>
                        );
                    }

                    if (lastScan) {
                        return (
                            <div className="mt-3 flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-800 dark:border-green-900 dark:bg-green-950/40 dark:text-green-200">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                Terakhir berhasil: <span className="font-mono font-bold">{lastScan}</span>
                            </div>
                        );
                    }

                    return null;
                })()}
            </div>
            )}

            {debug && keyLog.length > 0 && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 font-mono text-xs dark:border-slate-700 dark:bg-slate-900">
                    <div className="mb-1 font-bold">Log input (debug):</div>
                    {keyLog.map((line, i) => (
                        <div key={i} className="text-slate-500">
                            {line}
                        </div>
                    ))}
                </div>
            )}

            <CameraBarcodeScanner
                show={showCamera}
                continuous={!isRegister}
                cameraLayout={isRegister ? 'compact' : 'pos'}
                initialStream={cameraStream}
                onClose={closeCameraScanner}
                onScan={(barcode) => {
                    logKey(`Kamera: ${barcode}`);
                    return processScan(barcode);
                }}
            />
        </div>
    );
}
