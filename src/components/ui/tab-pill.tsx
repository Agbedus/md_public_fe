'use client';

import { useLayoutEffect, useRef } from 'react';

/** Last position of the pill in each tab bar, keyed by the bar's DOM node. */
const lastPosition = new WeakMap<Element, { x: number; y: number; w: number; h: number }>();

/**
 * The active-tab background that slides between tabs, as on the landing page.
 * Render it inside the active tab only; the tab needs `relative isolate` so the
 * pill sits behind its label.
 *
 * The slide is scoped to the tab bar it lives in: positions are remembered per
 * bar element and measured relative to it, so a pill never flies in from
 * another page, from a previous visit, or across a scrolling dialog.
 */
export function TabPill({ className = 'bg-ink' }: { id?: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const hasMounted = useRef(false);

  useLayoutEffect(() => {
    const pill = ref.current;
    const tab = pill?.parentElement;
    const bar = tab?.parentElement;
    if (!pill || !tab || !bar) return;

    const tabRect = tab.getBoundingClientRect();
    const barRect = bar.getBoundingClientRect();
    const next = { x: tabRect.left - barRect.left, y: tabRect.top - barRect.top, w: tabRect.width, h: tabRect.height };
    const prev = lastPosition.get(bar);
    lastPosition.set(bar, next);

    // Only a freshly mounted pill (the tab just became active) slides in.
    if (hasMounted.current) return;
    hasMounted.current = true;
    if (!prev || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (prev.x === next.x && prev.y === next.y && prev.w === next.w) return;

    pill.animate(
      [
        { transform: `translate(${prev.x - next.x}px, ${prev.y - next.y}px)`, width: `${prev.w}px`, height: `${prev.h}px` },
        { transform: 'translate(0, 0)', width: `${next.w}px`, height: `${next.h}px` },
      ],
      { duration: 320, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' },
    );
  });

  return <span ref={ref} aria-hidden="true" className={`absolute left-0 top-0 -z-10 h-full w-full rounded-full ${className}`} />;
}
