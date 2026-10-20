'use client';

import { motion, useReducedMotion } from 'framer-motion';

/**
 * The active-tab background that slides between tabs, as on the landing page.
 * Render it inside the active tab only; tabs sharing an `id` animate between
 * each other. The tab needs `relative isolate` so the pill sits behind its label.
 */
export function TabPill({ id, className = 'bg-ink' }: { id: string; className?: string }) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.span
      layoutId={id}
      aria-hidden="true"
      className={`absolute inset-0 -z-10 rounded-full ${className}`}
      transition={reduceMotion ? { duration: 0 } : { type: 'spring', duration: 0.4, bounce: 0 }}
    />
  );
}
