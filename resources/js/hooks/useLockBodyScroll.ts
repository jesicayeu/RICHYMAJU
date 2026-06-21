import { useEffect } from 'react';

export function useLockBodyScroll(active = true) {
    useEffect(() => {
        if (!active) return;

        const html = document.documentElement;
        const body = document.body;
        const prevHtmlOverflow = html.style.overflow;
        const prevBodyOverflow = body.style.overflow;

        html.style.overflow = 'hidden';
        body.style.overflow = 'hidden';

        return () => {
            html.style.overflow = prevHtmlOverflow;
            body.style.overflow = prevBodyOverflow;
        };
    }, [active]);
}
