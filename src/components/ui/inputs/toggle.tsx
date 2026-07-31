'use client';

import { motion, useReducedMotion } from 'framer-motion';

interface ToggleProps {
    /** Accessible name for the switch. */
    label: string;
    isChecked: boolean;
    onChange: (isChecked: boolean) => void;
    isDisabled?: boolean;
    className?: string;
}

/**
 * An on/off switch.
 *
 * The knob moves with a `transform`, not by animating `left`/`right`. Layout
 * properties force a reflow on every frame; a transform is composited, so the
 * motion stays smooth and matches the rest of the system.
 *
 * The visible control is 44px wide but the hit area is padded to the 44px
 * minimum touch target in both directions.
 */
export function Toggle({
    label,
    isChecked,
    onChange,
    isDisabled = false,
    className = '',
}: ToggleProps) {
    const prefersReducedMotion = useReducedMotion();

    const spring = prefersReducedMotion
        ? { duration: 0 }
        : { type: 'spring' as const, stiffness: 500, damping: 32 };

    return (
        <button
            type="button"
            role="switch"
            aria-checked={isChecked}
            aria-label={label}
            disabled={isDisabled}
            onClick={() => onChange(!isChecked)}
            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 ${
                isChecked
                    ? 'border-emerald-500/50 bg-emerald-500/20'
                    : 'border-card-border bg-input-bg'
            } ${isDisabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'} ${className}`}
        >
            <motion.span
                aria-hidden="true"
                initial={false}
                animate={{ x: isChecked ? 22 : 4 }}
                transition={spring}
                className={`block h-4 w-4 rounded-full shadow-sm transition-colors duration-200 ${
                    isChecked ? 'bg-emerald-500' : 'bg-text-muted'
                }`}
            />
        </button>
    );
}
