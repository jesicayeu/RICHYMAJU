import { motion } from 'framer-motion';
import { useMemo } from 'react';

const COLORS_LIGHT = [
    'bg-indigo-400/45',
    'bg-violet-400/40',
    'bg-cyan-400/40',
    'bg-indigo-300/35',
    'bg-violet-500/30',
];

const COLORS_DARK = [
    'bg-indigo-400/40',
    'bg-violet-400/35',
    'bg-emerald-400/30',
    'bg-cyan-400/30',
    'bg-indigo-500/25',
];

export default function Particles({ count = 28, isDark = false }: { count?: number; isDark?: boolean }) {
    const colors = isDark ? COLORS_DARK : COLORS_LIGHT;

    const particles = useMemo(
        () =>
            Array.from({ length: count }, (_, i) => ({
                id: i,
                left: `${(i * 37 + 11) % 100}%`,
                top: `${(i * 53 + 7) % 100}%`,
                size: i % 3 === 0 ? 3 : i % 3 === 1 ? 2 : 1.5,
                delay: (i % 7) * 0.4,
                duration: 4 + (i % 5),
                color: colors[i % colors.length],
            })),
        [count, colors],
    );

    return (
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
            {particles.map((p) => (
                <motion.div
                    key={p.id}
                    className={`absolute rounded-full ${p.color}`}
                    style={{
                        left: p.left,
                        top: p.top,
                        width: p.size,
                        height: p.size,
                    }}
                    animate={{
                        y: [0, -30, 0],
                        x: [0, p.id % 2 === 0 ? 12 : -12, 0],
                        opacity: isDark ? [0.15, 0.5, 0.15] : [0.25, 0.7, 0.25],
                        scale: [1, 1.4, 1],
                    }}
                    transition={{
                        duration: p.duration,
                        repeat: Infinity,
                        ease: 'easeInOut',
                        delay: p.delay,
                    }}
                />
            ))}
        </div>
    );
}
