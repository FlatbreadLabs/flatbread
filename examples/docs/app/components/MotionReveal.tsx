'use client';

import { motion, type Variants } from 'motion/react';
import type { ReactNode } from 'react';

const EASE = [0.22, 1, 0.36, 1] as const;

const variants: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: EASE },
  },
};

type MotionRevealProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
};

/**
 * Fades and lifts its children into view once, when scrolled to. Used for
 * section blocks so the page stays calm: motion is a finish on the typography,
 * not a feature.
 */
export function MotionReveal({ children, className, delay = 0 }: MotionRevealProps) {
  return (
    <motion.div
      className={className}
      variants={variants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
      transition={{ delay }}
    >
      {children}
    </motion.div>
  );
}
