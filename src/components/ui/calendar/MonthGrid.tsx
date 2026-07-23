"use client";
import React, { useMemo } from "react";
import { FiCheckCircle, FiBriefcase, FiX, FiCalendar, FiClock, FiMapPin } from "react-icons/fi";
import { 
  addDays, 
  eachDayOfInterval, 
  endOfMonth, 
  endOfWeek, 
  format, 
  isSameDay, 
  isSameMonth, 
  startOfMonth, 
  startOfWeek, 
  isWithinInterval, 
  startOfDay, 
  endOfDay,
  differenceInDays
} from "date-fns";
import type { CalendarEvent } from "@/types/calendar";
import { Tooltip } from "@/components/ui/Tooltip";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";

type UICalendarEvent = CalendarEvent;

interface MonthGridProps {
  date: Date;
  events?: UICalendarEvent[];
  onSelectDate?: (d: Date) => void;
  onEventClick?: (e: CalendarEvent) => void;
  onEventDelete?: (e: CalendarEvent) => void;
}

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

function privacyClasses(p?: CalendarEvent["privacy"]) {
  switch (p) {
    case "public":
      return { dot: "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]", border: "border-emerald-500/30", text: "text-emerald-700 dark:text-emerald-400", bg: "bg-emerald-500/5" };
    case "private":
      return { dot: "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]", border: "border-amber-500/30", text: "text-amber-700 dark:text-amber-400", bg: "bg-amber-500/5" };
    case "confidential":
      return { dot: "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]", border: "border-rose-500/30", text: "text-rose-700 dark:text-rose-400", bg: "bg-rose-500/5" };
    default:
      return { dot: "bg-slate-400", border: "border-slate-500/30", text: "text-text-secondary", bg: "bg-slate-500/5" };
  }
}

function taskClasses(status?: string) {
  switch (status) {
    case "completed":
      return { dot: "", border: "border-emerald-500/30", text: "text-emerald-700 dark:text-emerald-400", bg: "bg-emerald-500/5" };
    case "in_progress":
      return { dot: "", border: "border-amber-500/30", text: "text-amber-700 dark:text-amber-400", bg: "bg-amber-500/5" };
    default:
      return { dot: "", border: "border-sky-500/30", text: "text-sky-700 dark:text-sky-400", bg: "bg-sky-500/5" };
  }
}

function timeOffClasses(status?: string) {
  switch (status) {
    case "approved":
      return { dot: "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]", border: "border-emerald-500/30", text: "text-emerald-700 dark:text-emerald-400", bg: "bg-emerald-500/5" };
    case "rejected":
      return { dot: "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]", border: "border-rose-500/30", text: "text-rose-700 dark:text-rose-400", bg: "bg-rose-500/5" };
    case "pending":
    default:
      return { dot: "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]", border: "border-amber-500/30", text: "text-amber-700 dark:text-amber-400", bg: "bg-amber-500/5" };
  }
}

export default function MonthGrid({ date, events = [], onSelectDate, onEventClick }: MonthGridProps) {
  const { gridStart, gridEnd, monthStart } = useMemo(() => {
    const start = startOfMonth(date);
    const end = endOfMonth(start);
    return {
      monthStart: start,
      gridStart: startOfWeek(start, { weekStartsOn: 1 }),
      gridEnd: endOfWeek(end, { weekStartsOn: 1 })
    };
  }, [date]);

  const days = useMemo(() => eachDayOfInterval({ start: gridStart, end: gridEnd }), [gridStart, gridEnd]);
  
  // Group days into weeks for spanning calculations
  const weeks = useMemo(() => {
    const w = [];
    for (let i = 0; i < days.length; i += 7) {
        w.push(days.slice(i, i + 7));
    }
    return w;
  }, [days]);

  const [popupData, setPopupData] = React.useState<{ date: Date, events: UICalendarEvent[] } | null>(null);
  const popupRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        setPopupData(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="bg-card rounded-2xl overflow-hidden relative">
      <div className="overflow-hidden">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 border-b border-card-border bg-foreground/[0.03]">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="px-4 py-3 text-center text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">
              {format(addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), i), "EEE")}
            </div>
          ))}
        </div>

        {/* Days grid - Organized by Week for spanning bars */}
        <div className="flex flex-col bg-background/50 gap-px">
          {weeks.map((week, weekIdx) => {
            const weekStartDay = week[0];
            const weekEndDay = week[6];

            // Events that span this week (Gantt style)
            const spanningEvents = events.filter(e => {
                if (!e.isProject && !e.isTimeOff) return false;
                const s = startOfDay(new Date(e.start));
                const endVal = e.end ? new Date(e.end) : s;
                const ed = endOfDay(endVal);
                return (s <= weekEndDay && ed >= weekStartDay);
            });

            return (
              <div key={weekIdx} className="grid grid-cols-7 relative min-h-[140px] border-b border-card-border last:border-0">
                {/* Background Cells */}
                {week.map((d) => {
                    const isCurrentMonth = isSameMonth(d, monthStart);
                    const isToday = isSameDay(d, new Date());
                    
                    // Filter normal events for this day
                    const dayEvents = events.filter((e) => {
                        if (e.isProject || e.isTimeOff) return false;
                        const s = startOfDay(new Date(e.start));
                        const endVal = e.end ? new Date(e.end) : s;
                        const end = endOfDay(endVal);
                        return isWithinInterval(d, { start: s, end: end });
                    });

                    return (
                        <div
                            key={d.toISOString()}
                            role="button"
                            tabIndex={0}
                            onClick={() => onSelectDate?.(d)}
                            className={`relative p-2 text-left transition-colors border-r border-card-border last:border-r-0 group/cell ${
                                !isCurrentMonth ? "bg-background/30 opacity-50" : "bg-background/50"
                            } hover:bg-foreground/[0.05] flex flex-col`}
                        >
                            <div className="flex items-center justify-between mb-2 relative z-10">
                                <span 
                                    className={`
                                        flex h-6 w-6 items-center justify-center rounded-lg text-xs font-bold
                                        ${isToday ? "bg-indigo-500 text-white" : "text-(--text-muted)"}
                                    `}
                                >
                                    {format(d, "d")}
                                </span>
                            </div>

                            {/* Spacing for spanning bars (reserved area at the top of cell) */}
                            <div className="h-14 mb-1 pointer-events-none" />

                            {/* Day Events (Tasks, etc) */}
                            <div className="space-y-1 relative z-10 flex-1 overflow-hidden">
                                {dayEvents.slice(0, 2).map((e) => {
                                    const isTask = e.isTask;
                                    const isStart = isSameDay(d, new Date(e.start));
                                    if (!isStart) return null;

                                    const c = isTask ? taskClasses(e.taskStatus) : privacyClasses(e.privacy);
                                    
                                    return (
                                        <Tooltip key={e.id} content={e.title}>
                                            <div
                                                role="button"
                                                onClick={(ev) => { ev.stopPropagation(); onEventClick?.(e); }}
                                                className={`group truncate text-[10px] px-2 py-0.5 rounded-lg border ${c.border} bg-foreground/[0.05] hover:bg-foreground/[0.1] flex items-center gap-1.5 w-full transition-colors cursor-pointer`}
                                            >
                                                {isTask ? (
                                                    <FiCheckCircle className={`h-2.5 w-2.5 ${c.text}`} />
                                                ) : (
                                                    <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />
                                                )}
                                                <span className={`font-bold uppercase tracking-tight ${c.text} flex-1 min-w-0`}>{e.title}</span>
                                            </div>
                                        </Tooltip>
                                    );
                                })}
                                {dayEvents.length > 2 && (
                                    <div 
                                        onClick={(ev) => { ev.stopPropagation(); setPopupData({ date: d, events: dayEvents }); }}
                                        className="text-[9px] font-black text-text-secondary uppercase tracking-widest pl-2 hover:text-indigo-400 transition-colors cursor-pointer"
                                    >
                                        + {dayEvents.length - 2} more
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}

                {/* Spanning Bars Layer (Absolute Overlay) */}
                <div className="absolute top-10 left-0 right-0 pointer-events-none px-1">
                    <div className="flex flex-col gap-1.5">
                        {spanningEvents.slice(0, 3).map((e) => {
                            const eStart = startOfDay(new Date(e.start));
                            const eEndVal = e.end ? new Date(e.end) : eStart;
                            const eEnd = endOfDay(eEndVal);

                            // Calculate relative offsets within this week (0-6)
                            const startOffset = Math.max(0, differenceInDays(eStart, weekStartDay));
                            const endOffset = Math.min(6, differenceInDays(eEnd, weekStartDay));
                            const duration = endOffset - startOffset + 1;

                            const barColor = getColorForId(e.id);
                            const isStarting = isWithinInterval(eStart, { start: weekStartDay, end: weekEndDay });
                            const isEnding = isWithinInterval(eEnd, { start: weekStartDay, end: weekEndDay });

                            const displayTitle = e.isProject 
                                ? e.title.replace('[PROJ] ', '') 
                                : e.title.includes('—') ? e.title.split('—')[1]?.trim() : e.title;

                            return (
                                <div 
                                    key={e.id}
                                    style={{ 
                                        gridColumn: `${startOffset + 1} / span ${duration}`,
                                        marginLeft: isStarting ? '4px' : '0px',
                                        marginRight: isEnding ? '4px' : '0px',
                                        width: 'auto'
                                    }}
                                    className="relative h-6"
                                >
                                    <Tooltip content={`${displayTitle} (${format(eStart, 'MMM d')} - ${format(eEnd, 'MMM d')})`}>
                                        <div 
                                            onClick={(ev) => { ev.stopPropagation(); onEventClick?.(e); }}
                                            className={`
                                                pointer-events-auto h-full px-2 flex items-center gap-2 rounded-lg border  cursor-pointer transition-all hover:brightness-110 active:scale-[0.98]
                                                ${barColor.bg} ${barColor.border}
                                                ${!isStarting ? 'rounded-l-none border-l-0' : ''}
                                                ${!isEnding ? 'rounded-r-none border-r-0' : ''}
                                            `}
                                        >
                                            {e.isProject && isStarting && <FiBriefcase className="w-2.5 h-2.5 flex-shrink-0 text-white" />}
                                            {e.isTimeOff && isStarting && <span className="text-[10px] flex-shrink-0">🌴</span>}
                                            <span className={`text-[9px] font-black uppercase tracking-wider truncate ${barColor.text}`}>
                                                {displayTitle}
                                            </span>
                                        </div>
                                    </Tooltip>
                                </div>
                            );
                        })}
                    </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Hidden Items Popup */}
      <AnimatePresence>
        {popupData && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center pointer-events-none">
            <motion.div
              ref={popupRef}
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 10 }}
              className="w-full max-w-md bg-background/80 border border-card-border rounded-3xl -[0_32px_64px_-12px_rgba(0,0,0,0.8)] backdrop-blur-md p-6 pointer-events-auto flex flex-col gap-4 overflow-hidden max-h-[80vh]"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-foreground text-xl font-black tracking-tight">{format(popupData.date, "MMMM d, yyyy")}</h3>
                  <p className="text-text-secondary text-xs font-bold uppercase tracking-widest mt-1">{popupData.events.length} Items Today</p>
                </div>
                <button onClick={() => setPopupData(null)} className="p-2 hover:bg-foreground/[0.05] rounded-2xl text-(--text-muted) hover:text-foreground transition-colors">
                  <FiX className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3">
                {popupData.events.map((e) => {
                  const isTask = e.isTask;
                  const c = isTask ? taskClasses(e.taskStatus) : privacyClasses(e.privacy);
                  
                  return (
                    <div
                      key={e.id}
                      onClick={() => { onEventClick?.(e); setPopupData(null); }}
                      className={`bg-foreground/[0.05] border border-card-border rounded-xl px-3 py-2 hover:bg-foreground/[0.1] transition-all cursor-pointer group/card active:scale-[0.98] w-full`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-1.5 rounded-lg ${c.bg} border ${c.border.replace('/50', '/20')} ${c.text}`}>
                          {isTask ? <FiCheckCircle className="w-3.5 h-3.5" /> : <FiCalendar className="w-3.5 h-3.5" />}
                        </div>
                        
                        <div className="flex-1 min-w-0 flex items-center justify-between gap-4">
                          <div className="flex-1 min-w-0">
                              <h4 className="text-foreground font-bold text-xs group-hover/card:text-indigo-400 transition-colors uppercase tracking-tight truncate">{e.title}</h4>
                              <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-[9px] font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1">
                                      <FiClock className="w-2.5 h-2.5" /> {format(new Date(e.start), 'h:mm a')}
                                  </span>
                              </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
