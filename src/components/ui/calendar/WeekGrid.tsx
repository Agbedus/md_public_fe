"use client";
import React from "react";
import { FiCheckCircle, FiBriefcase, FiCalendar, FiClock, FiMapPin, FiSun, FiX, FiChevronRight } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import { 
  addDays, 
  eachHourOfInterval, 
  endOfDay, 
  format, 
  isSameDay, 
  startOfDay, 
  startOfWeek, 
  isWithinInterval,
  differenceInDays
} from "date-fns";
import type { CalendarEvent } from "@/types/calendar";
import { Tooltip } from "@/components/ui/Tooltip";

type UICalendarEvent = CalendarEvent;

interface WeekGridProps {
  date: Date;
  events?: UICalendarEvent[];
  onSelectDateTime?: (d: Date) => void;
  onEventClick?: (e: CalendarEvent) => void;
  onEventDelete?: (e: CalendarEvent) => void;
}

const HOURS = eachHourOfInterval({ start: startOfDay(new Date()), end: endOfDay(new Date()) }).slice(0, 24);

const COLOR_PALETTE = [
    { bg: 'bg-indigo-50 dark:bg-indigo-950/60', border: 'border-indigo-500', text: 'text-indigo-600 dark:text-indigo-300' },
    { bg: 'bg-emerald-50 dark:bg-emerald-950/60', border: 'border-emerald-500', text: 'text-emerald-600 dark:text-emerald-300' },
    { bg: 'bg-rose-50 dark:bg-rose-950/60', border: 'border-rose-500', text: 'text-rose-600 dark:text-rose-300' },
    { bg: 'bg-yellow-50 dark:bg-yellow-950/60', border: 'border-yellow-500', text: 'text-yellow-600 dark:text-yellow-300' },
    { bg: 'bg-sky-50 dark:bg-sky-950/60', border: 'border-sky-500', text: 'text-sky-600 dark:text-sky-300' },
    { bg: 'bg-purple-50 dark:bg-purple-950/60', border: 'border-purple-500', text: 'text-purple-600 dark:text-purple-300' },
    { bg: 'bg-fuchsia-50 dark:bg-fuchsia-950/60', border: 'border-fuchsia-500', text: 'text-fuchsia-600 dark:text-fuchsia-300' },
    { bg: 'bg-teal-50 dark:bg-teal-950/60', border: 'border-teal-500', text: 'text-teal-600 dark:text-teal-300' },
    { bg: 'bg-orange-50 dark:bg-orange-950/60', border: 'border-orange-500', text: 'text-orange-600 dark:text-orange-300' },
    { bg: 'bg-blue-50 dark:bg-blue-950/60', border: 'border-blue-500', text: 'text-blue-600 dark:text-blue-300' },
    { bg: 'bg-lime-50 dark:bg-lime-950/60', border: 'border-lime-500', text: 'text-lime-600 dark:text-lime-300' },
    { bg: 'bg-pink-50 dark:bg-pink-950/60', border: 'border-pink-500', text: 'text-pink-600 dark:text-pink-300' },
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
      return { dot: "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]", border: "border-emerald-500/30", text: "text-emerald-700 dark:text-emerald-400" };
    case "private":
      return { dot: "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]", border: "border-amber-500/30", text: "text-amber-700 dark:text-amber-400" };
    case "confidential":
      return { dot: "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]", border: "border-rose-500/30", text: "text-rose-700 dark:text-rose-400" };
    default:
      return { dot: "bg-slate-400", border: "border-card-border", text: "text-text-secondary" };
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

export default function WeekGrid({ date, events = [], onSelectDateTime, onEventClick }: WeekGridProps) {
  const weekStart = startOfWeek(date, { weekStartsOn: 1 }); // Monday
  const weekEnd = addDays(weekStart, 6);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const [popupData, setPopupData] = React.useState<{ date: Date; slotStart: Date; events: UICalendarEvent[] } | null>(null);
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

  // Projects and Time Off for the spanning header
  const spanningEvents = events.filter(e => {
    if (!e.isProject && !e.isTimeOff) return false;
    const s = startOfDay(new Date(e.start));
    const ed = endOfDay(e.end ? new Date(e.end) : s);
    return (s <= weekEnd && ed >= weekStart);
  });

  return (
    <div className="bg-card rounded-2xl overflow-hidden flex flex-col h-full border border-card-border">
      {/* Headers */}
      <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-card-border bg-foreground/[0.05] flex-shrink-0">
        <div className="px-2 py-2 text-right pr-3 border-r border-card-border flex items-center justify-end">
            <span className="text-[10px] font-black text-text-secondary uppercase">GMT</span>
        </div>
        {days.map((d) => (
          <div key={d.toISOString()} className="px-3 py-2 text-center border-r border-card-border last:border-r-0">
            <div className="text-[10px] font-black text-(--text-muted) uppercase tracking-widest mb-1">{format(d, "EEE")}</div>
            <div className={`
              inline-flex h-8 w-8 items-center justify-center rounded-xl text-sm font-black
              ${isSameDay(d, new Date()) ? "bg-indigo-500 text-white" : "text-foreground"}
            `}>
              {format(d, "d")}
            </div>
          </div>
        ))}
      </div>

      {/* Spanning Events (All Day / Projects Area) */}
      <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-card-border bg-background/50 relative flex-shrink-0">
          <div className="border-r border-card-border bg-foreground/[0.02] flex items-center justify-center">
            <FiBriefcase className="text-text-muted w-3.5 h-3.5" />
          </div>
          <div className="col-span-7 py-3 relative min-h-[48px] flex flex-col gap-1.5 px-1 bg-foreground/[0.01]">
              {spanningEvents.map(e => {
                const eStart = startOfDay(new Date(e.start));
                const eEnd = endOfDay(e.end ? new Date(e.end) : eStart);
                
                const startOffset = Math.max(0, differenceInDays(eStart, weekStart));
                const endOffset = Math.min(6, differenceInDays(eEnd, weekStart));
                const duration = endOffset - startOffset + 1;

                const barColor = getColorForId(e.id);
                const isStarting = isWithinInterval(eStart, { start: weekStart, end: weekEnd });
                const isEnding = isWithinInterval(eEnd, { start: weekStart, end: weekEnd });

                const displayTitle = e.isProject 
                    ? e.title.replace('[PROJ] ', '') 
                    : e.title.includes('—') ? e.title.split('—')[1]?.trim() : e.title;

                return (
                    <div 
                        key={e.id}
                        style={{ 
                            marginLeft: `${(startOffset / 7) * 100}%`,
                            width: `${(duration / 7) * 100}%`,
                            paddingLeft: isStarting ? '4px' : '0px',
                            paddingRight: isEnding ? '4px' : '0px'
                        }}
                        className="h-7 relative z-10"
                    >
                        <Tooltip content={
                            <div className="space-y-2">
                                <div className="flex items-center gap-1.5">
                                    {e.isProject ? (
                                        <FiBriefcase className={`h-3 w-3 ${barColor.text}`} />
                                    ) : e.isTimeOff ? (
                                        <FiSun className={`h-3 w-3 ${barColor.text}`} />
                                    ) : (
                                        <FiCalendar className={`h-3 w-3 ${barColor.text}`} />
                                    )}
                                    <span className={`text-[10px] font-black uppercase tracking-widest ${barColor.text}`}>
                                        {e.isProject ? 'Project' : e.isTimeOff ? 'Time Off' : 'Event'}
                                    </span>
                                </div>
                                <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200 leading-tight">{displayTitle}</p>
                                <div className="flex items-center gap-3 text-[10px] text-zinc-500 dark:text-zinc-400">
                                    <span className="flex items-center gap-1">
                                        <FiCalendar className="h-3 w-3" />
                                        {format(eStart, 'MMM d')} - {format(eEnd, 'MMM d')}
                                    </span>
                                    {e.location && (
                                        <span className="flex items-center gap-1">
                                            <FiMapPin className="h-3 w-3" />
                                            {e.location}
                                        </span>
                                    )}
                                </div>
                            </div>
                        }>
                            <div 
                                onClick={(ev) => { ev.stopPropagation(); onEventClick?.(e); }}
                                className={`
                                    h-full px-2 flex items-center gap-2 rounded-lg border cursor-pointer transition-all hover:brightness-105 dark:hover:brightness-110 active:scale-[0.98] shadow-sm
                                    ${barColor.bg} ${barColor.border}
                                    ${!isStarting ? 'rounded-l-none border-l-0' : ''}
                                    ${!isEnding ? 'rounded-r-none border-r-0' : ''}
                                `}
                            >
                                {e.isProject && isStarting && <FiBriefcase className={`w-2.5 h-2.5 flex-shrink-0 ${barColor.text}`} />}
                                {e.isTimeOff && isStarting && <span className="text-[10px] flex-shrink-0">🌴</span>}
                                <span className={`text-[9px] font-black uppercase tracking-wider truncate ${barColor.text}`}>
                                    {displayTitle}
                                </span>
                            </div>
                        </Tooltip>
                    </div>
                );
              })}
              {spanningEvents.length === 0 && (
                  <div className="text-[9px] font-black text-text-muted/30 uppercase tracking-[0.2em] text-center py-1 italic">No tasks yet</div>
              )}
          </div>
      </div>

      {/* Hourly Grid */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="grid grid-cols-[60px_repeat(7,1fr)] bg-background/50 min-h-full">
          {/* Time labels */}
          <div className="flex flex-col border-r border-card-border bg-foreground/[0.05]">
            {HOURS.map((h, i) => (
              <div key={i} className="h-16 border-b border-card-border text-[10px] text-right pr-2 pt-2 text-(--text-muted) font-black uppercase tracking-tighter">
                {format(h, "HH:00")}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map((d) => {
            return (
              <div key={d.toISOString()} className="flex flex-col border-r border-card-border last:border-r-0 relative">
                {HOURS.map((h, i) => {
                  const slotStart = new Date(d.getFullYear(), d.getMonth(), d.getDate(), h.getHours(), 0, 0, 0);
                  const slotEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate(), h.getHours(), 59, 59, 999);
                  
                  const slotEvents = events.filter((e) => {
                      if (e.isProject || e.isTimeOff) return false;
                      const eStart = new Date(e.start);
                      const eEnd = e.end ? new Date(e.end) : eStart;
                      return isWithinInterval(slotStart, { start: eStart, end: eEnd }) || 
                             isWithinInterval(slotEnd, { start: eStart, end: eEnd }) || 
                             (eStart >= slotStart && eEnd <= slotEnd);
                  });

                  return (
                    <div
                      key={i}
                      role="button"
                      tabIndex={0}
                      onClick={() => onSelectDateTime?.(slotStart)}
                      className="h-16 border-b border-card-border hover:bg-blue-50 dark:hover:bg-white/[0.06] text-left p-1 transition-colors group/slot overflow-hidden"
                    >
                      {slotEvents.length > 0 && (() => {
                        const e = slotEvents[0];
                        const isTask = e.isTask;
                        const c = isTask ? taskClasses(e.taskStatus) : privacyClasses(e.privacy);
                        const remaining = slotEvents.length - 1;
                        return (
                          <div className="flex flex-col h-full justify-center gap-0.5">
                            <Tooltip key={e.id} content={
                              <div className="space-y-2">
                                  <div className="flex items-center gap-1.5">
                                      {isTask ? (
                                          <FiCheckCircle className={`h-3 w-3 ${c.text}`} />
                                      ) : (
                                          <span className={`h-2 w-2 rounded-full ${c.dot}`} />
                                      )}
                                      <span className={`text-[10px] font-black uppercase tracking-widest ${c.text}`}>
                                          {isTask ? 'Task' : 'Event'}
                                      </span>
                                      {e.taskPriority && (
                                      <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded ${isTask ? (c as any).bg : ''} ${c.text}`}>
                                          {e.taskPriority}
                                      </span>
                                      )}
                                  </div>
                                  <p className="text-xs font-bold text-zinc-800 leading-tight">{e.title}</p>
                                  <div className="flex items-center gap-3 text-[10px] text-zinc-500">
                                      <span className="flex items-center gap-1">
                                          <FiCalendar className="h-3 w-3" />
                                          {format(new Date(e.start), 'MMM d')}
                                      </span>
                                      {!e.allDay && (
                                          <span className="flex items-center gap-1">
                                              <FiClock className="h-3 w-3" />
                                              {format(new Date(e.start), 'h:mm a')}
                                          </span>
                                      )}
                                      {e.location && (
                                          <span className="flex items-center gap-1">
                                              <FiMapPin className="h-3 w-3" />
                                              {e.location}
                                          </span>
                                      )}
                                  </div>
                              </div>
                            }>
                              <div
                                  role="button"
                                  onClick={(ev) => { ev.stopPropagation(); onEventClick?.(e); }}
                                  className={`w-full truncate text-[9px] px-1.5 py-0.5 rounded-lg border ${c.border} bg-foreground/[0.05] hover:bg-foreground/[0.1] flex items-center gap-1.5 transition-colors cursor-pointer leading-tight`}
                              >
                                  {isTask ? (
                                      <FiCheckCircle className={`h-2.5 w-2.5 ${c.text}`} />
                                  ) : (
                                      <span className={`h-1 w-1 rounded-full ${c.dot}`} />
                                  )}
                                  <span className={`font-black uppercase tracking-tighter ${c.text} truncate`}>{e.title}</span>
                              </div>
                            </Tooltip>
                            {remaining > 0 && (
                              <div
                                role="button"
                                onClick={(ev) => { ev.stopPropagation(); setPopupData({ date, slotStart, events: slotEvents }); }}
                                className="w-full text-[9px] font-bold text-text-secondary uppercase tracking-wider px-1.5 py-0.5 rounded-lg bg-foreground/[0.04] hover:bg-foreground/[0.08] border border-card-border transition-colors cursor-pointer text-center leading-tight"
                              >
                                + {remaining} more
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  );
                })}
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
              className="w-full max-w-md bg-background/80 border border-card-border rounded-3xl backdrop-blur-md p-6 pointer-events-auto flex flex-col gap-4 overflow-hidden max-h-[80vh]"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-foreground text-xl font-black tracking-tight">{format(popupData.slotStart, "h:mm a")} — {format(popupData.slotStart, "EEEE, MMM d")}</h3>
                  <p className="text-text-secondary text-xs font-bold uppercase tracking-widest mt-1">{popupData.events.length} Items</p>
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
                      className="bg-foreground/[0.05] border border-card-border rounded-xl px-3 py-2 hover:bg-foreground/[0.1] transition-all cursor-pointer group/card active:scale-[0.98] w-full"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-1.5 rounded-lg ${(c as any).bg || ''} border ${c.border.replace('/50', '/20')} ${c.text}`}>
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
                          <FiChevronRight className="w-4 h-4 text-text-muted group-hover/card:text-indigo-400 transition-colors flex-shrink-0" />
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
