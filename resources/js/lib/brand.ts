/** Palet brand Richy Maju — Aurora (indigo + cyan), modern & konsisten */

export const brand = {
    gradient: 'from-indigo-500 via-violet-500 to-cyan-500',
    gradientText: 'bg-gradient-to-r from-indigo-500 via-violet-500 to-cyan-500 bg-clip-text text-transparent',
    gradientBtn: 'bg-gradient-to-r from-indigo-500 via-violet-500 to-cyan-500',
    logo: 'bg-gradient-to-br from-indigo-500 via-violet-500 to-cyan-500',
    logoDark: 'dark:from-indigo-600 dark:via-violet-600 dark:to-indigo-600',
    navActive:
        'bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-md shadow-indigo-500/25 dark:from-indigo-600 dark:to-indigo-600 dark:shadow-none',
    navIdle:
        'text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100',
    label: 'text-indigo-500 dark:text-indigo-400',
    pageLight: 'bg-[#f8fafc] bg-brand-mesh',
    pageDark: 'dark:bg-[#0c1222]',
} as const;
