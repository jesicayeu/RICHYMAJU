import { motion } from 'framer-motion';

const shadows = [
    { className: 'left-[8%] top-[12%] h-64 w-80', delay: 0, duration: 7 },
    { className: 'right-[5%] top-[28%] h-72 w-96', delay: 1.5, duration: 9 },
    { className: 'left-[30%] bottom-[15%] h-56 w-72', delay: 3, duration: 8 },
    { className: 'right-[25%] bottom-[8%] h-48 w-64', delay: 2, duration: 6 },
];

export default function FloatingShadows({ isDark = false }: { isDark?: boolean }) {
    const blobClass = isDark ? 'bg-indigo-600/15' : 'bg-indigo-400/20';

    return (
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
            {shadows.map((s, i) => (
                <motion.div
                    key={i}
                    className={`absolute rounded-[50%] blur-3xl ${blobClass} ${s.className}`}
                    animate={{
                        y: [0, -25, 10, 0],
                        x: [0, 15, -10, 0],
                        scale: [1, 1.12, 0.95, 1],
                        opacity: isDark ? [0.3, 0.5, 0.35, 0.3] : [0.35, 0.6, 0.45, 0.35],
                    }}
                    transition={{
                        duration: s.duration,
                        repeat: Infinity,
                        ease: 'easeInOut',
                        delay: s.delay,
                    }}
                />
            ))}
        </div>
    );
}
