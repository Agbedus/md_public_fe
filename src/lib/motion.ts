import type { Transition, TargetAndTransition, Variants } from "framer-motion";

/**
 * Shared motion primitives for the MD Platform.
 *
 * Everything is tuned to feel *springy, not bouncy* — a small overshoot that
 * settles fast, so interactions read as playful without being wobbly. Pair
 * with the `MotionConfig reducedMotion="user"` wrapper so users who opt out
 * of motion get none of this.
 */

/** Press-and-settle spring for hover states (slightly springy). */
export const spring: Transition = {
  type: "spring",
  stiffness: 420,
  damping: 24,
};

/** Fast, firm spring for taps/presses — little overshoot. */
export const springTap: Transition = {
  type: "spring",
  stiffness: 600,
  damping: 32,
};

/** Softer spring for entrances and layout moves. */
export const springSoft: Transition = {
  type: "spring",
  stiffness: 260,
  damping: 22,
};

/** Gentle lift toward the cursor (cards, rows). */
export const hoverLift: TargetAndTransition = {
  y: -3,
  transition: spring,
};

/** Squash on press (buttons, links). */
export const pressScale: TargetAndTransition = {
  scale: 0.96,
  transition: springTap,
};

/** Small forward nudge for icon rows / list items. */
export const hoverNudge: TargetAndTransition = {
  x: 3,
  transition: spring,
};

/** Fade + rise entrance for single items. */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: springSoft },
};

/** Container that staggers `fadeUp` children on mount. */
export const stagger: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.05, delayChildren: 0.04 },
  },
};

/** Simple pop-in for badges, chips, and dots. */
export const pop: Variants = {
  hidden: { opacity: 0, scale: 0.85 },
  show: {
    opacity: 1,
    scale: 1,
    transition: { type: "spring", stiffness: 500, damping: 24 },
  },
  exit: { opacity: 0, scale: 0.85, transition: { duration: 0.15 } },
};
