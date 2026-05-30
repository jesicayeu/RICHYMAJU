import { useEffect, useState } from 'react';

const MOBILE_MAX_WIDTH = 1279;

export function useIsMobile() {
    const [isMobile, setIsMobile] = useState(() => {
        if (typeof window === 'undefined') {
            return false;
        }

        return window.matchMedia(`(max-width: ${MOBILE_MAX_WIDTH}px)`).matches;
    });

    useEffect(() => {
        const media = window.matchMedia(`(max-width: ${MOBILE_MAX_WIDTH}px)`);
        const onChange = () => setIsMobile(media.matches);

        onChange();
        media.addEventListener('change', onChange);

        return () => media.removeEventListener('change', onChange);
    }, []);

    return isMobile;
}
