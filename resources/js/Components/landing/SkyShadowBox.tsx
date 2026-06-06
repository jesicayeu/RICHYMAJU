import { motion } from 'framer-motion';
import { ReactNode } from 'react';

const SHADOW_LIGHT_IDLE = [
    '0 8px 32px -8px rgba(99,102,241,0.2), 0 4px 14px -4px rgba(6,182,212,0.08)',
    '0 18px 56px -12px rgba(99,102,241,0.35), 0 10px 28px -8px rgba(139,92,246,0.12)',
    '0 8px 32px -8px rgba(99,102,241,0.2), 0 4px 14px -4px rgba(6,182,212,0.08)',
];

const SHADOW_LIGHT_HOVER =
    '0 28px 70px -14px rgba(99,102,241,0.42), 0 14px 36px -10px rgba(6,182,212,0.18)';

const SHADOW_DARK_IDLE = [
    '0 8px 32px -8px rgba(99,102,241,0.2), 0 4px 14px -4px rgba(15,23,42,0.4)',
    '0 18px 56px -12px rgba(99,102,241,0.35), 0 10px 28px -8px rgba(15,23,42,0.5)',
    '0 8px 32px -8px rgba(99,102,241,0.2), 0 4px 14px -4px rgba(15,23,42,0.4)',
];

const SHADOW_DARK_HOVER =
    '0 28px 70px -14px rgba(99,102,241,0.45), 0 14px 36px -10px rgba(79,70,229,0.25)';

type SkyShadowBoxProps = {
    children: ReactNode;
    className?: string;
    delay?: number;
    isDark?: boolean;
};

export default function SkyShadowBox({
    children,
    className = '',
    delay = 0,
    isDark = false,
}: SkyShadowBoxProps) {
    const idle = isDark ? SHADOW_DARK_IDLE : SHADOW_LIGHT_IDLE;
    const hover = isDark ? SHADOW_DARK_HOVER : SHADOW_LIGHT_HOVER;

    return (
        <motion.div
            className={className}
            style={{ boxShadow: idle[0] }}
            animate={{ boxShadow: idle }}
            transition={{
                duration: 3.5,
                repeat: Infinity,
                ease: 'easeInOut',
                delay,
            }}
            whileHover={{
                boxShadow: hover,
                y: -5,
                transition: { duration: 0.35 },
            }}
        >
            {children}
        </motion.div>
    );
}
