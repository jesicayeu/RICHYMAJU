import { PropsWithChildren, useEffect, useState } from 'react';
import { usePresence } from '@/hooks/usePresence';
import { useTheme } from '@/hooks/useTheme';
import { useIsMobile } from '@/hooks/useIsMobile';
import { markPresenceOffline } from '@/lib/presence';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { motion } from 'framer-motion';
import {
    Barcode,
    LayoutDashboard,
    LogOut,
    Menu,
    MessageSquare,
    Moon,
    Package,
    Receipt,
    Settings,
    ShoppingCart,
    Sun,
    UserCircle,
    Users,
    Wallet,
    X,
} from 'lucide-react';
import { toast } from 'sonner';
import { PageProps } from '@/types';
import { brand } from '@/lib/brand';

type NavItem = {
    href: string;
    label: string;
    icon: typeof LayoutDashboard;
    adminOnly?: boolean;
};

const navItems: NavItem[] = [
    { href: route('dashboard'), label: 'Dashboard', icon: LayoutDashboard },
    { href: route('sales.pos'), label: 'Penjualan', icon: ShoppingCart },
    { href: route('products.index'), label: 'Kelola Produk', icon: Barcode },
    { href: route('transactions.index'), label: 'Transaksi', icon: Receipt },
    { href: route('stocks.index'), label: 'Stok Barang', icon: Package },
    { href: route('debts.index'), label: 'Utang', icon: Wallet },
    { href: route('chat.index'), label: 'Chat', icon: MessageSquare },
    { href: route('profile.edit'), label: 'Profil', icon: UserCircle },
    { href: route('admin.users.index'), label: 'Kelola Akun', icon: Users, adminOnly: true },
    { href: route('admin.settings.index'), label: 'Pengaturan', icon: Settings, adminOnly: true },
];

function NavLinks({
    items,
    showLabels,
    linkClass,
    onNavigate,
}: {
    items: NavItem[];
    showLabels: boolean;
    linkClass: (active: boolean) => string;
    onNavigate?: () => void;
}) {
    return (
        <>
            {items.map((item) => {
                const Icon = item.icon;
                const active = window.location.pathname.startsWith(
                    new URL(item.href, window.location.origin).pathname,
                );

                return (
                    <Link
                        key={item.label}
                        href={item.href}
                        onClick={onNavigate}
                        className={linkClass(active)}
                    >
                        <Icon className="h-5 w-5 shrink-0" />
                        {showLabels && <span>{item.label}</span>}
                    </Link>
                );
            })}
        </>
    );
}

export default function AppLayout({ title, children }: PropsWithChildren<{ title: string }>) {
    const { auth, flash } = usePage<PageProps>().props;
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const isMobile = useIsMobile();
    const { isDark, toggleTheme } = useTheme();
    const isChatPage = title === 'Chat';

    usePresence(Boolean(auth?.user));

    const logout = () => {
        void markPresenceOffline().finally(() => {
            router.post(route('logout'));
        });
    };

    useEffect(() => {
        if (flash?.success) toast.success(flash.success);
    }, [flash?.success]);

    useEffect(() => {
        if (flash?.error) toast.error(flash.error);
    }, [flash?.error]);

    useEffect(() => {
        if (!isMobile) {
            setMobileMenuOpen(false);
        }
    }, [isMobile]);

    useEffect(() => {
        if (isChatPage) {
            document.documentElement.style.overflow = 'hidden';
            document.body.style.overflow = 'hidden';
            return () => {
                document.documentElement.style.overflow = '';
                document.body.style.overflow = '';
            };
        }
        document.body.style.overflow = mobileMenuOpen && isMobile ? 'hidden' : '';
        return () => {
            document.body.style.overflow = '';
        };
    }, [mobileMenuOpen, isMobile, isChatPage]);

    const visibleNav = navItems.filter((item) => !item.adminOnly || auth.user.role === 'admin');
    const primaryNavLabels = ['Dashboard', 'Penjualan', 'Kelola Produk', 'Transaksi', 'Stok Barang', 'Utang'];
    const primaryNav = visibleNav.filter((item) => primaryNavLabels.includes(item.label));
    const mobileBottomNav = primaryNav;

    const isNavActive = (href: string) =>
        window.location.pathname.startsWith(new URL(href, window.location.origin).pathname);

    const navLinkClass = (active: boolean) =>
        `group flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
            active ? brand.navActive : brand.navIdle
        }`;

    const closeMobileMenu = () => setMobileMenuOpen(false);

    return (
        <div className="min-h-screen text-slate-900 dark:text-slate-100">
            <Head title={title} />

            {!isMobile && (
                <aside className="surface-panel fixed inset-y-0 left-0 z-30 flex w-72 flex-col border-r">
                    <div className="flex h-20 shrink-0 items-center gap-3 px-6">
                        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-logo text-lg font-black text-white shadow-brand">
                            RM
                        </div>
                        <div>
                            <div className="text-lg font-black tracking-tight">Richy Maju</div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">Aplikasi Akuntansi</div>
                        </div>
                    </div>

                    <nav className="scrollbar-hidden min-h-0 flex-1 space-y-2 overflow-y-auto px-4 pb-6">
                        <NavLinks items={visibleNav} showLabels linkClass={navLinkClass} />
                    </nav>
                </aside>
            )}

            {isMobile && mobileMenuOpen && (
                <button
                    type="button"
                    aria-label="Tutup menu"
                    className="mobile-drawer-backdrop fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm"
                    onClick={closeMobileMenu}
                />
            )}

            {isMobile && (
                <aside
                    className={`mobile-drawer surface-panel fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r transition-transform duration-300 ${
                        mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
                    }`}
                >
                    <div className="flex h-20 items-center justify-between gap-3 px-6">
                        <div className="flex items-center gap-3">
                            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-logo text-lg font-black text-white shadow-brand">
                                RM
                            </div>
                            <div>
                                <div className="text-lg font-black tracking-tight">Richy Maju</div>
                                <div className="text-xs text-slate-500 dark:text-slate-400">Aplikasi Akuntansi</div>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={closeMobileMenu}
                            className="btn-muted !rounded-full !p-3"
                            aria-label="Tutup menu"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    <nav className="scrollbar-hidden flex-1 space-y-2 overflow-y-auto px-4 pb-6">
                        <NavLinks
                            items={visibleNav}
                            showLabels
                            linkClass={navLinkClass}
                            onNavigate={closeMobileMenu}
                        />
                    </nav>
                </aside>
            )}

            <main
                className={`min-w-0 overflow-x-hidden ${!isMobile ? 'lg:pl-72' : ''} ${
                    isChatPage ? 'flex h-dvh max-h-dvh flex-col overflow-hidden' : ''
                }`}
            >
                <header className="surface-panel sticky top-0 z-20 border-b px-4 py-4 sm:px-8">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex min-w-0 items-center gap-3">
                            {isMobile && (
                                <button
                                    type="button"
                                    onClick={() => setMobileMenuOpen(true)}
                                    className="mobile-menu-btn grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand-logo text-sm font-black text-white shadow-brand"
                                    aria-label="Buka menu"
                                >
                                    RM
                                </button>
                            )}
                            <div className="min-w-0">
                                <p className={`text-xs font-semibold uppercase tracking-[0.3em] ${brand.label}`}>
                                    {auth.user.role === 'admin' ? 'Pemilik Toko' : 'Kasir'}
                                </p>
                                <h1 className="truncate text-2xl font-black tracking-tight">{title}</h1>
                            </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-3">
                            <button onClick={toggleTheme} className="btn-muted !rounded-full !p-3">
                                {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                            </button>
                            <Link
                                href={route('profile.edit')}
                                className="btn-muted hidden items-center gap-3 !px-3 !py-1.5 sm:flex"
                            >
                                {auth.user.avatar_url ? (
                                    <img
                                        src={auth.user.avatar_url}
                                        alt={auth.user.display_name || auth.user.name}
                                        className="h-9 w-9 shrink-0 rounded-xl object-cover shadow-md shadow-indigo-500/20"
                                    />
                                ) : (
                                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-logo text-sm font-black text-white shadow-brand">
                                        {(auth.user.display_name || auth.user.name || auth.user.username || '?')
                                            .charAt(0)
                                            .toUpperCase()}
                                    </div>
                                )}
                                <div>
                                    <div className="text-sm font-bold">{auth.user.display_name || auth.user.name}</div>
                                    <div className="text-xs text-slate-500">@{auth.user.username}</div>
                                </div>
                            </Link>
                            <button
                                onClick={logout}
                                className="btn-muted !rounded-full !p-3"
                                title="Logout"
                            >
                                <LogOut className="h-4 w-4" />
                            </button>
                        </div>
                    </div>

                    {isMobile && (
                        <nav
                            className="scrollbar-hidden -mx-4 mt-3 flex gap-2 overflow-x-auto border-t border-slate-100 px-4 pt-3 dark:border-slate-800 sm:-mx-8 sm:px-8"
                            aria-label="Navigasi halaman"
                        >
                            {primaryNav.map((item) => {
                                const Icon = item.icon;
                                const active = isNavActive(item.href);

                                return (
                                    <Link
                                        key={item.label}
                                        href={item.href}
                                        onClick={closeMobileMenu}
                                        className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition sm:text-sm ${
                                            active
                                                ? 'bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-md shadow-indigo-500/25 dark:from-indigo-600 dark:to-indigo-600'
                                                : brand.navIdle
                                        }`}
                                    >
                                        <Icon className="h-4 w-4 shrink-0" />
                                        <span>{item.label}</span>
                                    </Link>
                                );
                            })}
                        </nav>
                    )}
                </header>

                <motion.section
                    key={title}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.22 }}
                    className={
                        isChatPage
                            ? `flex min-h-0 flex-1 flex-col overflow-hidden ${isMobile ? 'p-4 pb-28' : 'p-4 sm:p-8'}`
                            : isMobile
                              ? 'p-4 pb-28'
                              : 'p-4 sm:p-8'
                    }
                >
                    {children}
                </motion.section>
            </main>

            {isMobile && (
                <nav
                    className="mobile-bottom-nav surface-panel fixed inset-x-0 bottom-0 z-50 border-t"
                    aria-label="Navigasi utama"
                >
                    <div className="grid grid-cols-6 gap-1 px-2 py-2">
                        {mobileBottomNav.map((item) => {
                            const Icon = item.icon;
                            const active = isNavActive(item.href);

                            return (
                                <Link
                                    key={item.label}
                                    href={item.href}
                                    onClick={closeMobileMenu}
                                    className={`flex flex-col items-center gap-1 rounded-xl px-1 py-2 text-[10px] font-semibold transition ${
                                        active
                                            ? 'bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-md shadow-indigo-500/25 dark:from-indigo-600 dark:to-indigo-600 dark:shadow-none'
                                            : brand.navIdle
                                    }`}
                                >
                                    <Icon className="h-5 w-5 shrink-0" />
                                    <span className="truncate">{item.label.split(' ')[0]}</span>
                                </Link>
                            );
                        })}
                        <button
                            type="button"
                            onClick={() => setMobileMenuOpen(true)}
                            className={`flex flex-col items-center gap-1 rounded-xl px-1 py-2 text-[10px] font-semibold transition ${
                                mobileMenuOpen
                                    ? 'bg-gradient-to-r from-indigo-500 to-violet-500 text-white dark:from-indigo-600 dark:to-indigo-600'
                                    : brand.navIdle
                            }`}
                            aria-label="Menu lainnya"
                        >
                            <Menu className="h-5 w-5 shrink-0" />
                            <span>Lainnya</span>
                        </button>
                    </div>
                </nav>
            )}
        </div>
    );
}
