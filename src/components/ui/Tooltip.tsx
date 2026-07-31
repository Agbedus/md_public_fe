import React, { useRef, useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
  style?: React.CSSProperties;
}

export function Tooltip({ content, children, position = 'top', className = "", style }: TooltipProps) {
  const triggerRef = useRef<HTMLDivElement>(null);
  const [show, setShow] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });

  const updatePosition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const gap = 10;
    let top: number, left: number;

    switch (position) {
      case 'top':
        top = rect.top - gap;
        left = rect.left + rect.width / 2;
        break;
      case 'bottom':
        top = rect.bottom + gap;
        left = rect.left + rect.width / 2;
        break;
      case 'left':
        top = rect.top + rect.height / 2;
        left = rect.left - gap;
        break;
      case 'right':
        top = rect.top + rect.height / 2;
        left = rect.right + gap;
        break;
    }

    setCoords({ top, left });
  }, [position]);

  useEffect(() => {
    if (!show) return;
    updatePosition();
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [show, updatePosition]);

  const arrowClass = {
    top: "bottom-0 left-1/2 -translate-x-1/2 translate-y-full border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent border-t-white dark:border-t-zinc-900",
    bottom: "top-0 left-1/2 -translate-x-1/2 -translate-y-full border-l-[6px] border-r-[6px] border-b-[6px] border-l-transparent border-r-transparent border-b-white dark:border-b-zinc-900",
    left: "right-0 top-1/2 -translate-y-1/2 translate-x-full border-t-[6px] border-b-[6px] border-l-[6px] border-t-transparent border-b-transparent border-l-white dark:border-l-zinc-900",
    right: "left-0 top-1/2 -translate-y-1/2 -translate-x-full border-t-[6px] border-b-[6px] border-r-[6px] border-t-transparent border-b-transparent border-r-white dark:border-r-zinc-900",
  }[position];

  const transformOrigin = {
    top: "translate(-50%, -100%)",
    bottom: "translate(-50%, 0)",
    left: "translate(-100%, -50%)",
    right: "translate(0, -50%)",
  }[position];

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        className={`flex items-center justify-center ${className}`}
        style={style}
      >
        {children}
      </div>
      {show && typeof document !== 'undefined' && createPortal(
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            zIndex: 9999,
            pointerEvents: 'none',
            transform: `translate(${coords.left}px, ${coords.top}px) ${transformOrigin}`,
          }}
        >
          <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-[0_4px_24px_-8px_rgba(0,0,0,0.12),0_0_0_1px_rgba(0,0,0,0.02)] dark:shadow-[0_4px_24px_-8px_rgba(0,0,0,0.4),0_0_0_1px_rgba(255,255,255,0.04)] p-3 min-w-[180px] max-w-[260px]">
            {content}
            <div className={`absolute ${arrowClass}`} />
          </div>
        </div>,
        document.body
      )}
    </>
  );
}