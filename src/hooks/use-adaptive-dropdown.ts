'use client';

import { useCallback, useLayoutEffect, useState } from 'react';
import type { CSSProperties, RefObject } from 'react';

type DropdownSide = 'top' | 'bottom';
type DropdownAlign = 'start' | 'end' | 'center';

interface AdaptiveDropdownOptions {
  isOpen: boolean;
  anchorRef: RefObject<HTMLElement | null>;
  dropdownRef: RefObject<HTMLElement | null>;
  preferredSide?: DropdownSide;
  preferredAlign?: DropdownAlign;
  gap?: number;
  viewportPadding?: number;
  matchAnchorWidth?: boolean;
}

interface DropdownPosition {
  side: DropdownSide;
  align: DropdownAlign;
  isPositioned: boolean;
  style: CSSProperties;
}

/**
 * Keeps a floating menu inside the viewport. It flips vertically and
 * horizontally when the preferred direction no longer has enough room.
 */
export function useAdaptiveDropdown({
  isOpen,
  anchorRef,
  dropdownRef,
  preferredSide = 'bottom',
  preferredAlign = 'start',
  gap = 8,
  viewportPadding = 16,
  matchAnchorWidth = false,
}: AdaptiveDropdownOptions): DropdownPosition {
  const [position, setPosition] = useState<DropdownPosition>({
    side: preferredSide,
    align: preferredAlign,
    isPositioned: false,
    style: {
      position: 'fixed',
      left: 0,
      top: 0,
      visibility: 'hidden',
    },
  });

  const updatePosition = useCallback(() => {
    const anchor = anchorRef.current;
    const dropdown = dropdownRef.current;
    if (!anchor || !dropdown) return;

    const anchorRect = anchor.getBoundingClientRect();
    const visualViewport = window.visualViewport;
    const viewportLeft = visualViewport?.offsetLeft ?? 0;
    const viewportTop = visualViewport?.offsetTop ?? 0;
    const viewportWidth = visualViewport?.width ?? window.innerWidth;
    const viewportHeight = visualViewport?.height ?? window.innerHeight;
    const viewportRight = viewportLeft + viewportWidth;
    const viewportBottom = viewportTop + viewportHeight;
    const maxViewportWidth = Math.max(0, viewportWidth - viewportPadding * 2);
    const measuredWidth = matchAnchorWidth
      ? anchorRect.width
      : Math.max(dropdown.scrollWidth, dropdown.offsetWidth);
    const naturalWidth = Math.min(measuredWidth, maxViewportWidth);
    const naturalHeight = Math.max(dropdown.scrollHeight, dropdown.offsetHeight);
    const spaceBelow = Math.max(0, viewportBottom - anchorRect.bottom - gap - viewportPadding);
    const spaceAbove = Math.max(0, anchorRect.top - viewportTop - gap - viewportPadding);

    let side = preferredSide;
    const preferredSpace = preferredSide === 'bottom' ? spaceBelow : spaceAbove;
    const oppositeSpace = preferredSide === 'bottom' ? spaceAbove : spaceBelow;
    if (naturalHeight > preferredSpace && oppositeSpace > preferredSpace) {
      side = preferredSide === 'bottom' ? 'top' : 'bottom';
    }

    const availableHeight = side === 'bottom' ? spaceBelow : spaceAbove;
    const renderedHeight = Math.min(naturalHeight, availableHeight);
    let top = side === 'bottom'
      ? anchorRect.bottom + gap
      : anchorRect.top - gap - renderedHeight;
    top = Math.min(
      Math.max(viewportTop + viewportPadding, top),
      Math.max(viewportTop + viewportPadding, viewportBottom - viewportPadding - renderedHeight),
    );

    let align = preferredAlign;
    let left: number;
    if (preferredAlign === 'start') {
      left = anchorRect.left;
    } else if (preferredAlign === 'end') {
      left = anchorRect.right - naturalWidth;
    } else {
      // Centred on the anchor. There is no edge-reversal for this case —
      // the viewport clamp below is what keeps it on screen.
      left = anchorRect.left + anchorRect.width / 2 - naturalWidth / 2;
    }
    const crossesRightEdge = left + naturalWidth > viewportRight - viewportPadding;
    const crossesLeftEdge = left < viewportLeft + viewportPadding;

    if (preferredAlign === 'start' && crossesRightEdge) {
      const endAlignedLeft = anchorRect.right - naturalWidth;
      if (endAlignedLeft >= viewportLeft + viewportPadding) {
        left = endAlignedLeft;
        align = 'end';
      }
    } else if (preferredAlign === 'end' && crossesLeftEdge) {
      const startAlignedLeft = anchorRect.left;
      if (startAlignedLeft + naturalWidth <= viewportRight - viewportPadding) {
        left = startAlignedLeft;
        align = 'start';
      }
    }

    left = Math.min(
      Math.max(viewportLeft + viewportPadding, left),
      Math.max(viewportLeft + viewportPadding, viewportRight - viewportPadding - naturalWidth),
    );

    const right = Math.max(viewportPadding, window.innerWidth - left - naturalWidth);
    const horizontalStyle: CSSProperties = align === 'end'
      ? { right, left: 'auto' }
      : { left, right: 'auto' };

    setPosition({
      side,
      align,
      isPositioned: true,
      style: {
        position: 'fixed',
        top,
        ...horizontalStyle,
        width: matchAnchorWidth ? naturalWidth : undefined,
        maxWidth: maxViewportWidth,
        maxHeight: availableHeight,
        visibility: 'visible',
      },
    });
  }, [anchorRef, dropdownRef, gap, matchAnchorWidth, preferredAlign, preferredSide, viewportPadding]);

  useLayoutEffect(() => {
    if (!isOpen) return;

    let followUpFrame = 0;
    const frame = window.requestAnimationFrame(() => {
      updatePosition();
      followUpFrame = window.requestAnimationFrame(updatePosition);
    });
    const handleViewportChange = () => window.requestAnimationFrame(updatePosition);
    const resizeObserver = new ResizeObserver(handleViewportChange);

    if (anchorRef.current) resizeObserver.observe(anchorRef.current);
    if (dropdownRef.current) resizeObserver.observe(dropdownRef.current);
    window.addEventListener('resize', handleViewportChange);
    window.addEventListener('scroll', handleViewportChange, true);
    window.visualViewport?.addEventListener('resize', handleViewportChange);
    window.visualViewport?.addEventListener('scroll', handleViewportChange);

    return () => {
      window.cancelAnimationFrame(frame);
      window.cancelAnimationFrame(followUpFrame);
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('scroll', handleViewportChange, true);
      window.visualViewport?.removeEventListener('resize', handleViewportChange);
      window.visualViewport?.removeEventListener('scroll', handleViewportChange);
    };
  }, [anchorRef, dropdownRef, isOpen, updatePosition]);

  return position;
}
