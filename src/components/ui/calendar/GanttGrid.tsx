"use client";
import React, { useMemo, useEffect, useRef, useState } from "react";
import { 
  format, 
  eachDayOfInterval, 
  startOfMonth, 
  endOfMonth, 
  startOfDay, 
  endOfDay, 
  isSameDay, 
  addMonths, 
  subMonths, 
  eachMonthOfInterval, 
  differenceInDays,
  startOfYear,
  endOfYear,
  eachWeekOfInterval,
  startOfWeek,
  endOfWeek,
  eachQuarterOfInterval,
  startOfQuarter,
  endOfQuarter,
  isWithinInterval
} from "date-fns";
import type { CalendarEvent } from "@/types/calendar";
import { Tooltip } from "@/components/ui/Tooltip";
import Image from "next/image";
import { FiCalendar, FiMaximize2, FiMinimize2, FiLayers, FiSun, FiClock, FiCoffee } from "react-icons/fi";

interface GanttGridProps {
  date: Date;
  events: CalendarEvent[];
  activeFilter: 'projects' | 'tasks' | 'events' | 'timeOff';
  onEventClick?: (e: CalendarEvent) => void;
}

type ZoomLevel = 'days' | 'weeks' | 'months';

const COLOR_PALETTE = [
  { bg: 'bg-indigo-500/10 dark:bg-indigo-500/20', border: 'border-indigo-500/30', text: 'text-indigo-700 dark:text-indigo-300' },
  { bg: 'bg-emerald-500/10 dark:bg-emerald-500/20', border: 'border-emerald-500/30', text: 'text-emerald-700 dark:text-emerald-300' },
  { bg: 'bg-rose-500/10 dark:bg-rose-500/20', border: 'border-rose-500/30', text: 'text-rose-700 dark:text-rose-300' },
  { bg: 'bg-amber-500/10 dark:bg-amber-500/20', border: 'border-amber-500/30', text: 'text-amber-700 dark:text-amber-300' },
  { bg: 'bg-sky-500/10 dark:bg-sky-500/20', border: 'border-sky-500/30', text: 'text-sky-700 dark:text-sky-300' },
  { bg: 'bg-purple-500/10 dark:bg-purple-500/20', border: 'border-purple-500/30', text: 'text-purple-700 dark:text-purple-300' },
  { bg: 'bg-fuchsia-500/10 dark:bg-fuchsia-500/20', border: 'border-fuchsia-500/30', text: 'text-fuchsia-700 dark:text-fuchsia-300' },
  { bg: 'bg-teal-500/10 dark:bg-teal-500/20', border: 'border-teal-500/30', text: 'text-teal-700 dark:text-teal-300' },
  { bg: 'bg-orange-500/10 dark:bg-orange-500/20', border: 'border-orange-500/30', text: 'text-orange-700 dark:text-orange-300' },
  { bg: 'bg-blue-500/10 dark:bg-blue-500/20', border: 'border-blue-500/30', text: 'text-blue-700 dark:text-blue-300' },
  { bg: 'bg-lime-500/10 dark:bg-lime-500/20', border: 'border-lime-500/30', text: 'text-lime-700 dark:text-lime-300' },
  { bg: 'bg-pink-500/10 dark:bg-pink-500/20', border: 'border-pink-500/30', text: 'text-pink-700 dark:text-pink-300' },
];

function getColorForId(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % COLOR_PALETTE.length;
  return COLOR_PALETTE[index];
}

export default function GanttGrid({ date, events, activeFilter, onEventClick }: GanttGridProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>('days');
  
  const viewStart = useMemo(() => startOfYear(date), [date]);
  const viewEnd = useMemo(() => endOfYear(date), [date]);
  
  const days = useMemo(() => eachDayOfInterval({ start: viewStart, end: viewEnd }), [viewStart, viewEnd]);
  const months = useMemo(() => eachMonthOfInterval({ start: viewStart, end: viewEnd }), [viewStart, viewEnd]);
  const weeks = useMemo(() => eachWeekOfInterval({ start: viewStart, end: viewEnd }, { weekStartsOn: 1 }), [viewStart, viewEnd]);
  
  // Calculate width per day based on zoom level
  const dayWidth = useMemo(() => {
    switch (zoomLevel) {
      case 'days': return 48;
      case 'weeks': return 12; // ~84px per week
      case 'months': return 4; // ~120px per month
      default: return 48;
    }
  }, [zoomLevel]);

  const rowHeight = 64; // px

  // Handle initial scroll and zoom-change scroll persistence
  useEffect(() => {
    if (scrollContainerRef.current) {
        const currentMonthStart = startOfMonth(new Date());
        const daysBeforeCurrentMonth = differenceInDays(currentMonthStart, viewStart);
        const scrollOffset = daysBeforeCurrentMonth * dayWidth;
        scrollContainerRef.current.scrollLeft = scrollOffset;
    }
  }, [viewStart, zoomLevel, dayWidth]);

  const rows = useMemo(() => {
    if (activeFilter === 'projects') {
      return events.filter(e => e.isProject && new Date(e.start) <= viewEnd && new Date(e.end || e.start) >= viewStart);
    } else if (activeFilter === 'timeOff') {
      const userMap = new Map<string, { user: any, events: CalendarEvent[] }>();
      events.filter(e => e.isTimeOff).forEach(e => {
        if (new Date(e.start) <= viewEnd && new Date(e.end || e.start) >= viewStart) {
          const userId = e.userId || (e as any).user_id || 'unknown';
          if (!userMap.has(userId)) {
            userMap.set(userId, { user: e.user, events: [] });
          }
          userMap.get(userId)!.events.push(e);
        }
      });
      return Array.from(userMap.values());
    }
    return [];
  }, [events, activeFilter, viewStart, viewEnd]);

  if (activeFilter !== 'projects' && activeFilter !== 'timeOff') {
    return (
        <div className="flex items-center justify-center h-64 text-(--text-muted) font-medium italic">
            Timeline view is optimized for Projects and Time Off.
        </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden relative">
      {/* Zoom Controls Overlay */}
      <div className="absolute bottom-6 right-6 z-[60] flex items-center gap-1 p-1 bg-background/80 backdrop-blur-md border border-card-border rounded-2xl shadow-xl">
        <button 
          onClick={() => setZoomLevel('days')}
          className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${zoomLevel === 'days' ? 'bg-foreground/[0.08] text-foreground' : 'text-text-muted hover:text-foreground hover:bg-foreground/[0.05]'}`}
        >
          Days
        </button>
        <button 
          onClick={() => setZoomLevel('weeks')}
          className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${zoomLevel === 'weeks' ? 'bg-foreground/[0.08] text-foreground' : 'text-text-muted hover:text-foreground hover:bg-foreground/[0.05]'}`}
        >
          Weeks
        </button>
        <button 
          onClick={() => setZoomLevel('months')}
          className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${zoomLevel === 'months' ? 'bg-foreground/[0.08] text-foreground' : 'text-text-muted hover:text-foreground hover:bg-foreground/[0.05]'}`}
        >
          Months
        </button>
      </div>

      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-auto custom-scrollbar relative scroll-smooth"
      >
        <div className="min-w-max">
          
          {/* Header */}
          <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-card-border">
            {/* Top Level Header (Months or Quarters) */}
            <div className="flex border-b border-card-border">
                <div className="w-64 flex-shrink-0 sticky left-0 z-50 bg-background/80 backdrop-blur-md border-r border-card-border" />
                <div className="flex">
                    {zoomLevel === 'months' ? (
                        eachQuarterOfInterval({ start: viewStart, end: viewEnd }).map(q => {
                            const qStart = startOfQuarter(q);
                            const qEnd = endOfQuarter(q);
                            const daysInQ = differenceInDays(qEnd, qStart) + 1;
                            return (
                                <div key={q.toISOString()} style={{ width: `${daysInQ * dayWidth}px` }} className="flex-shrink-0 border-r border-card-border p-2 text-center">
                                    <span className="text-[10px] font-black text-indigo-400/80 uppercase tracking-[0.2em]">{format(q, "QQQ yyyy")}</span>
                                </div>
                            );
                        })
                    ) : (
                        months.map(m => {
                            const mStart = startOfMonth(m);
                            const mEnd = endOfMonth(m);
                            const daysInMonth = differenceInDays(mEnd, mStart) + 1;
                            return (
                                <div key={m.toISOString()} style={{ width: `${daysInMonth * dayWidth}px` }} className="flex-shrink-0 border-r border-card-border p-2 text-center">
                                    <span className="text-[10px] font-black text-indigo-400/80 uppercase tracking-[0.2em]">{format(m, "MMMM yyyy")}</span>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Sub Level Header (Days or Weeks or Months) */}
            <div className="flex">
                <div className="w-64 flex-shrink-0 sticky left-0 z-50 bg-background/80 backdrop-blur-md border-r border-card-border p-4 text-[10px] font-black text-text-muted uppercase tracking-widest flex items-center gap-2">
                    <FiLayers className="w-3.5 h-3.5" />
                    {activeFilter === 'projects' ? 'Active Missions' : 'Personnel'}
                </div>
                <div className="flex">
                      {zoomLevel === 'days' && days.map((d) => (
                        <div key={d.toISOString()} className={`flex-shrink-0 w-12 border-r border-card-border p-2 text-center transition-colors ${isSameDay(d, new Date()) ? 'bg-indigo-500/5' : 'hover:bg-foreground/[0.05]'}`}>
                            <div className="text-[9px] font-black text-text-muted uppercase leading-none mb-1">{format(d, "EEE")}</div>
                            <div className={`text-xs font-black leading-none tracking-tight ${isSameDay(d, new Date()) ? 'text-indigo-600 dark:text-indigo-400' : 'text-text-secondary'}`}>{format(d, "d")}</div>
                        </div>
                    ))}
                    {zoomLevel === 'weeks' && weeks.map((w) => {
                        const wStart = startOfWeek(w, { weekStartsOn: 1 });
                        const isCurrentWeek = isWithinInterval(new Date(), { start: wStart, end: endOfWeek(wStart, { weekStartsOn: 1 }) });
                        return (
                            <div key={w.toISOString()} style={{ width: `${7 * dayWidth}px` }} className={`flex-shrink-0 border-r border-card-border p-2 text-center transition-colors ${isCurrentWeek ? 'bg-indigo-500/5' : 'hover:bg-foreground/[0.05]'}`}>
                                <div className="text-[9px] font-black text-text-muted uppercase leading-none mb-1">W{format(w, "w")}</div>
                                <div className={`text-[10px] font-black leading-none tracking-tight ${isCurrentWeek ? 'text-indigo-600 dark:text-indigo-400' : 'text-text-muted'}`}>{format(w, "MMM d")}</div>
                            </div>
                        );
                    })}
                    {zoomLevel === 'months' && months.map((m) => {
                        const mStart = startOfMonth(m);
                        const daysInM = differenceInDays(endOfMonth(m), mStart) + 1;
                        const isCurrentMonth = isSameDay(startOfMonth(new Date()), mStart);
                        return (
                            <div key={m.toISOString()} style={{ width: `${daysInM * dayWidth}px` }} className={`flex-shrink-0 border-r border-card-border p-2 text-center transition-colors ${isCurrentMonth ? 'bg-indigo-500/5' : 'hover:bg-foreground/[0.05]'}`}>
                                <div className="text-[10px] font-black leading-none text-text-muted uppercase tracking-wider">{format(m, "MMM")}</div>
                            </div>
                        );
                    })}
                </div>
            </div>
          </div>

          {/* Body Content Area */}
          <div className="flex relative">
            
            {/* Left Labels Column */}
            <div className="w-64 flex-shrink-0 sticky left-0 z-30 bg-background/80 backdrop-blur-md border-r border-card-border">
              {rows.map((row: any, idx: number) => {
                const rowLabel = activeFilter === 'projects' ? row.title.replace('[PROJ] ', '') : row.user?.fullName || row.user?.email || 'User';
                const user = activeFilter === 'projects' ? (row.user || null) : row.user;
                return (
                  <div key={idx} style={{ height: `${rowHeight}px` }} className="p-4 flex items-center gap-3 border-b border-card-border hover:bg-foreground/[0.04] transition-colors group">
                      {user && (
                        <div className="h-9 w-9 rounded-xl bg-foreground/[0.03] relative overflow-hidden ring-1 ring-card-border flex-shrink-0 ">
                          {(user as any).avatar_url || (user as any).avatarUrl || (user as any).image ? (
                            <Image src={(user as any).avatar_url || (user as any).avatarUrl || (user as any).image} alt={rowLabel} fill className="object-cover transition-transform group-hover:scale-110" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-[10px] font-black bg-indigo-500/5 text-indigo-600 dark:text-indigo-400">
                              {rowLabel.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                      )}
                      <span className="text-[11px] font-black text-text-secondary truncate uppercase tracking-tight group-hover:text-foreground transition-colors">
                        {rowLabel}
                      </span>
                  </div>
                );
              })}
            </div>

            {/* Timeline Overlay Area */}
            <div className="flex-1 relative">
                {/* Background Grid Lines */}
                <div className="absolute inset-0 flex pointer-events-none">
                    {zoomLevel === 'days' && days.map(d => (
                        <div key={d.toISOString()} className={`flex-shrink-0 w-12 border-r border-card-border/30 h-full ${isSameDay(d, new Date()) ? 'bg-indigo-500/[0.01]' : ''}`} />
                    ))}
                    {zoomLevel === 'weeks' && weeks.map(w => (
                        <div key={w.toISOString()} style={{ width: `${7 * dayWidth}px` }} className="flex-shrink-0 border-r border-card-border/30 h-full" />
                    ))}
                    {zoomLevel === 'months' && months.map(m => (
                        <div key={m.toISOString()} style={{ width: `${(differenceInDays(endOfMonth(m), startOfMonth(m)) + 1) * dayWidth}px` }} className="flex-shrink-0 border-r border-card-border/30 h-full" />
                    ))}
                </div>

                {/* Vertical Row Dividers */}
                <div className="absolute inset-0 pointer-events-none">
                    {rows.map((_, idx) => (
                        <div key={idx} style={{ height: `${rowHeight}px` }} className="border-b border-card-border/30 w-full" />
                    ))}
                </div>

                {/* Spanning Event Cards */}
                <div className="relative">
                    {rows.map((row: any, rowIdx: number) => {
                        const rowEvents = activeFilter === 'projects' ? [row] : row.events;
                        const user = activeFilter === 'projects' ? (row.user || null) : row.user;
                        
                        return rowEvents.map((e: CalendarEvent) => {
                            const start = startOfDay(new Date(e.start));
                            const end = endOfDay(e.end ? new Date(e.end) : start);
                            
                            const leftDays = differenceInDays(start, viewStart);
                            const durationDays = differenceInDays(end, start) + 1;
                            
                            const leftPos = leftDays * dayWidth;
                            const barWidth = durationDays * dayWidth;

                            const barColor = getColorForId(e.id);
                            const eventUser = e.user || user;
                            
                            // Parse title and strip emojis
                            let displayTitle = activeFilter === 'projects' 
                                ? e.title.replace('[PROJ] ', '') 
                                : e.title.includes('—') ? e.title.split('—')[1]?.trim() : e.title;
                            
                            // Regex to strip emojis
                            const cleanTitle = displayTitle.replace(/[\u{1F300}-\u{1F9FF}]/gu, '').trim();

                            return (
                              <Tooltip key={e.id} content={`${cleanTitle} (${format(start, 'MMM d')} - ${format(end, 'MMM d')})`}>
                                <div
                                  onClick={() => onEventClick?.(e)}
                                  style={{ 
                                      left: `${leftPos}px`, 
                                      width: `${barWidth}px`,
                                      top: `${(rowIdx * rowHeight) + 4}px`,
                                      height: `${rowHeight - 8}px`
                                  }}
                                  className={`absolute rounded-xl border-y border-x flex items-center px-4 z-10 cursor-pointer hover:brightness-105 dark:hover:brightness-125 hover:z-20 active:scale-[0.99] transition-all overflow-hidden backdrop-blur-md ${barColor.bg} ${barColor.border} shadow-sm`}
                                >
                                  <div className="flex items-center gap-2 w-full overflow-hidden">
                                    {eventUser && barWidth > 60 ? (
                                        <div className="h-7 w-7 rounded-full bg-background/50 relative overflow-hidden flex-shrink-0 border border-card-border shadow-sm transition-transform group-hover:scale-105">
                                            {((eventUser as any).avatar_url || (eventUser as any).avatarUrl || (eventUser as any).image) ? (
                                                <Image src={(eventUser as any).avatar_url || (eventUser as any).avatarUrl || (eventUser as any).image} alt={cleanTitle} fill className="object-cover" />
                                            ) : (
                                                <div className="flex h-full w-full items-center justify-center text-[9px] font-black text-foreground/70">
                                                    {cleanTitle.charAt(0).toUpperCase()}
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        e.isTimeOff && (
                                            <div className={`flex-shrink-0 ${barColor.text}`}>
                                                {e.timeOffStatus === 'approved' ? <FiSun className="w-4 h-4" /> : <FiClock className="w-4 h-4" />}
                                            </div>
                                        )
                                    )}
                                    <div className="flex flex-col min-w-0">
                                        <div className="flex items-center gap-1.5 min-w-0">
                                            {e.isTimeOff && eventUser && barWidth > 60 && (
                                                <span className={`flex-shrink-0 ${barColor.text}`}>
                                                    {e.timeOffStatus === 'approved' ? <FiSun className="w-3.5 h-3.5" /> : <FiClock className="w-3.5 h-3.5" />}
                                                </span>
                                            )}
                                            <span className={`text-[10px] font-black uppercase tracking-widest truncate leading-none ${barColor.text}`}>
                                              {cleanTitle}
                                            </span>
                                        </div>
                                        {barWidth > 180 && (
                                            <span className={`text-[8px] font-black opacity-60 truncate leading-none mt-1.5 uppercase tracking-tighter ${barColor.text}`}>
                                                {format(start, 'MMM d')} — {format(end, 'MMM d')}
                                            </span>
                                        )}
                                    </div>
                                  </div>
                                </div>
                              </Tooltip>
                            );
                        });
                    })}
                </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
