import React from 'react';

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string; // Allow passing extra classes to the wrapper
  style?: React.CSSProperties;
}

export function Tooltip({ content, children, position = 'top', className = "", style }: TooltipProps) {
  // Simple positioning logic classes
  const positionClasses = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  };

  return (
    <div className={`group relative flex items-center justify-center ${className}`} style={style}>

      {children}
      <div 
        className={`absolute ${positionClasses[position]} hidden group-hover:block whitespace-nowrap rounded-md bg-slate-900 border border-slate-700 px-2 py-1 text-[11px] items-center font-medium text-slate-200  z-50 pointer-events-none animate-in fade-in zoom-in-95 duration-200`}
      >
        {content}
      </div>
    </div>
  );
}
