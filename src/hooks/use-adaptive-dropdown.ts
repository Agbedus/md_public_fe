'use client';

import { useCallback, useLayoutEffect, useState } from 'react';
import type { CSSProperties, RefObject } from 'react';

type DropdownSide = 'top' | 'bottom';
type DropdownAlign = 'start' | 'end';

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
  viewportPadding = 12,
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
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const maxViewportWidth = Math.max(0, viewportWidth - viewportPadding * 2);
    const measuredWidth = matchAnchorWidth
      ? anchorRect.width
      : Math.max(dropdown.scrollWidth, dropdown.offsetWidth);
    const naturalWidth = Math.min(measuredWidth, maxViewportWidth);
    const naturalHeight = Math.max(dropdown.scrollHeight, dropdown.offsetHeight);
    const spaceBelow = Math.max(0, viewportHeight - anchorRect.bottom - gap - viewportPadding);
    const spaceAbove = Math.max(0, anchorRect.top - gap - viewportPadding);

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
      Math.max(viewportPadding, top),
      Math.max(viewportPadding, viewportHeight - viewportPadding - renderedHeight),
    );

    let align = preferredAlign;
    let left = preferredAlign === 'start'
      ? anchorRect.left
      : anchorRect.right - naturalWidth;
    const crossesRightEdge = left + naturalWidth > viewportWidth - viewportPadding;
    const crossesLeftEdge = left < viewportPadding;

    if (preferredAlign === 'start' && crossesRightEdge) {
      const endAlignedLeft = anchorRect.right - naturalWidth;
      if (endAlignedLeft >= viewportPadding) {
        left = endAlignedLeft;
        align = 'end';
      }
    } else if (preferredAlign === 'end' && crossesLeftEdge) {
      const startAlignedLeft = anchorRect.left;
      if (startAlignedLeft + naturalWidth <= viewportWidth - viewportPadding) {
        left = startAlignedLeft;
        align = 'start';
      }
    }

    left = Math.min(
      Math.max(viewportPadding, left),
      Math.max(viewportPadding, viewportWidth - viewportPadding - naturalWidth),
    );

    setPosition({
      side,
      align,
      isPositioned: true,
      style: {
        position: 'fixed',
        top,
        left,
        width: matchAnchorWidth ? naturalWidth : undefined,
        maxWidth: maxViewportWidth,
        maxHeight: availableHeight,
        visibility: 'visible',
      },
    });
  }, [anchorRef, dropdownRef, gap, matchAnchorWidth, preferredAlign, preferredSide, viewportPadding]);

  useLayoutEffect(() => {
    if (!isOpen) return;

    const frame = window.requestAnimationFrame(updatePosition);
    const handleViewportChange = () => window.requestAnimationFrame(updatePosition);
    const resizeObserver = new ResizeObserver(handleViewportChange);

    if (anchorRef.current) resizeObserver.observe(anchorRef.current);
    if (dropdownRef.current) resizeObserver.observe(dropdownRef.current);
    window.addEventListener('resize', handleViewportChange);
    window.addEventListener('scroll', handleViewportChange, true);

    return () => {
      window.cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('scroll', handleViewportChange, true);
    };
  }, [anchorRef, dropdownRef, isOpen, updatePosition]);

  return position;
}
