'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { FiCheck } from 'react-icons/fi';

export type BusyState = 'idle' | 'loading' | 'success';

/** The one loading spinner used inside buttons, sized to the icon it replaces. */
export function Spinner({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={`inline-block animate-spin rounded-full border-2 border-current border-t-transparent ${className}`}
    />
  );
}

/**
 * A button's icon in three states: its own icon, a spinner while working, and
 * a check once done. Each state swaps in place, so the button never jumps.
 */
export function BusyIcon({ state, icon }: { state: BusyState; icon: ReactNode }) {
  const reduceMotion = useReducedMotion();
  const content = state === 'loading' ? <Spinner /> : state === 'success' ? <FiCheck /> : icon;
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.span
        key={state}
        className="inline-grid place-items-center"
        initial={reduceMotion ? false : { opacity: 0, scale: state === 'success' ? 0.5 : 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={reduceMotion ? undefined : { opacity: 0, scale: 0.8 }}
        transition={state === 'success' ? { type: 'spring', duration: 0.35, bounce: 0.35 } : { duration: 0.12 }}
      >
        {content}
      </motion.span>
    </AnimatePresence>
  );
}

const SUCCESS_HOLD_MS = 700;

/**
 * Drives a BusyIcon: `start()` when the action begins, `await succeed()` once
 * it worked (resolves after the check has shown, so close or navigate then),
 * and `reset()` if it failed.
 */
export function useButtonStatus() {
  const [state, setState] = useState<BusyState>('idle');
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const start = useCallback(() => setState('loading'), []);
  const reset = useCallback(() => setState('idle'), []);
  const succeed = useCallback(
    () =>
      new Promise<void>((resolve) => {
        setState('success');
        timer.current = window.setTimeout(() => {
          setState('idle');
          resolve();
        }, SUCCESS_HOLD_MS);
      }),
    [],
  );
  return { state, start, succeed, reset };
}

/**
 * For buttons whose busy flag lives elsewhere (a prop or a transition): shows
 * the spinner while `busy`, then a brief check when it settles, unless the
 * action reported a failure.
 */
export function useBusyFeedback(busy: boolean, failed = false): BusyState {
  const [settled, setSettled] = useState<'idle' | 'success'>('idle');
  const wasBusy = useRef(busy);
  useEffect(() => {
    if (wasBusy.current && !busy && !failed) {
      setSettled('success');
      const id = window.setTimeout(() => setSettled('idle'), SUCCESS_HOLD_MS);
      wasBusy.current = busy;
      return () => window.clearTimeout(id);
    }
    wasBusy.current = busy;
  }, [busy, failed]);
  return busy ? 'loading' : settled;
}
