import { motion } from 'framer-motion';
import { ReactNode } from 'react';

export default function SkyTextShadow({
    children,
    className = '',
    isDark = false,
}: {
    children: ReactNode;
    className?: string;
    isDark?: boolean;
}) {
    const lightShadow = [
        '0 4px 24px rgba(99,102,241,0.18)',
        '0 8px 40px rgba(99,102,241,0.38)',
        '0 4px 24px rgba(99,102,241,0.18)',
    ];
    const darkShadow = [
        '0 4px 24px rgba(99,102,241,0.2)',
        '0 8px 40px rgba(99,102,241,0.45)',
        '0 4px 24px rgba(99,102,241,0.2)',
    ];

    return (
        <motion.span
            className={className}
            animate={{ textShadow: isDark ? darkShadow : lightShadow }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        >
            {children}
        </motion.span>
    );
}
