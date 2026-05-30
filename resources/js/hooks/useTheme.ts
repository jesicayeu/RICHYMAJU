import { useCallback, useSyncExternalStore } from 'react';
import { applyTheme, getStoredTheme, type Theme, toggleTheme as flipTheme } from '@/lib/theme';

const THEME_CHANGE_EVENT = 'theme-change';

function subscribe(onStoreChange: () => void) {
    window.addEventListener(THEME_CHANGE_EVENT, onStoreChange);

    return () => window.removeEventListener(THEME_CHANGE_EVENT, onStoreChange);
}

function notifyThemeChange() {
    window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
}

export function useTheme() {
    const theme = useSyncExternalStore(subscribe, getStoredTheme, () => 'light' as Theme);

    const setTheme = useCallback((next: Theme) => {
        applyTheme(next);
        notifyThemeChange();
    }, []);

    const toggleTheme = useCallback(() => {
        flipTheme();
        notifyThemeChange();
    }, []);

    return { theme, isDark: theme === 'dark', setTheme, toggleTheme };
}
