'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { FiX, FiArrowLeft, FiArrowRight, FiCompass } from 'react-icons/fi';
import { Portal } from '@/components/ui/portal';
import { ONBOARDING_TOUR_READY_EVENT } from '@/lib/onboarding-events';

interface TourStep {
  /** Matches a `data-tour="<id>"` attribute somewhere in the dashboard chrome. */
  id: string;
  title: string;
  body: string;
  /** Which side of the target the card opens on. */
  placement: 'right' | 'bottom' | 'top';
}

const STEPS: TourStep[] = [
  { id: 'dashboard', placement: 'right', title: 'Dashboard', body: 'Your home base — a quick summary of your tasks, projects, and what the team has been up to.' },
  { id: 'search', placement: 'bottom', title: 'Search anything', body: 'Click here (or press ⌘K / Ctrl K anywhere) to jump straight to a task, note, project, or person.' },
  { id: 'tasks', placement: 'right', title: 'Tasks', body: 'Create, assign, and track work on a board or table. This is where day-to-day work actually happens.' },
  { id: 'projects', placement: 'right', title: 'Projects', body: 'Group related tasks together and keep an eye on dates, budget, and overall progress.' },
  { id: 'notes', placement: 'right', title: 'Notes', body: "Write and share anything that doesn't fit a task — meeting minutes, research, checklists." },
  { id: 'calendar', placement: 'right', title: 'Calendar', body: 'See events, task due dates, and approved time off side by side, in one shared view.' },
  { id: 'team', placement: 'right', title: 'Team', body: "See everyone in your organization, their roles, and — if you're an admin — manage the roster." },
  { id: 'attendance', placement: 'right', title: 'Attendance', body: "Clock in and out, and see who's currently in the office in real time." },
  { id: 'wiki', placement: 'right', title: 'Wiki', body: "Full documentation on how the platform works — a good first stop whenever you're unsure of something." },
  { id: 'notifications', placement: 'bottom', title: 'Notifications', body: "Assignments, mentions, approvals — anything that needs your attention shows up here first." },
  { id: 'assistant', placement: 'top', title: 'Pip, your assistant', body: 'Ask Pip questions about your work in plain language. It only ever sees what you already have access to.' },
  { id: 'settings', placement: 'top', title: 'Settings', body: 'Manage your personal preferences — notifications, focus timer lengths, and light or dark theme.' },
];

const CARD_WIDTH = 320;
const GAP = 14;

function storageKey(userKey: string) {
  return `md_onboarding_${userKey}`;
}

export function OnboardingTour({ userKey, isInitiallyBlocked = false }: { userKey: string; isInitiallyBlocked?: boolean }) {
  const [active, setActive] = useState(false);
  const [isBlocked, setIsBlocked] = useState(isInitiallyBlocked);
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const attemptsRef = useRef(0);

  useEffect(() => {
    if (!isBlocked) return;
    const release = () => setIsBlocked(false);
    window.addEventListener(ONBOARDING_TOUR_READY_EVENT, release);
    return () => window.removeEventListener(ONBOARDING_TOUR_READY_EVENT, release);
  }, [isBlocked]);

  // Start only after the workspace's initial invitation step is complete.
  // Finishing or skipping the tour still stores the existing per-user flag.
  useEffect(() => {
    if (isBlocked) return;
    try {
      const seen = localStorage.getItem(storageKey(userKey));
      if (!seen) {
        // Let the dashboard chrome finish its first paint before measuring it.
        const t = setTimeout(() => setActive(true), 500);
        return () => clearTimeout(t);
      }
    } catch {
      // localStorage unavailable (private browsing, etc.) — just skip the tour
      // rather than risk throwing on every page load.
    }
  }, [isBlocked, userKey]);

  const finish = useCallback((outcome: 'done' | 'skipped') => {
    try {
      localStorage.setItem(storageKey(userKey), outcome);
    } catch {}
    setActive(false);
  }, [userKey]);

  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Indirection so the retry's setTimeout doesn't close over `measure`
  // directly (a self-reference inside its own useCallback body).
  const measureRef = useRef<() => void>(() => {});

  const measure = useCallback(() => {
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }

    const step = STEPS[stepIndex];
    if (!step) return;
    const el = document.querySelector<HTMLElement>(`[data-tour="${step.id}"]`);
    const r = el?.getBoundingClientRect();

    if (!el || !r || (r.width === 0 && r.height === 0)) {
      // Target isn't on screen (e.g. sidebar section collapsed, mobile
      // viewport hides the sidebar entirely). Retry a couple of times in case
      // it's still animating in, then just skip past this one step rather
      // than get the whole tour stuck.
      attemptsRef.current += 1;
      if (attemptsRef.current > 3) {
        attemptsRef.current = 0;
        setStepIndex((i) => {
          if (i + 1 < STEPS.length) return i + 1;
          finish('done');
          return i;
        });
        return;
      }
      retryTimerRef.current = setTimeout(() => measureRef.current(), 200);
      return;
    }

    attemptsRef.current = 0;
    setRect(r);
  }, [stepIndex, finish]);

  useEffect(() => {
    measureRef.current = measure;
  }, [measure]);

  useEffect(() => {
    if (!active) return;
    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    };
  }, [active, measure]);

  if (!active || !rect) return null;

  const step = STEPS[stepIndex];
  const isLast = stepIndex === STEPS.length - 1;
  const isFirst = stepIndex === 0;

  // Card position, clamped to the viewport so it never spills off-screen.
  let top = 0;
  let left = 0;
  if (step.placement === 'right') {
    top = Math.min(Math.max(rect.top, GAP), window.innerHeight - 220 - GAP);
    left = rect.right + GAP;
  } else if (step.placement === 'bottom') {
    top = rect.bottom + GAP;
    left = Math.min(rect.left, window.innerWidth - CARD_WIDTH - GAP);
  } else {
    top = rect.top - GAP;
    left = Math.min(rect.left + rect.width - CARD_WIDTH, window.innerWidth - CARD_WIDTH - GAP);
  }
  left = Math.max(GAP, Math.min(left, window.innerWidth - CARD_WIDTH - GAP));

  return (
    <Portal>
      {/* Spotlight ring around the current target — no page-dimming overlay,
          this is meant to feel like a guided tooltip, not a blocking modal. */}
      <div
        className="fixed z-[300] rounded-xl ring-2 ring-emerald-500/70 shadow-[0_0_0_4000px_rgba(0,0,0,0.35)] pointer-events-none transition-all duration-300"
        style={{
          top: rect.top - 6,
          left: rect.left - 6,
          width: rect.width + 12,
          height: rect.height + 12,
        }}
      />

      <AnimatePresence mode="wait">
        <motion.div
          key={step.id}
          initial={{ opacity: 0, scale: 0.96, y: step.placement === 'top' ? 8 : -8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.18 }}
          style={{ top, left, width: CARD_WIDTH, transform: step.placement === 'top' ? 'translateY(-100%)' : undefined }}
          className="fixed z-[301] bg-background border border-card-border rounded-2xl shadow-2xl shadow-black/20 p-5"
        >
          <button
            onClick={() => finish('skipped')}
            className="absolute top-3 right-3 p-1 rounded-lg text-text-muted hover:text-foreground hover:bg-foreground/[0.06] transition-colors"
            title="Skip tour"
          >
            <FiX size={14} />
          </button>

          <div className="flex items-center gap-2 mb-2 pr-6">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 shrink-0">
              <FiCompass size={13} />
            </div>
            <h3 className="text-sm font-bold text-foreground">{step.title}</h3>
          </div>

          <p className="text-xs text-text-muted leading-relaxed mb-4">{step.body}</p>

          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">
              {stepIndex + 1} of {STEPS.length}
            </span>
            <div className="flex items-center gap-1.5">
              {!isFirst && (
                <button
                  onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-text-muted hover:text-foreground hover:bg-foreground/[0.05] transition-colors"
                >
                  <FiArrowLeft size={12} /> Back
                </button>
              )}
              <button
                onClick={() => (isLast ? finish('done') : setStepIndex((i) => i + 1))}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 transition-colors"
              >
                {isLast ? 'Finish' : 'Next'}
                {!isLast && <FiArrowRight size={12} />}
              </button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </Portal>
  );
}
