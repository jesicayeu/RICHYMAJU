import type { Html5Qrcode } from 'html5-qrcode';

type TorchCaps = MediaTrackCapabilities & {
    torch?: boolean;
    fillLightMode?: string[];
};

export function readTorchSupport(track: MediaStreamTrack | null, scanner: Html5Qrcode | null = null): boolean {
    if (track) {
        try {
            const caps = track.getCapabilities() as TorchCaps;
            if (caps.torch === true) return true;
            if (caps.fillLightMode?.includes('flash')) return true;
        } catch {
            // Abaikan error capability
        }

        return track.getSettings().facingMode === 'environment';
    }

    if (scanner?.isScanning) {
        try {
            return scanner.getRunningTrackCameraCapabilities().torchFeature().isSupported();
        } catch {
            return false;
        }
    }

    return false;
}

async function tryTrackTorch(track: MediaStreamTrack): Promise<boolean> {
    if (track.readyState !== 'live') return false;

    const torchOn = { advanced: [{ torch: true }] } as unknown as MediaTrackConstraints;
    const torchDirect = { torch: true } as unknown as MediaTrackConstraints;
    const flashOn = { advanced: [{ fillLightMode: 'flash' }] } as unknown as MediaTrackConstraints;

    const attempts = [
        () => track.applyConstraints(torchOn),
        () => track.applyConstraints(torchDirect),
        () => track.applyConstraints(flashOn),
    ];

    for (const attempt of attempts) {
        try {
            await attempt();
            return true;
        } catch {
            // Coba metode berikutnya
        }
    }

    return false;
}

async function tryScannerTorch(scanner: Html5Qrcode | null): Promise<boolean> {
    if (!scanner?.isScanning) return false;

    try {
        const torch = scanner.getRunningTrackCameraCapabilities().torchFeature();
        if (!torch.isSupported()) return false;
        await torch.apply(true);
        return true;
    } catch {
        return false;
    }
}

export async function enableDefaultTorch(
    track: MediaStreamTrack | null,
    scanner: Html5Qrcode | null = null,
): Promise<boolean> {
    if (await tryScannerTorch(scanner)) return true;
    if (track && (await tryTrackTorch(track))) return true;

    const delays = [250, 500, 900];
    for (const delay of delays) {
        await new Promise((resolve) => window.setTimeout(resolve, delay));
        if (await tryScannerTorch(scanner)) return true;
        if (track && (await tryTrackTorch(track))) return true;
    }

    return false;
}

export async function disableTorch(track: MediaStreamTrack | null, scanner: Html5Qrcode | null = null): Promise<void> {
    if (scanner?.isScanning) {
        try {
            const torch = scanner.getRunningTrackCameraCapabilities().torchFeature();
            if (torch.isSupported()) {
                await torch.apply(false);
                return;
            }
        } catch {
            // Lanjut ke track
        }
    }

    if (!track) return;

    const torchOff = { advanced: [{ torch: false }] } as unknown as MediaTrackConstraints;

    try {
        await track.applyConstraints(torchOff);
    } catch {
        // Abaikan error saat mematikan senter
    }
}

export function getVideoTrackFromElement(host: HTMLElement | null): MediaStreamTrack | null {
    if (!host) return null;

    const video = host.querySelector('video');
    const stream = video?.srcObject;
    if (!(stream instanceof MediaStream)) return null;

    return stream.getVideoTracks()[0] ?? null;
}
