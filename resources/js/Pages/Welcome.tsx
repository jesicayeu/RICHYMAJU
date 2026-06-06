import CustomCursor from '@/Components/CustomCursor';
import FloatingShadows from '@/Components/landing/FloatingShadows';
import GradientBorder from '@/Components/landing/GradientBorder';
import Magnetic from '@/Components/landing/Magnetic';
import Marquee from '@/Components/landing/Marquee';
import Particles from '@/Components/landing/Particles';
import ScrollProgress from '@/Components/landing/ScrollProgress';
import SkyShadowBox from '@/Components/landing/SkyShadowBox';
import SkyTextShadow from '@/Components/landing/SkyTextShadow';
import TextReveal from '@/Components/landing/TextReveal';
import TiltCard from '@/Components/landing/TiltCard';
import { brand } from '@/lib/brand';
import { useTheme } from '@/hooks/useTheme';
import { PageProps } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { motion, useScroll, useTransform } from 'framer-motion';
import {
    ArrowRight,
    BarChart3,
    Boxes,
    ChevronDown,
    MessageCircle,
    Moon,
    Receipt,
    Shield,
    Sparkles,
    Sun,
    Wallet,
    Zap,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

const features = [
    {
        icon: Receipt,
        title: 'Transaksi',
        desc: 'Catat pemasukan & pengeluaran, verifikasi data, dan export PDF dalam satu tempat.',
        gradient: 'from-rose-500 to-orange-400',
        glowLight: 'hover:shadow-rose-200/80',
        glowDark: 'hover:shadow-rose-500/15',
    },
    {
        icon: Wallet,
        title: 'Utang',
        desc: 'Pantau utang piutang toko, status pembayaran, dan verifikasi admin secara real-time.',
        gradient: 'from-indigo-600 to-violet-500',
        glowLight: 'hover:shadow-indigo-200/80',
        glowDark: 'hover:shadow-indigo-500/20',
    },
    {
        icon: Boxes,
        title: 'Stok',
        desc: 'Kelola inventori barang, update kuantitas, dan cek ketersediaan stok kapan saja.',
        gradient: 'from-cyan-500 to-indigo-400',
        glowLight: 'hover:shadow-cyan-200/80',
        glowDark: 'hover:shadow-cyan-500/15',
    },
    {
        icon: BarChart3,
        title: 'Dashboard',
        desc: 'Grafik interaktif, ringkasan harian, dan insight bisnis untuk keputusan lebih cepat.',
        gradient: 'from-emerald-500 to-teal-400',
        glowLight: 'hover:shadow-emerald-200/80',
        glowDark: 'hover:shadow-emerald-500/15',
    },
    {
        icon: MessageCircle,
        title: 'Chat Tim',
        desc: 'Komunikasi internal antar kasir dan admin langsung di dalam aplikasi.',
        gradient: 'from-indigo-500 to-violet-500',
        glowLight: 'hover:shadow-indigo-200/80',
        glowDark: 'hover:shadow-violet-500/15',
    },
    {
        icon: Zap,
        title: 'WhatsApp',
        desc: 'Integrasi notifikasi WhatsApp untuk update penting langsung ke ponsel.',
        gradient: 'from-emerald-500 to-green-400',
        glowLight: 'hover:shadow-emerald-200/80',
        glowDark: 'hover:shadow-emerald-500/15',
    },
];

const statsLight = [
    { value: '100%', label: 'Data Terenkripsi', color: 'from-indigo-500 to-violet-500' },
    { value: '24/7', label: 'Akses Real-time', color: 'from-violet-500 to-cyan-500' },
    { value: 'PDF', label: 'Export Laporan', color: 'from-cyan-500 to-indigo-400' },
    { value: 'Multi', label: 'Role Kasir & Admin', color: 'from-indigo-400 to-cyan-400' },
];

const statsDark = [
    { value: '100%', label: 'Data Terenkripsi', color: 'from-indigo-400 to-violet-400' },
    { value: '24/7', label: 'Akses Real-time', color: 'from-emerald-400 to-teal-400' },
    { value: 'PDF', label: 'Export Laporan', color: 'from-cyan-400 to-indigo-400' },
    { value: 'Multi', label: 'Role Kasir & Admin', color: 'from-rose-400 to-orange-400' },
];

const fadeUp = {
    hidden: { opacity: 0, y: 40, filter: 'blur(6px)' },
    visible: (i: number) => ({
        opacity: 1,
        y: 0,
        filter: 'blur(0px)',
        transition: { delay: i * 0.08, duration: 0.7, ease: [0.22, 1, 0.36, 1] as const },
    }),
};

function FloatingBlob({ className, delay = 0 }: { className: string; delay?: number }) {
    return (
        <motion.div
            className={`pointer-events-none absolute rounded-full blur-3xl ${className}`}
            animate={{
                scale: [1, 1.2, 0.9, 1],
                opacity: [0.3, 0.55, 0.4, 0.3],
                rotate: [0, 90, 180, 360],
            }}
            transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut', delay }}
        />
    );
}

function AuroraGrid({ isDark }: { isDark: boolean }) {
    const lineColor = isDark ? 'rgba(99,102,241,0.06)' : 'rgba(99,102,241,0.07)';

    return (
        <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-30 dark:opacity-20">
            <div
                className="absolute inset-0 animate-grid-drift"
                style={{
                    backgroundImage: `linear-gradient(${lineColor} 1px, transparent 1px), linear-gradient(90deg, ${lineColor} 1px, transparent 1px)`,
                    backgroundSize: '60px 60px',
                }}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#f8fafc] dark:to-[#0c1222]" />
        </div>
    );
}

export default function Welcome({ auth }: PageProps) {
    const heroRef = useRef<HTMLDivElement>(null);
    const [navScrolled, setNavScrolled] = useState(false);
    const { isDark, toggleTheme } = useTheme();

    useEffect(() => {
        const sentinel = document.getElementById('nav-sentinel');
        if (!sentinel) return;

        const observer = new IntersectionObserver(
            ([entry]) => setNavScrolled(!entry.isIntersecting),
            { threshold: 0, rootMargin: '-80px 0px 0px 0px' },
        );
        observer.observe(sentinel);

        return () => observer.disconnect();
    }, []);

    const { scrollYProgress } = useScroll({
        target: heroRef,
        offset: ['start start', 'end start'],
    });
    const heroY = useTransform(scrollYProgress, [0, 1], [0, 150]);
    const heroScale = useTransform(scrollYProgress, [0, 1], [1, 0.95]);
    const heroOpacity = useTransform(scrollYProgress, [0, 0.85], [1, 0]);

    const stats = isDark ? statsDark : statsLight;
    const shadowBreathe = isDark ? 'animate-shadow-breathe' : 'animate-shadow-breathe-light';
    const logoShadow = [
        '0 8px 28px -6px rgba(99,102,241,0.3)',
        '0 14px 40px -8px rgba(99,102,241,0.5)',
        '0 8px 28px -6px rgba(99,102,241,0.3)',
    ];
    const ctaIconShadow = [
        '0 12px 40px -8px rgba(99,102,241,0.35)',
        '0 20px 60px -10px rgba(99,102,241,0.55)',
        '0 12px 40px -8px rgba(99,102,241,0.35)',
    ];

    return (
        <>
            <Head title="Richy Maju">
                <link
                    href="https://fonts.bunny.net/css?family=syne:700,800|outfit:400,500,600,700&display=swap"
                    rel="stylesheet"
                />
            </Head>

            <CustomCursor />
            <ScrollProgress />

            <div className="welcome-page relative min-h-screen cursor-none overflow-x-hidden bg-[#f8fafc] bg-brand-mesh font-[Outfit] text-slate-800 selection:bg-indigo-100 selection:text-indigo-900 dark:bg-[#0c1222] dark:text-slate-100 dark:selection:bg-indigo-500/30 dark:selection:text-white [&_a]:cursor-none [&_button]:cursor-none">
                {/* Background */}
                <div className="pointer-events-none fixed inset-0 overflow-hidden">
                    <AuroraGrid isDark={isDark} />
                    <FloatingBlob
                        className="-left-40 -top-40 h-[560px] w-[560px] animate-aurora bg-gradient-to-br from-indigo-300/30 via-violet-300/20 to-cyan-300/25 dark:from-indigo-600/25 dark:to-violet-600/20"
                        delay={0}
                    />
                    <FloatingBlob
                        className="-right-32 top-1/4 h-[480px] w-[480px] animate-aurora bg-gradient-to-br from-violet-200/30 to-cyan-200/25 dark:from-indigo-500/15 dark:to-slate-800/30"
                        delay={3}
                    />
                    <FloatingBlob
                        className="bottom-[-10%] left-1/4 h-[420px] w-[420px] animate-aurora bg-gradient-to-br from-white/80 to-indigo-100/40 dark:from-violet-600/10 dark:to-indigo-600/15"
                        delay={6}
                    />
                    <Particles count={28} isDark={isDark} />
                    <FloatingShadows isDark={isDark} />
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(99,102,241,0.1)_0%,transparent_55%)] dark:bg-[radial-gradient(ellipse_at_top,rgba(99,102,241,0.12)_0%,transparent_55%)]" />
                </div>

                {/* Navbar */}
                <motion.header
                    initial={{ y: -30, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                    className={`sticky top-0 z-50 transition-all duration-500 ${
                        navScrolled
                            ? 'border-b border-slate-200/80 bg-white/85 shadow-lg shadow-indigo-500/5 backdrop-blur-2xl dark:border-slate-700/60 dark:bg-[#0c1222]/85 dark:shadow-indigo-500/5'
                            : 'bg-transparent'
                    }`}
                >
                    <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
                        <Link href="/" className="group flex items-center gap-3" data-cursor-hover>
                            <Magnetic strength={0.4}>
                                <motion.div
                                    whileHover={{ rotate: 8 }}
                                    animate={{ boxShadow: logoShadow }}
                                    transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                                    className="relative grid h-11 w-11 place-items-center overflow-hidden rounded-2xl bg-brand-logo text-sm font-black text-white shadow-brand"
                                >
                                    <div className="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-white/25 to-transparent bg-[length:200%_100%]" />
                                    <span className="relative">RM</span>
                                </motion.div>
                            </Magnetic>
                            <div>
                                <div className="text-lg font-black tracking-tight">Richy Maju</div>
                                <div className="text-xs text-slate-500 dark:text-slate-400">Aplikasi Akuntansi</div>
                            </div>
                        </Link>

                        <div className="flex items-center gap-2 sm:gap-3">
                            <button
                                onClick={toggleTheme}
                                data-cursor-hover
                                className="grid h-10 w-10 place-items-center rounded-2xl border border-slate-200/80 bg-white/80 text-indigo-500 shadow-sm transition hover:bg-indigo-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                                aria-label="Toggle theme"
                            >
                                {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                            </button>

                            {auth.user ? (
                                <Magnetic>
                                    <Link
                                        href={route('dashboard')}
                                        data-cursor-hover
                                        className="group inline-flex items-center gap-2 rounded-2xl bg-brand-gradient px-5 py-2.5 text-sm font-bold text-white shadow-brand transition hover:opacity-95"
                                    >
                                        Dashboard
                                        <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                                    </Link>
                                </Magnetic>
                            ) : (
                                <>
                                    <Link
                                        href={route('login')}
                                        data-cursor-hover
                                        className="rounded-2xl px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-indigo-50 hover:text-indigo-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                                    >
                                        Masuk
                                    </Link>
                                    <Magnetic>
                                        <Link
                                            href={route('register')}
                                            data-cursor-hover
                                            className="group inline-flex items-center gap-2 rounded-2xl bg-brand-gradient px-5 py-2.5 text-sm font-bold text-white shadow-brand transition hover:opacity-95"
                                        >
                                            Daftar
                                            <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                                        </Link>
                                    </Magnetic>
                                </>
                            )}
                        </div>
                    </div>
                </motion.header>
                <div id="nav-sentinel" className="absolute top-0 h-px w-full" />

                {/* Hero */}
                <motion.section
                    ref={heroRef}
                    style={{ y: heroY, scale: heroScale, opacity: heroOpacity }}
                    className="relative z-10 mx-auto max-w-6xl px-6 pb-16 pt-10 sm:pb-24 sm:pt-20"
                >
                    <SkyShadowBox isDark={isDark} className="mb-8 inline-flex rounded-full">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.85, filter: 'blur(8px)' }}
                            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                            transition={{ duration: 0.6 }}
                            className="inline-flex items-center gap-2.5 rounded-full border border-slate-200/80 bg-white/85 px-5 py-2 text-sm shadow-sm backdrop-blur-xl dark:border-slate-700/60 dark:bg-slate-800/60 dark:shadow-none"
                        >
                            <motion.div animate={{ rotate: [0, 15, -15, 0] }} transition={{ duration: 3, repeat: Infinity }}>
                                <Sparkles className={`h-4 w-4 ${brand.label}`} />
                            </motion.div>
                            <span className="text-brand-gradient font-medium">
                                Aplikasi Akuntansi Modern untuk Toko Anda
                            </span>
                        </motion.div>
                    </SkyShadowBox>

                    <h1 className="font-display max-w-4xl text-5xl font-extrabold leading-[1.02] tracking-tight sm:text-6xl lg:text-[5.5rem] lg:leading-[1]">
                        <TextReveal text="Kelola toko dengan" delay={0.1} />
                        <br />
                        <SkyTextShadow isDark={isDark}>
                            <motion.span
                                initial={{ opacity: 0, y: 30, filter: 'blur(10px)' }}
                                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                                transition={{ delay: 0.55, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                                className="animate-gradient-x text-brand-gradient bg-[length:200%_auto]"
                            >
                                data yang hidup
                            </motion.span>
                        </SkyTextShadow>
                    </h1>

                    <motion.p
                        initial={{ opacity: 0, y: 24 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.7, delay: 0.7 }}
                        className="mt-7 max-w-2xl text-lg leading-relaxed text-slate-600 sm:text-xl dark:text-slate-400"
                    >
                        Richy Maju menghadirkan pengalaman manajemen transaksi, stok, utang,
                        dan tim — dengan tampilan modern, animasi halus, dan estetika yang
                        menyesuaikan mode terang maupun gelap.
                    </motion.p>

                    <motion.div
                        initial={{ opacity: 0, y: 24 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.7, delay: 0.85 }}
                        className="mt-10 flex flex-wrap items-center gap-4"
                    >
                        <Magnetic strength={0.35}>
                            <SkyShadowBox isDark={isDark}>
                                <Link
                                    href={auth.user ? route('dashboard') : route('login')}
                                    data-cursor-hover
                                    className="group relative inline-flex items-center gap-3 overflow-hidden rounded-2xl bg-brand-gradient px-8 py-4 text-base font-bold text-white shadow-brand"
                                >
                                    <span className="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-white/20 to-transparent bg-[length:200%_100%]" />
                                    <span className="relative">{auth.user ? 'Buka Dashboard' : 'Mulai Sekarang'}</span>
                                    <ArrowRight className="relative h-5 w-5 transition group-hover:translate-x-1.5" />
                                </Link>
                            </SkyShadowBox>
                        </Magnetic>
                        <Magnetic strength={0.25}>
                            <SkyShadowBox isDark={isDark} delay={0.5}>
                                <a
                                    href="#fitur"
                                    data-cursor-hover
                                    className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/85 px-6 py-4 text-base font-semibold text-slate-700 shadow-sm backdrop-blur-md transition hover:border-indigo-200 hover:bg-white hover:text-indigo-700 dark:border-slate-700/60 dark:bg-slate-800/60 dark:text-slate-200 dark:shadow-none dark:hover:border-slate-600 dark:hover:text-white"
                                >
                                    Lihat Fitur
                                </a>
                            </SkyShadowBox>
                        </Magnetic>
                    </motion.div>

                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }} className="mt-16 flex justify-center sm:mt-20">
                        <motion.a
                            href="#fitur"
                            animate={{ y: [0, 8, 0] }}
                            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                            className="flex flex-col items-center gap-1 text-indigo-400 transition hover:text-indigo-600 dark:text-slate-500 dark:hover:text-indigo-400"
                            data-cursor-hover
                        >
                            <span className="text-xs uppercase tracking-widest">Scroll</span>
                            <ChevronDown className="h-5 w-5" />
                        </motion.a>
                    </motion.div>

                    {/* Stats */}
                    <motion.div
                        initial={{ opacity: 0, y: 50, rotateX: 12 }}
                        animate={{ opacity: 1, y: 0, rotateX: 0 }}
                        transition={{ duration: 0.9, delay: 0.95, ease: [0.22, 1, 0.36, 1] }}
                        className="relative mt-10 sm:mt-14"
                        style={{ perspective: 1200 }}
                    >
                        <motion.div
                            className="absolute -inset-6 rounded-[2rem] bg-indigo-400/15 blur-3xl dark:bg-indigo-600/10"
                            animate={{ opacity: [0.25, 0.5, 0.25], scale: [1, 1.05, 1] }}
                            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
                        />
                        <GradientBorder className={`rounded-3xl ${shadowBreathe}`}>
                            <div className="grid gap-3 p-4 sm:grid-cols-4 sm:p-6">
                                {stats.map((stat, i) => (
                                    <TiltCard key={stat.label}>
                                        <SkyShadowBox isDark={isDark} delay={i * 0.3} className="rounded-2xl">
                                            <motion.div
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: 1.1 + i * 0.1 }}
                                                data-cursor-hover
                                                className="rounded-2xl border border-slate-200/80 bg-white/90 p-5 text-center shadow-sm dark:border-slate-700/50 dark:bg-slate-800/80 dark:shadow-none"
                                            >
                                                <motion.div className="font-display text-2xl font-extrabold sm:text-3xl" whileHover={{ scale: 1.08 }}>
                                                    <span className={`bg-gradient-to-r ${stat.color} bg-clip-text text-transparent`}>{stat.value}</span>
                                                </motion.div>
                                                <div className="mt-1.5 text-xs text-slate-500 sm:text-sm dark:text-slate-400">{stat.label}</div>
                                            </motion.div>
                                        </SkyShadowBox>
                                    </TiltCard>
                                ))}
                            </div>
                        </GradientBorder>
                    </motion.div>
                </motion.section>

                <div className="relative z-10">
                    <Marquee />
                </div>

                {/* Features */}
                <section id="fitur" className="relative z-10 mx-auto max-w-6xl px-6 py-28">
                    <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-100px' }} className="mb-16 text-center">
                        <motion.p custom={0} variants={fadeUp} className={`mb-4 text-sm font-semibold uppercase tracking-[0.25em] ${brand.label}`}>
                            Fitur Lengkap
                        </motion.p>
                        <motion.h2 custom={1} variants={fadeUp} className="font-display text-3xl font-extrabold sm:text-5xl">
                            Semua yang toko butuhkan
                        </motion.h2>
                        <motion.p custom={2} variants={fadeUp} className="mx-auto mt-5 max-w-xl text-slate-500 dark:text-slate-400">
                            Dari pencatatan harian hingga laporan PDF — dalam satu platform yang cepat, cantik, dan mudah digunakan.
                        </motion.p>
                    </motion.div>

                    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                        {features.map((feature, i) => (
                            <motion.div key={feature.title} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-50px' }} custom={i} variants={fadeUp}>
                                <TiltCard className="h-full">
                                    <SkyShadowBox isDark={isDark} delay={i * 0.2} className="h-full rounded-3xl">
                                        <motion.div
                                            data-cursor-hover
                                            className={`group relative h-full overflow-hidden rounded-3xl border border-slate-200/80 bg-white/90 p-6 shadow-sm backdrop-blur-md transition-all duration-500 hover:border-indigo-200/80 hover:shadow-brand dark:border-slate-700/50 dark:bg-slate-800/70 dark:shadow-none dark:hover:border-slate-600 ${isDark ? feature.glowDark : feature.glowLight}`}
                                        >
                                            <div className={`mb-5 inline-flex rounded-2xl bg-gradient-to-br ${feature.gradient} p-3.5 text-white shadow-lg shadow-indigo-200/40 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3 dark:shadow-none`}>
                                                <feature.icon className="h-6 w-6" />
                                            </div>
                                            <h3 className="font-display text-xl font-bold">{feature.title}</h3>
                                            <p className="mt-2.5 text-sm leading-relaxed text-slate-500 dark:text-slate-400">{feature.desc}</p>
                                            <div className={`absolute -bottom-10 -right-10 h-36 w-36 rounded-full bg-gradient-to-br ${feature.gradient} opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-15`} />
                                            <motion.div className="absolute bottom-0 left-0 h-[2px] w-0 bg-gradient-to-r from-transparent via-indigo-400/50 to-transparent transition-all duration-500 group-hover:w-full" />
                                            <motion.div
                                                className="pointer-events-none absolute -bottom-6 left-1/2 h-8 w-3/4 -translate-x-1/2 rounded-full bg-indigo-400/15 blur-xl dark:bg-indigo-500/15"
                                                animate={{ opacity: [0.2, 0.4, 0.2], scaleX: [0.8, 1.1, 0.8] }}
                                                transition={{ duration: 3.5, repeat: Infinity, delay: i * 0.3 }}
                                            />
                                        </motion.div>
                                    </SkyShadowBox>
                                </TiltCard>
                            </motion.div>
                        ))}
                    </div>
                </section>

                {/* CTA */}
                <section className="relative z-10 mx-auto max-w-6xl px-6 pb-28">
                    <motion.div initial={{ opacity: 0, y: 40, scale: 0.96 }} whileInView={{ opacity: 1, y: 0, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}>
                        <GradientBorder className={`overflow-hidden ${shadowBreathe}`}>
                            <div className="relative overflow-hidden p-10 sm:p-14">
                                <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/80 via-white/70 to-cyan-50/60 dark:from-indigo-600/10 dark:via-slate-800/50 dark:to-violet-600/10" />
                                <motion.div className="absolute -left-20 -top-20 h-60 w-60 rounded-full bg-indigo-300/25 blur-3xl dark:bg-indigo-600/15" animate={{ x: [0, 40, 0], y: [0, 30, 0] }} transition={{ duration: 8, repeat: Infinity }} />
                                <motion.div className="absolute -bottom-20 -right-20 h-60 w-60 rounded-full bg-violet-300/20 blur-3xl dark:bg-violet-600/10" animate={{ x: [0, -30, 0], y: [0, -40, 0] }} transition={{ duration: 10, repeat: Infinity }} />

                                <div className="relative flex flex-col items-center text-center">
                                    <Magnetic strength={0.5}>
                                        <motion.div
                                            animate={{ rotate: [0, 6, -6, 0], boxShadow: ctaIconShadow }}
                                            transition={{ duration: 5, repeat: Infinity }}
                                            data-cursor-hover
                                            className="mb-6 grid h-16 w-16 place-items-center rounded-2xl bg-brand-logo text-white shadow-brand"
                                        >
                                            <Shield className="h-8 w-8" />
                                        </motion.div>
                                    </Magnetic>
                                    <h2 className="font-display text-3xl font-extrabold sm:text-5xl">Siap mengelola toko lebih cerdas?</h2>
                                    <p className="mt-5 max-w-lg text-slate-600 dark:text-slate-400">
                                        Bergabung dengan Richy Maju — tampilan biru langit yang segar di siang hari,
                                        dashboard gelap yang elegan di malam hari.
                                    </p>
                                    <Magnetic strength={0.3} className="mt-9">
                                        <SkyShadowBox isDark={isDark}>
                                            <Link
                                                href={auth.user ? route('dashboard') : route('login')}
                                                data-cursor-hover
                                                className="group inline-flex items-center gap-2 rounded-2xl bg-brand-gradient px-9 py-4 text-base font-bold text-white shadow-brand transition hover:scale-[1.04] hover:opacity-95"
                                            >
                                                {auth.user ? 'Masuk ke Dashboard' : 'Login ke Aplikasi'}
                                                <ArrowRight className="h-5 w-5 transition group-hover:translate-x-1" />
                                            </Link>
                                        </SkyShadowBox>
                                    </Magnetic>
                                </div>
                            </div>
                        </GradientBorder>
                    </motion.div>
                </section>

                <footer className="relative z-10 border-t border-slate-200/70 bg-white/60 px-6 py-10 text-center backdrop-blur-sm dark:border-slate-700/60 dark:bg-[#0c1222]/60">
                    <motion.p initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-sm text-slate-400 dark:text-slate-500">
                        © {new Date().getFullYear()} Richy Maju — Aplikasi Manajemen Toko
                    </motion.p>
                </footer>
            </div>
        </>
    );
}
