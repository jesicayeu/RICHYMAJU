import axios from 'axios';

const HEARTBEAT_MS = 25_000;

function csrfToken(): string {
    return document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '';
}

export async function sendPresenceHeartbeat(): Promise<void> {
    await axios.post(route('presence.heartbeat'));
}

export async function markPresenceOffline(): Promise<void> {
    try {
        await axios.post(route('presence.away'));
    } catch {
        /* tab may already be closing */
    }
}

export function beaconPresenceOffline(): void {
    const token = csrfToken();
    if (!token || typeof navigator.sendBeacon !== 'function') {
        return;
    }

    const body = new URLSearchParams({ _token: token });
    navigator.sendBeacon(route('presence.away'), body);
}

export function startPresenceTracking(): () => void {
    let intervalId: number | undefined;

    const ping = () => {
        if (document.visibilityState !== 'visible') {
            return;
        }
        void sendPresenceHeartbeat().catch(() => {});
    };

    const onVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
            ping();
        }
    };

    const onPageHide = () => {
        beaconPresenceOffline();
    };

    ping();
    intervalId = window.setInterval(ping, HEARTBEAT_MS);
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('pagehide', onPageHide);

    return () => {
        if (intervalId !== undefined) {
            window.clearInterval(intervalId);
        }
        document.removeEventListener('visibilitychange', onVisibilityChange);
        window.removeEventListener('pagehide', onPageHide);
        beaconPresenceOffline();
    };
}
