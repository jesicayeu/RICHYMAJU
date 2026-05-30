const STORAGE_KEY = 'theme';

export type Theme = 'light' | 'dark';

export function getStoredTheme(): Theme {
    if (typeof window === 'undefined') {
        return 'light';
    }

    return localStorage.getItem(STORAGE_KEY) === 'dark' ? 'dark' : 'light';
}

export function applyTheme(theme: Theme): void {
    if (typeof document === 'undefined') {
        return;
    }

    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem(STORAGE_KEY, theme);
}

export function initTheme(): Theme {
    const theme = getStoredTheme();
    applyTheme(theme);

    return theme;
}

export function toggleTheme(): Theme {
    const next: Theme = getStoredTheme() === 'dark' ? 'light' : 'dark';
    applyTheme(next);

    return next;
}
