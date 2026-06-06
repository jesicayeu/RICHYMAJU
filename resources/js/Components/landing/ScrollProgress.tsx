import { motion, useScroll } from 'framer-motion';

export default function ScrollProgress() {
    const { scrollYProgress } = useScroll();

    return (
        <motion.div
            className="pointer-events-none fixed left-0 right-0 top-0 z-[100] h-[2px] origin-left bg-brand-gradient"
            style={{ scaleX: scrollYProgress }}
        />
    );
}
