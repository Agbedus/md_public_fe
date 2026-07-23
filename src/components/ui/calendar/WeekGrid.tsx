"use client";
import React from "react";
import { FiCheckCircle, FiBriefcase } from "react-icons/fi";
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
      return { dot: "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]", border: "border-emerald-500/30", text: "text-emerald-700 dark:text-emerald-400" };
    case "private":
      return { dot: "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]", border: "border-amber-500/30", text: "text-amber-700 dark:text-amber-400" };
    case "confidential":
      return { dot: "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]", border: "border-rose-500/30", text: "text-rose-700 dark:text-rose-400" };
    default:
      return { dot: "bg-slate-400", border: "border-slate-500/30", text: "text-text-secondary" };
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
                        <Tooltip content={`${displayTitle} (${format(eStart, 'MMM d')} - ${format(eEnd, 'MMM d')})`}>
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
                  <div className="text-[9px] font-black text-text-muted/30 uppercase tracking-[0.2em] text-center py-1 italic">No active missions detected</div>
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
                      className="h-16 border-b border-card-border hover:bg-foreground/[0.05] text-left p-1 transition-colors group/slot overflow-hidden"
                    >
                      {slotEvents.length > 0 && (
                        <div className="h-full w-full flex flex-col gap-1">
                          {slotEvents.map((e) => {
                            const isTask = e.isTask;
                            const c = isTask ? taskClasses(e.taskStatus) : privacyClasses(e.privacy);
                            const widthPct = slotEvents.length > 1 ? (100 / slotEvents.length) : 100;

                            return (
                              <Tooltip key={e.id} content={e.title}>
                                <div
                                    role="button"
                                    onClick={(ev) => { ev.stopPropagation(); onEventClick?.(e); }}
                                    className={`truncate text-[9px] px-1.5 py-1 rounded-lg border ${c.border} bg-foreground/[0.05] hover:bg-foreground/[0.1] flex items-center gap-1.5 transition-colors cursor-pointer w-full leading-tight`}
                                >
                                    {isTask ? (
                                        <FiCheckCircle className={`h-2.5 w-2.5 ${c.text}`} />
                                    ) : (
                                        <span className={`h-1 w-1 rounded-full ${c.dot}`} />
                                    )}
                                    <span className={`font-black uppercase tracking-tighter ${c.text} truncate`}>{e.title}</span>
                                </div>
                              </Tooltip>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
