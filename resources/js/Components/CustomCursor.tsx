import { MotionValue, motion, useMotionValue, useSpring } from 'framer-motion';
import { useEffect, useState } from 'react';
import { getStoredTheme } from '@/lib/theme';

const INTERACTIVE = 'a, button, [data-cursor-hover], input, textarea, select, label';

function TrailDot({
    x,
    y,
    stiffness,
    visible,
    size,
    opacity,
    isDark,
}: {
    x: MotionValue<number>;
    y: MotionValue<number>;
    stiffness: number;
    visible: boolean;
    size: number;
    opacity: number;
    isDark: boolean;
}) {
    const tx = useSpring(x, { stiffness, damping: 22, mass: 0.5 });
    const ty = useSpring(y, { stiffness, damping: 22, mass: 0.5 });

    return (
        <motion.div
            className="pointer-events-none fixed left-0 top-0 z-[9997]"
            style={{ x: tx, y: ty, translateX: '-50%', translateY: '-50%' }}
            animate={{ opacity: visible ? opacity : 0 }}
        >
            <div
                className={`rounded-full bg-gradient-to-r ${
                    isDark ? 'from-indigo-400 to-violet-400' : 'from-indigo-400 to-cyan-400'
                }`}
                style={{ width: size, height: size }}
            />
        </motion.div>
    );
}

export default function CustomCursor() {
    const x = useMotionValue(-100);
    const y = useMotionValue(-100);

    const ringX = useSpring(x, { stiffness: 180, damping: 22, mass: 0.4 });
    const ringY = useSpring(y, { stiffness: 180, damping: 22, mass: 0.4 });
    const glowX = useSpring(x, { stiffness: 90, damping: 18, mass: 0.6 });
    const glowY = useSpring(y, { stiffness: 90, damping: 18, mass: 0.6 });

    const [enabled, setEnabled] = useState(false);
    const [visible, setVisible] = useState(false);
    const [hovering, setHovering] = useState(false);
    const [clicking, setClicking] = useState(false);
    const [isDark, setIsDark] = useState(false);

    useEffect(() => {
        const mq = window.matchMedia('(pointer: fine)');
        const update = () => setEnabled(mq.matches);
        const onTheme = () => setIsDark(getStoredTheme() === 'dark');

        update();
        onTheme();
        mq.addEventListener('change', update);
        window.addEventListener('theme-change', onTheme);

        return () => {
            mq.removeEventListener('change', update);
            window.removeEventListener('theme-change', onTheme);
        };
    }, []);

    useEffect(() => {
        if (!enabled) {
            return;
        }

        const onMove = (e: MouseEvent) => {
            x.set(e.clientX);
            y.set(e.clientY);
            setVisible(true);
            setHovering(!!(e.target as HTMLElement).closest(INTERACTIVE));
        };

        const onLeave = () => setVisible(false);
        const onDown = () => setClicking(true);
        const onUp = () => setClicking(false);

        window.addEventListener('mousemove', onMove);
        document.documentElement.addEventListener('mouseleave', onLeave);
        window.addEventListener('mousedown', onDown);
        window.addEventListener('mouseup', onUp);

        return () => {
            window.removeEventListener('mousemove', onMove);
            document.documentElement.removeEventListener('mouseleave', onLeave);
            window.removeEventListener('mousedown', onDown);
            window.removeEventListener('mouseup', onUp);
        };
    }, [enabled, x, y]);

    if (!enabled) {
        return null;
    }

    return (
        <>
            <TrailDot x={x} y={y} stiffness={110} visible={visible} size={3.5} opacity={isDark ? 0.15 : 0.18} isDark={isDark} />
            <TrailDot x={x} y={y} stiffness={95} visible={visible} size={3} opacity={isDark ? 0.12 : 0.14} isDark={isDark} />
            <TrailDot x={x} y={y} stiffness={80} visible={visible} size={2.5} opacity={isDark ? 0.09 : 0.1} isDark={isDark} />
            <TrailDot x={x} y={y} stiffness={65} visible={visible} size={2} opacity={isDark ? 0.06 : 0.07} isDark={isDark} />

            <motion.div
                className={`pointer-events-none fixed left-0 top-0 z-[9999] ${isDark ? 'mix-blend-screen' : ''}`}
                style={{ x: glowX, y: glowY, translateX: '-50%', translateY: '-50%' }}
                animate={{
                    opacity: visible ? (hovering ? (isDark ? 0.7 : 0.55) : isDark ? 0.45 : 0.35) : 0,
                    scale: clicking ? 0.9 : hovering ? 2.4 : 1.6,
                }}
                transition={{ opacity: { duration: 0.2 }, scale: { type: 'spring', stiffness: 260, damping: 22 } }}
            >
                <div
                    className={`h-32 w-32 rounded-full blur-2xl ${
                        isDark
                            ? 'bg-gradient-to-br from-indigo-500/45 via-violet-500/35 to-indigo-400/40'
                            : 'bg-gradient-to-br from-indigo-300/45 via-violet-300/35 to-cyan-300/40'
                    }`}
                />
            </motion.div>

            <motion.div
                className="pointer-events-none fixed left-0 top-0 z-[9999]"
                style={{ x: ringX, y: ringY, translateX: '-50%', translateY: '-50%' }}
                animate={{
                    opacity: visible ? 1 : 0,
                    scale: clicking ? 0.7 : hovering ? 2.2 : 1,
                }}
                transition={{ scale: { type: 'spring', stiffness: 320, damping: 24 } }}
            >
                <div
                    className={`h-10 w-10 rounded-full border-2 transition-colors duration-300 ${
                        hovering
                            ? isDark
                                ? 'border-indigo-400/80 bg-indigo-500/15 shadow-[0_0_20px_rgba(99,102,241,0.4)]'
                                : 'border-indigo-500/80 bg-indigo-400/15 shadow-[0_0_20px_rgba(99,102,241,0.35)]'
                            : isDark
                              ? 'border-slate-500/50 bg-slate-800/30'
                              : 'border-indigo-400/50 bg-indigo-50/30'
                    }`}
                />
            </motion.div>

            <motion.div
                className="pointer-events-none fixed left-0 top-0 z-[9999]"
                style={{ x, y, translateX: '-50%', translateY: '-50%' }}
                animate={{
                    opacity: visible ? 1 : 0,
                    scale: clicking ? 0.45 : hovering ? 0.3 : 1,
                }}
                transition={{ scale: { type: 'spring', stiffness: 500, damping: 28 } }}
            >
                <div
                    className={`rounded-full shadow-lg transition-all duration-300 ${
                        hovering
                            ? isDark
                                ? 'h-2 w-2 bg-gradient-to-r from-indigo-300 to-violet-300 shadow-indigo-400/60'
                                : 'h-2 w-2 bg-gradient-to-r from-indigo-500 to-cyan-500 shadow-indigo-400/60'
                            : isDark
                              ? 'h-2.5 w-2.5 bg-indigo-400 shadow-indigo-500/50'
                              : 'h-2.5 w-2.5 bg-indigo-500 shadow-indigo-400/40'
                    }`}
                />
            </motion.div>

            {clicking && visible && (
                <motion.div
                    className="pointer-events-none fixed left-0 top-0 z-[9998]"
                    style={{ x, y, translateX: '-50%', translateY: '-50%' }}
                    initial={{ scale: 0.5, opacity: 0.8 }}
                    animate={{ scale: 3, opacity: 0 }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                >
                    <div
                        className={`h-12 w-12 rounded-full border-2 ${
                            isDark ? 'border-indigo-400/50' : 'border-indigo-400/60'
                        }`}
                    />
                </motion.div>
            )}
        </>
    );
}
