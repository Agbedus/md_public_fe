"use client";

import React, { useMemo, useState, useEffect } from 'react';
import { format } from 'date-fns';
import { createPortal } from 'react-dom';
import { FiCheckSquare } from 'react-icons/fi';

interface ActivityItem {
  date: string;
  count: number;
  level: number;
}

interface ActivityHeatmapProps {
  data: ActivityItem[];
  variant?: 'full' | 'compact';
}

const ActivityHeatmap: React.FC<ActivityHeatmapProps> = ({ data, variant = 'compact' }) => {
  const [mounted, setMounted] = useState(false);
  const [hoveredDay, setHoveredDay] = useState<{ day: ActivityItem; x: number; y: number } | null>(null);
  const [period, setPeriod] = useState<number>(90);
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  // Scroll to right on mount and whenever period/data changes
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft = scrollContainerRef.current.scrollWidth;
    }
  }, [mounted, period, data]);

  // Filter data based on period
  const filteredData = useMemo(() => {
    return data.slice(-period);
  }, [data, period]);

  // Group data by weeks
  const weeks = useMemo(() => {
    const result = [];
    for (let i = 0; i < filteredData.length; i += 7) {
      result.push(filteredData.slice(i, i + 7));
    }
    return result;
  }, [filteredData]);

  const getLevelColor = (level: number) => {
    switch (level) {
      case 0: return 'bg-background/50 border border-card-border hover:bg-background/80';
      case 1: return 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30';
      case 2: return 'bg-emerald-500/40 text-emerald-300 hover:bg-emerald-500/50';
      case 3: return 'bg-emerald-500/70 text-emerald-100 hover:bg-emerald-500/80';
      case 4: return 'bg-emerald-400 text-zinc-900 hover:bg-emerald-300';
      default: return 'bg-background/50 border border-card-border';
    }
  };

  const getFunMessage = (count: number) => {
    if (count === 0) return "Peaceful day... 🍃";
    if (count < 3) return `${count} activities! Getting started! 🚀`;
    if (count < 7) return `${count} activities! On a roll! 🔥`;
    if (count < 11) return `${count} activities! Zen Master! 🧘‍♂️`;
    return `${count} activities! UNSTOPPABLE! ⚡️`;
  };

  const months = useMemo(() => {
    const labels: { label: string; offset: number }[] = [];
    weeks.forEach((week, i) => {
      const date = new Date(week[0].date);
      const monthLabel = format(date, 'MMM');
      if (labels.length === 0 || labels[labels.length - 1].label !== monthLabel) {
        labels.push({ label: monthLabel, offset: i });
      }
    });
    return labels;
  }, [weeks]);

  const cellSize = variant === 'compact' ? 'w-2.5 h-2.5' : 'w-3.5 h-3.5';
  const cellGap = variant === 'compact' ? 'gap-1' : 'gap-1.5';
  const cellWidth = variant === 'compact' ? 10 : 14; // Approximate width for alignment
  const gapWidth = variant === 'compact' ? 4 : 6;

  return (
    <div className={`w-full ${variant === 'compact' ? 'space-y-3' : 'space-y-4'}`}>
      {/* Period Selector */}
      <div className="flex justify-between items-center bg-background/50 border border-card-border rounded-lg p-1">
        {[30, 90, 180, 365].map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`flex-1 text-[11px] font-bold py-1 px-2 rounded-md transition-all ${
              period === p 
              ? 'bg-emerald-500/20 text-emerald-400 ' 
              : 'text-(--text-muted) hover:text-foreground'
            }`}
          >
            {p}D
          </button>
        ))}
      </div>

      <div className="flex gap-2">
            <div className={`flex flex-col justify-between py-1 text-[11px] text-(--text-muted) font-bold uppercase tracking-tight w-4 select-none mt-6 ${variant === 'compact' ? 'hidden md:flex' : ''}`}>
                <span>M</span>
                <span>W</span>
                <span>F</span>
            </div>
            <div 
              ref={scrollContainerRef}
              className="flex-1 overflow-x-auto scrollbar-hide scroll-smooth"
            >
                {/* Month Labels - Inside Scroll Container */}
                <div className="relative h-6 min-w-max pointer-events-none">
                    {months.map((m, i) => (
                      <span 
                        key={i} 
                        className="absolute text-[11px] text-(--text-muted) font-bold uppercase tracking-wider whitespace-nowrap"
                        style={{ 
                          left: `${m.offset * (cellWidth + gapWidth)}px`,
                        }}
                      >
                        {m.label}
                      </span>
                    ))}
                </div>

                <div className={`flex ${cellGap} min-w-max pb-2`}>
                    {weeks.map((week, weekIndex) => (
                    <div key={weekIndex} className={`flex flex-col ${cellGap}`}>
                        {week.map((day, dayIndex) => (
                        <div 
                            key={dayIndex}
                            className={`${cellSize} rounded-[1px] transition-all cursor-pointer ${getLevelColor(day.level)}`}
                            onMouseEnter={(e) => {
                              const rect = e.currentTarget.getBoundingClientRect();
                              setHoveredDay({
                                day,
                                x: rect.left + rect.width / 2,
                                y: rect.top
                              });
                            }}
                            onMouseLeave={() => setHoveredDay(null)}
                        />
                        ))}
                    </div>
                    ))}
                </div>
            </div>
        </div>

      {/* Legend */}
      <div className="flex items-center justify-between text-[11px] text-(--text-muted) font-bold uppercase tracking-wider pt-2 border-t border-card-border">
        <div className="flex items-center gap-2">
          <span>Less</span>
          <div className="flex gap-1">
            <div className="w-2.5 h-2.5 rounded-[1px] bg-background/50 border border-card-border"></div>
            <div className="w-2.5 h-2.5 rounded-[1px] bg-emerald-500/20"></div>
            <div className="w-2.5 h-2.5 rounded-[1px] bg-emerald-500/40"></div>
            <div className="w-2.5 h-2.5 rounded-[1px] bg-emerald-500/70"></div>
            <div className="w-2.5 h-2.5 rounded-[1px] bg-emerald-400"></div>
          </div>
          <span>More</span>
        </div>
        <div className="flex items-center gap-1.5 text-emerald-400/70">
           <FiCheckSquare className="w-3 h-3" />
           <span>Activity Grid</span>
        </div>
      </div>

      {mounted && hoveredDay && createPortal(
        <div 
          className="fixed z-[9999] pointer-events-none -translate-x-1/2 -translate-y-full mb-2"
          style={{ left: hoveredDay.x, top: hoveredDay.y }}
        >
          <div className="bg-card border border-card-border px-3 py-1.5 rounded-lg whitespace-nowrap backdrop-blur-md shadow-xl">
              <p className="text-[11px] font-bold text-foreground">{format(new Date(hoveredDay.day.date), 'MMMM d, yyyy')}</p>
              <p className="text-[11px] text-emerald-400 mt-0.5">{getFunMessage(hoveredDay.day.count)}</p>
          </div>
          <div className="w-2 h-2 bg-card border-r border-b border-card-border rotate-45 absolute -bottom-1 left-1/2 -translate-x-1/2"></div>
        </div>,
        document.body
      )}
    </div>
  );
};


export default ActivityHeatmap;

