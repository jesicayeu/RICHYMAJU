import { startPresenceTracking } from '@/lib/presence';
import { useEffect } from 'react';

/** Tandai online saat halaman web aktif (login), offline saat tab ditutup / logout. */
export function usePresence(enabled = true) {
    useEffect(() => {
        if (!enabled) {
            return;
        }

        return startPresenceTracking();
    }, [enabled]);
}
