'use client';

import { useEffect, useRef, useState } from 'react';
import { animate, createDrawable, createScope, type Scope } from 'animejs';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

import PipMascot from './pip-mascot';

export type PipActivity = 'ready' | 'thinking' | 'analyzing' | 'writing' | 'error';

interface PipStatusIndicatorProps {
  activity: PipActivity;
}

const LABELS: Record<PipActivity, string> = {
  ready: 'Pip is ready',
  thinking: 'Pip is thinking',
  analyzing: 'Pip is analyzing workspace data',
  writing: 'Pip is writing a response',
  error: 'Pip encountered an error',
};

const PROGRESS_MESSAGES: Partial<Record<PipActivity, string[]>> = {
  thinking: [
    'Understanding your request…',
    'Planning the clearest response…',
    'Connecting the useful details…',
  ],
  analyzing: [
    'Reviewing your workspace data…',
    'Finding the important patterns…',
    'Organizing the report…',
  ],
  writing: ['Writing the response…'],
};

export function PipStatusIndicator({ activity }: PipStatusIndicatorProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const scopeRef = useRef<Scope | null>(null);
  const shouldReduceMotion = useReducedMotion();
  const [progressTick, setProgressTick] = useState(0);

  useEffect(() => {
    const messages = PROGRESS_MESSAGES[activity];
    if (!messages || messages.length < 2) return;
    const interval = window.setInterval(() => setProgressTick((tick) => tick + 1), 1800);
    return () => window.clearInterval(interval);
  }, [activity]);

  useEffect(() => {
    scopeRef.current?.revert();
    if (!rootRef.current || shouldReduceMotion) return;

    scopeRef.current = createScope({ root: rootRef.current }).add(() => {
      if (activity === 'thinking' || activity === 'analyzing') {
        animate(createDrawable('.pip-status-trace'), {
          draw: ['0 0', '0 1'],
          duration: activity === 'analyzing' ? 1350 : 1650,
          ease: 'inOutQuad',
          loop: true,
        });
        animate('.pip-status-glow', {
          scale: [0.8, 1.25],
          opacity: [0.06, 0.2, 0.06],
          duration: 1900,
          ease: 'inOutSine',
          loop: true,
        });
      }

      if (activity === 'writing') {
        animate(createDrawable('.pip-status-trace'), {
          draw: ['0 0', '0 1'],
          duration: 1050,
          ease: 'inOutQuad',
          loop: true,
        });
      }
    });

    return () => {
      scopeRef.current?.revert();
      scopeRef.current = null;
    };
  }, [activity, shouldReduceMotion]);

  const progressMessages = PROGRESS_MESSAGES[activity];
  const progressMessage = progressMessages?.[progressTick % progressMessages.length];

  return (
    <div
      ref={rootRef}
      role="status"
      aria-live="polite"
      aria-label={LABELS[activity]}
      title={LABELS[activity]}
      className="relative flex min-h-7 items-center justify-end gap-2"
    >
      <AnimatePresence mode="wait" initial={false}>
        {progressMessage && (
          <motion.span
            key={progressMessage}
            initial={shouldReduceMotion ? false : { opacity: 0, y: 2 }}
            animate={{ opacity: 1, y: 0 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -2 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="hidden max-w-52 truncate text-[10px] font-medium text-text-muted sm:block"
          >
            {progressMessage}
          </motion.span>
        )}
      </AnimatePresence>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={activity}
          initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.82, y: 1 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.88, y: -1 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="relative flex h-7 w-7 shrink-0 items-center justify-center"
        >
          {(activity === 'thinking' || activity === 'analyzing') && (
            <>
              <span className={`pip-status-glow absolute inset-0 rounded-full blur-md ${activity === 'analyzing' ? 'bg-purple-500' : 'bg-indigo-500'}`} aria-hidden="true" />
              <svg viewBox="0 0 28 28" className={`relative h-6 w-6 ${activity === 'analyzing' ? 'text-purple-500' : 'text-indigo-500'}`} fill="none" aria-hidden="true">
                <path className="pip-status-trace" d="M13.9 23.2c-2.2 0-3.5-1.1-3.8-3-2.1.1-3.6-1.5-3.3-3.5-1.8-.8-2.2-3.1-.8-4.5-1-1.8.2-4 2.2-4.2.2-2.1 2.3-3.3 4.1-2.4.5-1.3 2.8-1.3 3.3 0 1.9-.9 4 .3 4.1 2.4 2 .2 3.2 2.4 2.2 4.2 1.4 1.4 1 3.7-.8 4.5.3 2-1.2 3.6-3.3 3.5-.3 1.9-1.6 3-3.8 3V5.6" stroke="currentColor" strokeWidth="1.55" strokeLinecap="round" strokeLinejoin="round" />
                <path className="pip-status-trace" d="M10.1 9.1c1.8.1 2.9 1.2 3.8 2.7m4-2.7c-1.8.1-2.9 1.2-3.8 2.7m-7.3 4.9c1.3-.8 2.8-.7 4.1.2m10.3-.2c-1.3-.8-2.8-.7-4.1.2M10 20.2c.2-1.5 1-2.5 2.3-3.1m5.7 3.1c-.2-1.5-1-2.5-2.3-3.1" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
              </svg>
            </>
          )}

          {activity === 'writing' && (
            <svg viewBox="0 0 28 28" className="h-6 w-6 text-indigo-500" fill="none" aria-hidden="true">
              <path className="pip-status-trace" d="M6.2 21.8 7.5 17 18.2 6.3c.9-.9 2.3-.9 3.2 0l.3.3c.9.9.9 2.3 0 3.2L11 20.5l-4.8 1.3Z" stroke="currentColor" strokeWidth="1.55" strokeLinecap="round" strokeLinejoin="round" />
              <path className="pip-status-trace" d="m16.8 7.7 3.5 3.5M7.5 17l3.5 3.5M5 23.2h18" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
            </svg>
          )}

          {activity === 'ready' && <PipMascot variant="classic" status="idle" size="xs" />}
          {activity === 'error' && <PipMascot variant="sleepy" status="error" size="xs" />}
        </motion.div>
      </AnimatePresence>
      <span className="sr-only">{LABELS[activity]}</span>
    </div>
  );
}
