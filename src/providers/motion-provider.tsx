"use client";

import { MotionConfig } from "framer-motion";

/**
 * Global motion wrapper. `reducedMotion="user"` makes every Framer Motion
 * animation collapse to near-instant for people who prefer reduced motion,
 * while keeping the full springy feel for everyone else.
 */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
