import Modal from '@/Components/Modal';
import { Camera, RotateCcw, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

type FacingMode = 'user' | 'environment';

export default function CameraCapture({
    show,
    onClose,
    onCapture,
    facingMode = 'user',
}: {
    show: boolean;
    onClose: () => void;
    onCapture: (file: File) => void;
    facingMode?: FacingMode;
}) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [currentFacing, setCurrentFacing] = useState<FacingMode>(facingMode);

    const stopStream = useCallback(() => {
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
    }, []);

    const startCamera = useCallback(async () => {
        setError(null);
        stopStream();

        if (!navigator.mediaDevices?.getUserMedia) {
            setError('Browser tidak mendukung akses kamera.');
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: { ideal: currentFacing } },
                audio: false,
            });
            streamRef.current = stream;

            const video = videoRef.current;
            if (video) {
                video.srcObject = stream;
                await video.play();
            }
        } catch {
            setError('Tidak dapat mengakses kamera. Periksa izin browser.');
        }
    }, [currentFacing, stopStream]);

    useEffect(() => {
        if (show) {
            setCurrentFacing(facingMode);
        }
    }, [show, facingMode]);

    useEffect(() => {
        if (!show) {
            stopStream();
            setError(null);
            return;
        }

        void startCamera();

        return stopStream;
    }, [show, currentFacing, startCamera, stopStream]);

    const capture = () => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas || !video.videoWidth) return;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        if (currentFacing === 'user') {
            ctx.translate(canvas.width, 0);
            ctx.scale(-1, 1);
        }

        ctx.drawImage(video, 0, 0);

        canvas.toBlob(
            (blob) => {
                if (!blob || blob.size === 0) return;
                onCapture(
                    new File([blob], `photo-${Date.now()}.jpg`, {
                        type: blob.type || 'image/jpeg',
                        lastModified: Date.now(),
                    }),
                );
                onClose();
            },
            'image/jpeg',
            0.92,
        );
    };

    return (
        <Modal show={show} onClose={onClose} maxWidth="md">
            <div className="p-4 sm:p-6">
                <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-lg font-black">Ambil Foto</h3>
                    <button type="button" onClick={onClose} className="btn-muted !p-2" aria-label="Tutup">
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {error ? (
                    <p className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-600 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-400">
                        {error}
                    </p>
                ) : (
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className={`aspect-[4/3] w-full rounded-2xl bg-black object-cover ${currentFacing === 'user' ? '-scale-x-100' : ''}`}
                    />
                )}

                <canvas ref={canvasRef} className="hidden" />

                <div className="mt-4 flex flex-wrap justify-center gap-2">
                    <button
                        type="button"
                        onClick={() => setCurrentFacing((mode) => (mode === 'user' ? 'environment' : 'user'))}
                        className="btn-muted !py-2"
                        disabled={!!error}
                    >
                        <RotateCcw className="h-4 w-4" />
                        Balik Kamera
                    </button>
                    <button type="button" onClick={capture} className="btn-primary !py-2" disabled={!!error}>
                        <Camera className="h-4 w-4" />
                        Ambil Foto
                    </button>
                </div>
            </div>
        </Modal>
    );
}
