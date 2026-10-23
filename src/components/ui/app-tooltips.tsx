'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Portal } from './portal';
import { useAdaptiveDropdown } from '@/hooks/use-adaptive-dropdown';

/** Delegated tooltips preserve the layout and refs of their original controls. */
export function AppTooltips() {
  const [tooltip, setTooltip] = useState<{ anchor: Element; text: string } | null>(null);
  const anchorRef = useRef<HTMLElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const id = useId();
  const { style, side } = useAdaptiveDropdown({
    isOpen: tooltip !== null, anchorRef, dropdownRef: tooltipRef,
    preferredSide: 'top', preferredAlign: 'center', gap: 8,
  });

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let lastShown = 0;
    const hide = () => { clearTimeout(timer); setTooltip(null); };
    const show = (event: Event) => {
      if (event instanceof PointerEvent && event.pointerType === 'touch') return;
      const anchor = event.target instanceof Element ? event.target.closest<HTMLElement>('[data-tooltip]') : null;
      const text = anchor?.getAttribute('data-tooltip');
      clearTimeout(timer);
      if (!anchor || !text) { hide(); return; }
      const open = () => {
        anchorRef.current = anchor;
        setTooltip({ anchor, text });
        lastShown = Date.now();
      };
      if (event.type === 'focusin' || Date.now() - lastShown < 600) open();
      else timer = setTimeout(open, 350);
    };
    const leave = (event: PointerEvent) => {
      const anchor = event.target instanceof Element ? event.target.closest('[data-tooltip]') : null;
      if (anchor && event.relatedTarget instanceof Node && anchor.contains(event.relatedTarget)) return;
      hide();
    };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') hide(); };
    document.addEventListener('pointerover', show);
    document.addEventListener('pointerout', leave);
    document.addEventListener('focusin', show);
    document.addEventListener('focusout', hide);
    document.addEventListener('pointerdown', hide);
    document.addEventListener('keydown', escape);
    window.addEventListener('scroll', hide, true);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('pointerover', show);
      document.removeEventListener('pointerout', leave);
      document.removeEventListener('focusin', show);
      document.removeEventListener('focusout', hide);
      document.removeEventListener('pointerdown', hide);
      document.removeEventListener('keydown', escape);
      window.removeEventListener('scroll', hide, true);
    };
  }, []);

  useEffect(() => {
    if (!tooltip) return;
    const previous = tooltip.anchor.getAttribute('aria-describedby');
    tooltip.anchor.setAttribute('aria-describedby', [previous, id].filter(Boolean).join(' '));
    return () => {
      if (previous) tooltip.anchor.setAttribute('aria-describedby', previous);
      else tooltip.anchor.removeAttribute('aria-describedby');
    };
  }, [id, tooltip]);

  if (!tooltip) return null;
  return (
    <Portal>
      <div ref={tooltipRef} id={id} role="tooltip" style={style} data-side={side}
        className="pointer-events-none z-[10001] max-w-64 whitespace-normal rounded-3xl border border-card-border bg-card px-3.5 py-2.5 text-xs leading-relaxed text-foreground shadow-md">
        {tooltip.text}
      </div>
    </Portal>
  );
}
