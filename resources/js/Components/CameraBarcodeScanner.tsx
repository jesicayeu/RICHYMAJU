import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { ScanAddStatusContent, type ScanAddResult } from '@/Components/BarcodeScanner';
import {
    disableTorch,
    enableDefaultTorch,
    getVideoTrackFromElement,
    readTorchSupport,
} from '@/lib/cameraTorch';
import { Camera, CheckCircle2, AlertCircle, Flashlight, FlashlightOff, X } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const BARCODE_FORMATS = [
    Html5QrcodeSupportedFormats.EAN_13,
    Html5QrcodeSupportedFormats.EAN_8,
    Html5QrcodeSupportedFormats.CODE_128,
    Html5QrcodeSupportedFormats.UPC_A,
];

const NATIVE_BARCODE_FORMATS = ['ean_13', 'ean_8', 'code_128', 'upc_a'];

const FOCUS_WIDTH_RATIO = 0.92;
const FOCUS_HEIGHT_RATIO = 0.34;

const VIDEO_CONSTRAINTS = {
    facingMode: { ideal: 'environment' },
    width: { ideal: 1280, min: 640 },
    height: { ideal: 720, min: 480 },
    focusMode: { ideal: 'continuous' },
} as MediaTrackConstraints;

type CameraBarcodeScannerProps = {
    show: boolean;
    onClose: () => void;
    onScan: (barcode: string) => void | ScanAddResult | Promise<void | ScanAddResult>;
    initialStream?: MediaStream | null;
    /** Tetap buka kamera setelah scan agar bisa scan berulang. Default: true */
    continuous?: boolean;
    /** pos = status di atas fokus + tombol Selesai di bawah. compact = tombol X di header */
    cameraLayout?: 'pos' | 'compact';
};

const DUPLICATE_READ_MS = 2000;

type NativeBarcodeDetector = {
    detect: (source: ImageBitmapSource) => Promise<Array<{ rawValue?: string }>>;
};

type NativeBarcodeDetectorCtor = new (options: { formats: string[] }) => NativeBarcodeDetector;

type FocusCrop = {
    sx: number;
    sy: number;
    width: number;
    height: number;
};

function isNativeBarcodeDetectorSupported(): boolean {
    return typeof window !== 'undefined' && 'BarcodeDetector' in window;
}

function focusScanBox(viewfinderWidth: number, viewfinderHeight: number) {
    return {
        width: Math.floor(viewfinderWidth * FOCUS_WIDTH_RATIO),
        height: Math.floor(viewfinderHeight * FOCUS_HEIGHT_RATIO),
    };
}

function getFocusCrop(video: HTMLVideoElement, focusFrame?: HTMLElement | null): FocusCrop | null {
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    if (!vw || !vh) return null;

    if (focusFrame) {
        const videoRect = video.getBoundingClientRect();
        const frameRect = focusFrame.getBoundingClientRect();
        const displayW = videoRect.width;
        const displayH = videoRect.height;

        if (displayW > 0 && displayH > 0) {
            const scale = Math.max(displayW / vw, displayH / vh);
            const renderedW = vw * scale;
            const renderedH = vh * scale;
            const offsetX = (displayW - renderedW) / 2;
            const offsetY = (displayH - renderedH) / 2;
            const relX = frameRect.left - videoRect.left;
            const relY = frameRect.top - videoRect.top;

            let sx = Math.round((relX - offsetX) / scale);
            let sy = Math.round((relY - offsetY) / scale);
            let width = Math.round(frameRect.width / scale);
            let height = Math.round(frameRect.height / scale);

            sx = Math.max(0, Math.min(sx, vw - 1));
            sy = Math.max(0, Math.min(sy, vh - 1));
            width = Math.max(1, Math.min(width, vw - sx));
            height = Math.max(1, Math.min(height, vh - sy));

            return { sx, sy, width, height };
        }
    }

    const width = Math.floor(vw * FOCUS_WIDTH_RATIO);
    const height = Math.floor(vh * FOCUS_HEIGHT_RATIO);

    return {
        sx: Math.floor((vw - width) / 2),
        sy: Math.floor((vh - height) / 2),
        width,
        height,
    };
}

function getVisibleFocusFrame(): HTMLElement | null {
    return document.querySelector<HTMLElement>('.barcode-scanner-overlay .barcode-scanner-focus__frame');
}

async function pickRearCamera(): Promise<string | MediaTrackConstraints> {
    try {
        const cameras = await Html5Qrcode.getCameras();
        if (cameras.length === 0) {
            return VIDEO_CONSTRAINTS;
        }

        const rear = cameras.find((camera) => /back|rear|environment|belakang/i.test(camera.label));
        if (rear) return rear.id;

        if (cameras.length > 1) {
            return cameras[cameras.length - 1].id;
        }

        return cameras[0].id;
    } catch {
        return VIDEO_CONSTRAINTS;
    }
}

async function openCameraStream(camera: string | MediaTrackConstraints): Promise<MediaStream> {
    if (typeof camera === 'string') {
        return navigator.mediaDevices.getUserMedia({
            video: { ...VIDEO_CONSTRAINTS, deviceId: { exact: camera } },
            audio: false,
        });
    }

    return navigator.mediaDevices.getUserMedia({ video: camera, audio: false });
}

function cameraErrorMessage(error: unknown): string {
    const message = error instanceof Error ? error.message : String(error);

    if (/notallowed|permission|denied/i.test(message)) {
        return 'Akses kamera ditolak. Buka pengaturan browser lalu izinkan kamera untuk situs ini.';
    }

    if (/notfound|devicesnotfound/i.test(message)) {
        return 'Kamera tidak ditemukan di perangkat ini.';
    }

    if (/notreadable|in use|busy/i.test(message)) {
        return 'Kamera sedang dipakai aplikasi lain. Tutup aplikasi lain lalu coba lagi.';
    }

    return 'Tidak dapat membuka kamera. Pastikan izin kamera aktif dan halaman dibuka lewat HTTPS.';
}

function ScannerStatusOverlay({ status }: { status: ScanAddResult }) {
    return (
        <div
            className={`barcode-scanner-status w-full rounded-2xl border px-4 py-3 text-sm shadow-lg backdrop-blur-sm ${
                status.success
                    ? 'border-green-400/50 bg-green-950/85 text-green-100'
                    : 'border-rose-400/50 bg-rose-950/85 text-rose-100'
            }`}
        >
            <div className="flex items-start gap-2.5">
                {status.success ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                ) : (
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                )}
                <div className="min-w-0">
                    <ScanAddStatusContent status={status} />
                </div>
            </div>
        </div>
    );
}

function ScannerFocusBox() {
    return (
        <div className="barcode-scanner-focus" aria-hidden>
            <div className="barcode-scanner-focus__frame">
                <span className="barcode-scanner-focus__corner barcode-scanner-focus__corner--tl" />
                <span className="barcode-scanner-focus__corner barcode-scanner-focus__corner--tr" />
                <span className="barcode-scanner-focus__corner barcode-scanner-focus__corner--bl" />
                <span className="barcode-scanner-focus__corner barcode-scanner-focus__corner--br" />
                <span className="barcode-scanner-focus__scanline" />
            </div>
        </div>
    );
}

async function syncTorchState(
    track: MediaStreamTrack | null,
    scanner: Html5Qrcode | null,
): Promise<{ supported: boolean; enabled: boolean }> {
    const supported = readTorchSupport(track, scanner);
    const enabled = supported ? await enableDefaultTorch(track, scanner) : false;
    return { supported, enabled };
}

export default function CameraBarcodeScanner({
    show,
    onClose,
    onScan,
    initialStream = null,
    continuous = true,
    cameraLayout = 'pos',
}: CameraBarcodeScannerProps) {
    const regionId = useId().replace(/:/g, '');
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const trackRef = useRef<MediaStreamTrack | null>(null);
    const ownsStreamRef = useRef(true);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const frameRef = useRef<number>();
    const scanTickRef = useRef(0);
    const scanningRef = useRef(false);
    const processingRef = useRef(false);
    const lastReadRef = useRef<{ code: string; at: number } | null>(null);
    const continuousRef = useRef(continuous);
    const onScanRef = useRef(onScan);
    const onCloseRef = useRef(onClose);
    const initialStreamRef = useRef(initialStream);
    const [error, setError] = useState<string | null>(null);
    const [starting, setStarting] = useState(false);
    const [regionReady, setRegionReady] = useState(false);
    const [torchSupported, setTorchSupported] = useState(false);
    const [torchOn, setTorchOn] = useState(false);
    const [scanStatus, setScanStatus] = useState<ScanAddResult | null>(null);

    useEffect(() => {
        continuousRef.current = continuous;
    }, [continuous]);

    useEffect(() => {
        initialStreamRef.current = initialStream;
    }, [initialStream]);

    useEffect(() => {
        onScanRef.current = onScan;
        onCloseRef.current = onClose;
    }, [onScan, onClose]);

    const handleScanSuccess = async (barcode: string): Promise<boolean> => {
        const code = barcode.trim();
        if (!code || code.length < 3 || processingRef.current) {
            return false;
        }

        const now = Date.now();
        if (
            lastReadRef.current?.code === code &&
            now - lastReadRef.current.at < DUPLICATE_READ_MS
        ) {
            return false;
        }

        lastReadRef.current = { code, at: now };
        processingRef.current = true;

        let scanSuccess = false;

        try {
            const result = await Promise.resolve(onScanRef.current(code));

            if (result && typeof result === 'object' && 'skipped' in result && result.skipped) {
                return false;
            }

            if (result && typeof result === 'object' && 'success' in result) {
                setScanStatus(result);
                scanSuccess = result.success;
            } else {
                setScanStatus({ success: true, barcode: code, name: null });
                scanSuccess = true;
            }

            if (scanSuccess) {
                lastReadRef.current = { code, at: Date.now() };
            }
        } catch {
            setScanStatus({ success: false, barcode: code, name: null });
        }

        processingRef.current = false;

        if (!continuousRef.current) {
            onCloseRef.current();
        }

        return scanSuccess;
    };

    const stopScanner = async () => {
        scanningRef.current = false;
        scanTickRef.current = 0;

        if (frameRef.current) {
            cancelAnimationFrame(frameRef.current);
            frameRef.current = undefined;
        }

        processingRef.current = false;
        lastReadRef.current = null;

        const scanner = scannerRef.current;
        scannerRef.current = null;
        if (scanner) {
            try {
                if (scanner.isScanning) {
                    await scanner.stop();
                }
                scanner.clear();
            } catch {
                // Abaikan error saat cleanup
            }
        }

        const track = trackRef.current;
        trackRef.current = null;
        await disableTorch(track, scanner);

        const video = videoRef.current;
        videoRef.current = null;
        if (video) {
            video.pause();
            video.srcObject = null;
            video.remove();
        }

        canvasRef.current = null;

        const stream = streamRef.current;
        streamRef.current = null;
        if (ownsStreamRef.current) {
            stream?.getTracks().forEach((mediaTrack) => mediaTrack.stop());
        }
        ownsStreamRef.current = true;
    };

    const toggleTorch = async () => {
        if (!torchSupported) return;

        const scanner = scannerRef.current;
        const track = trackRef.current;
        const next = !torchOn;

        if (scanner?.isScanning) {
            try {
                const torch = scanner.getRunningTrackCameraCapabilities().torchFeature();
                await torch.apply(next);
                setTorchOn(next);
                return;
            } catch {
                setTorchOn(false);
                return;
            }
        }

        if (!track) return;

        try {
            if (next) {
                await enableDefaultTorch(track, null);
            } else {
                await disableTorch(track, null);
            }
            setTorchOn(next);
        } catch {
            setTorchOn(false);
        }
    };

    useEffect(() => {
        if (!show) {
            setRegionReady(false);
            return;
        }

        document.body.style.overflow = 'hidden';
        const frame = window.requestAnimationFrame(() => setRegionReady(true));

        return () => {
            window.cancelAnimationFrame(frame);
            document.body.style.overflow = '';
        };
    }, [show]);

    useEffect(() => {
        if (!show) {
            void stopScanner();
            setError(null);
            setStarting(false);
            setTorchSupported(false);
            setTorchOn(false);
            setScanStatus(null);
            lastReadRef.current = null;
            return;
        }

        if (!regionReady) return;

        let cancelled = false;

        const detectFromSource = async (
            detector: NativeBarcodeDetector,
            source: ImageBitmapSource,
        ): Promise<void> => {
            const results = await detector.detect(source);
            for (const result of results) {
                if (result.rawValue) {
                    await handleScanSuccess(result.rawValue);
                }
            }
        };

        const cropFocusFrame = (video: HTMLVideoElement): HTMLCanvasElement | null => {
            const crop = getFocusCrop(video, getVisibleFocusFrame());
            if (!crop) return null;

            let canvas = canvasRef.current;
            if (!canvas) {
                canvas = document.createElement('canvas');
                canvasRef.current = canvas;
            }

            if (canvas.width !== crop.width || canvas.height !== crop.height) {
                canvas.width = crop.width;
                canvas.height = crop.height;
            }

            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            if (!ctx) return null;

            ctx.drawImage(
                video,
                crop.sx,
                crop.sy,
                crop.width,
                crop.height,
                0,
                0,
                crop.width,
                crop.height,
            );

            return canvas;
        };

        const startNativeScanner = async (host: HTMLElement) => {
            const Detector = (window as Window & { BarcodeDetector?: NativeBarcodeDetectorCtor }).BarcodeDetector;
            if (!Detector) return false;

            const prewarmed = initialStreamRef.current;
            let stream: MediaStream;

            if (prewarmed?.active) {
                stream = prewarmed;
                ownsStreamRef.current = false;
            } else {
                const camera = await pickRearCamera();
                stream = await openCameraStream(camera);
                ownsStreamRef.current = true;
            }

            if (cancelled) {
                if (ownsStreamRef.current) {
                    stream.getTracks().forEach((mediaTrack) => mediaTrack.stop());
                }
                return false;
            }

            const track = stream.getVideoTracks()[0];
            const video = document.createElement('video');
            video.setAttribute('playsinline', 'true');
            video.autoplay = true;
            video.muted = true;
            video.srcObject = stream;
            host.replaceChildren(video);

            await video.play();

            streamRef.current = stream;
            videoRef.current = video;
            trackRef.current = track;

            const torchState = await syncTorchState(track, null);
            if (!cancelled) {
                setTorchSupported(torchState.supported);
                setTorchOn(torchState.enabled);
            }

            const detector = new Detector({ formats: NATIVE_BARCODE_FORMATS });
            scanningRef.current = true;
            let busy = false;

            const scanFrame = () => {
                if (cancelled || !scanningRef.current) return;

                frameRef.current = requestAnimationFrame(scanFrame);

                if (busy || video.readyState < HTMLMediaElement.HAVE_ENOUGH_DATA) return;

                busy = true;

                const runDetect = async () => {
                    const focusCanvas = cropFocusFrame(video);
                    if (!focusCanvas) return;

                    await detectFromSource(detector, focusCanvas);
                };

                void runDetect()
                    .catch(() => {})
                    .finally(() => {
                        busy = false;
                    });
            };

            frameRef.current = requestAnimationFrame(scanFrame);
            return true;
        };

        const startFallbackScanner = async (host: HTMLElement) => {
            host.replaceChildren();

            const scanner = new Html5Qrcode(regionId, {
                formatsToSupport: BARCODE_FORMATS,
                useBarCodeDetectorIfSupported: false,
                verbose: false,
            });
            scannerRef.current = scanner;

            const camera = await pickRearCamera();

            await scanner.start(
                camera,
                {
                    fps: 30,
                    disableFlip: true,
                    qrbox: focusScanBox,
                    videoConstraints: VIDEO_CONSTRAINTS,
                },
                (decodedText) => {
                    void handleScanSuccess(decodedText);
                },
                () => {},
            );

            if (cancelled) return;

            const track = getVideoTrackFromElement(host);
            trackRef.current = track;

            const torchState = await syncTorchState(track, scanner);
            if (!cancelled) {
                setTorchSupported(torchState.supported);
                setTorchOn(torchState.enabled);
            }
        };

        const start = async () => {
            setStarting(true);
            setError(null);
            await stopScanner();

            if (cancelled) return;

            const host = document.getElementById(regionId);
            if (!host) {
                if (!cancelled) {
                    setError('Area kamera belum siap. Tutup lalu buka lagi.');
                    setStarting(false);
                }
                return;
            }

            try {
                const useNative = isNativeBarcodeDetectorSupported();
                const started = useNative ? await startNativeScanner(host) : false;

                if (!started) {
                    await startFallbackScanner(host);
                }
            } catch (err) {
                if (!cancelled) {
                    setError(cameraErrorMessage(err));
                    setTorchSupported(false);
                    setTorchOn(false);
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
    }, [show, regionReady, regionId, initialStream]);

    const scannerBody = (
        <>
            <div className="flex shrink-0 items-center justify-between px-4 pb-3 pt-4 text-white sm:px-6 sm:pt-5">
                <div className="flex items-center gap-2">
                    <Camera className="h-5 w-5 text-indigo-300" />
                    <h3 className="text-lg font-black sm:text-xl">Scan Barcode Kamera</h3>
                </div>
                <div className="flex items-center gap-2">
                    {torchSupported && !error && (
                        <button
                            type="button"
                            onClick={() => void toggleTorch()}
                            disabled={starting}
                            className={`rounded-xl p-2.5 transition disabled:opacity-50 ${
                                torchOn ? 'bg-amber-400/90 text-black' : 'bg-white/10 text-white'
                            }`}
                            aria-label={torchOn ? 'Matikan senter' : 'Nyalakan senter'}
                            title={torchOn ? 'Matikan senter' : 'Nyalakan senter'}
                        >
                            {torchOn ? <Flashlight className="h-5 w-5" /> : <FlashlightOff className="h-5 w-5" />}
                        </button>
                    )}
                    {cameraLayout === 'compact' && (
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-xl bg-white/10 p-2.5 text-white"
                            aria-label="Tutup"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    )}
                </div>
            </div>

            {error ? (
                <p className="mx-4 rounded-2xl border border-rose-400/40 bg-rose-950/80 p-4 text-sm text-rose-300 sm:mx-6">
                    {error}
                </p>
            ) : (
                <div className="relative min-h-0 flex-1 overflow-hidden bg-black">
                    <div id={regionId} className="barcode-scanner-region" />
                    <div className={`barcode-scanner-stage barcode-scanner-layout-${cameraLayout}`}>
                        <ScannerFocusBox />
                        {scanStatus ? <ScannerStatusOverlay status={scanStatus} /> : null}
                        {cameraLayout === 'pos' && (
                            <button
                                type="button"
                                onClick={onClose}
                                className="barcode-scanner-done btn-primary w-full !py-4 text-base font-bold"
                            >
                                Selesai
                            </button>
                        )}
                    </div>
                </div>
            )}

            <p className="shrink-0 px-4 py-3 text-center text-xs text-slate-300 sm:px-6 sm:py-4 sm:text-sm">
                {starting
                    ? 'Membuka kamera...'
                    : cameraLayout === 'pos'
                      ? `Arahkan barcode ke kotak fokus. Scan bisa berulang tanpa menutup kamera. Tekan Selesai jika sudah cukup.${
                            torchSupported && torchOn ? ' Senter menyala.' : ''
                        }`
                      : continuous
                        ? `Arahkan barcode ke kotak fokus. Scan bisa berulang tanpa menutup kamera.${
                              torchSupported && torchOn ? ' Senter menyala.' : ''
                          }`
                        : `Letakkan barcode garis lurus di dalam kotak fokus.${
                              torchSupported
                                  ? torchOn
                                      ? ' Senter menyala otomatis.'
                                      : ' Senter tidak dapat dinyalakan di perangkat ini.'
                                  : ' Pastikan pencahayaan cukup.'
                          }`}
            </p>
        </>
    );

    if (!show) return null;

    return createPortal(
        <div className="barcode-scanner-overlay">{scannerBody}</div>,
        document.body,
    );
}
