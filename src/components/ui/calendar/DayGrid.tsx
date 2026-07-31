"use client";
import React from "react";
import { FiCheckCircle, FiClock, FiCalendar, FiMapPin, FiSun, FiBriefcase } from "react-icons/fi";
import { eachHourOfInterval, endOfDay, format, startOfDay, isSameHour, isWithinInterval, addDays, isSameDay, startOfWeek } from "date-fns";
import type { CalendarEvent } from "@/types/calendar";
import { Tooltip } from "@/components/ui/Tooltip";

type UICalendarEvent = CalendarEvent & { isProject?: boolean; projectStatus?: string };

interface DayGridProps {
  date: Date;
  events?: UICalendarEvent[];
  onSelectDateTime?: (d: Date) => void;
  onEventClick?: (e: CalendarEvent) => void;
  onEventDelete?: (e: CalendarEvent) => void;
}

const HOURS = eachHourOfInterval({ start: startOfDay(new Date()), end: endOfDay(new Date()) }).slice(0, 24);

function privacyClasses(p?: CalendarEvent["privacy"]) {
  switch (p) {
    case "public":
      return { dot: "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]", border: "border-emerald-500", text: "text-emerald-600 dark:text-emerald-300" };
    case "private":
      return { dot: "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]", border: "border-amber-500", text: "text-amber-600 dark:text-amber-300" };
    case "confidential":
      return { dot: "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]", border: "border-rose-500", text: "text-rose-600 dark:text-rose-300" };
    default:
      return { dot: "bg-slate-400", border: "border-card-border", text: "text-text-secondary" };
  }
}

function taskClasses(status?: string) {
  switch (status) {
    case "completed":
      return { dot: "", border: "border-emerald-500", text: "text-emerald-600 dark:text-emerald-300", bg: "bg-emerald-50 dark:bg-emerald-950" };
    case "in_progress":
      return { dot: "", border: "border-amber-500", text: "text-amber-600 dark:text-amber-300", bg: "bg-amber-50 dark:bg-amber-950" };
    default:
      return { dot: "", border: "border-sky-500", text: "text-sky-600 dark:text-sky-300", bg: "bg-sky-50 dark:bg-sky-950" };
  }
}

function timeOffClasses(status?: string) {
  switch (status) {
    case "approved":
      return { dot: "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]", border: "border-emerald-500", text: "text-emerald-600 dark:text-emerald-300", bg: "bg-emerald-50 dark:bg-emerald-950" };
    case "rejected":
      return { dot: "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]", border: "border-rose-500", text: "text-rose-600 dark:text-rose-300", bg: "bg-rose-50 dark:bg-rose-950" };
    case "pending":
    default:
      return { dot: "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]", border: "border-amber-500", text: "text-amber-600 dark:text-amber-300", bg: "bg-amber-50 dark:bg-amber-950" };
  }
}

export default function DayGrid({ date, events = [], onSelectDateTime, onEventClick, onEventDelete }: DayGridProps) {
  return (
    <div className="bg-card rounded-2xl overflow-hidden">
      <div className="overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[60px_1fr] border-b border-card-border bg-foreground/[0.05]">
          <div className="px-2 py-2 text-right pr-3 border-r border-card-border">&nbsp;</div>
          <div className="px-3 py-2 text-center uppercase tracking-wide">
            <div className="text-xs font-bold text-(--text-muted) mb-1">{format(date, "EEE")}</div>
            <div className="text-foreground text-sm font-medium">{format(date, "MMMM d, yyyy")}</div>
          </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-[60px_1fr] bg-background/50">
          {/* Time labels */}
          <div className="flex flex-col border-r border-card-border bg-foreground/[0.05]">
            {HOURS.map((h, i) => (
              <div key={i} className="h-16 border-b border-card-border text-[11px] text-right pr-2 pt-2 text-(--text-muted) font-medium">
                {format(h, "HH:00")}
              </div>
            ))}
          </div>

          {/* Day column */}
          <div className="flex flex-col">
            {HOURS.map((h, i) => {
              const slotStart = new Date(date.getFullYear(), date.getMonth(), date.getDate(), h.getHours(), 0, 0, 0);
              const slotEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate(), h.getHours(), 59, 59, 999);
              
              // Show events that occur during this hour slot
              const slotEvents = events.filter((e) => {
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
                  {slotEvents.length > 0 && (
                    <div className="h-full w-full flex gap-1 overflow-x-auto no-scrollbar">
                      {slotEvents.map((e) => {
                        const isTask = e.isTask;
                        const isProject = e.isProject;
                        const isTimeOff = e.isTimeOff;
                        const c = isProject ? { border: 'border-indigo-500', text: 'text-indigo-600 dark:text-indigo-300', dot: 'bg-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-950' } : (isTask ? { ...taskClasses(e.taskStatus), bg: 'bg-sky-50 dark:bg-sky-950' } : (isTimeOff ? timeOffClasses(e.timeOffStatus) : { ...privacyClasses(e.privacy), bg: 'bg-zinc-50 dark:bg-zinc-950' }));
                        
                        const widthPct = 100 / slotEvents.length;
                        
                        const summary = isProject 
                            ? `PROJECT: ${e.title} - ${e.projectStatus || 'Active'}`
                            : (isTask ? `TASK: ${e.title} - ${e.taskStatus || 'TODO'}` : `EVENT: ${e.title} (${format(new Date(e.start), 'h:mm a')} - ${e.end ? format(new Date(e.end), 'h:mm a') : '...'})`);

                        return (
                          <Tooltip key={e.id} content={
                            <div className="space-y-2">
                                <div className="flex items-center gap-1.5">
                                    {isProject ? (
                                        <FiBriefcase className={`h-3 w-3 ${c.text}`} />
                                    ) : isTimeOff ? (
                                        <FiSun className={`h-3 w-3 ${c.text}`} />
                                    ) : isTask ? (
                                        <FiCheckCircle className={`h-3 w-3 ${c.text}`} />
                                    ) : (
                                        <span className={`h-2 w-2 rounded-full ${c.dot}`} />
                                    )}
                                    <span className={`text-[10px] font-black uppercase tracking-widest ${c.text}`}>
                                        {isProject ? 'Project' : isTimeOff ? 'Time Off' : isTask ? 'Task' : 'Event'}
                                    </span>
                                    {e.taskPriority && (
                                        <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded ${c.bg} ${c.text}`}>
                                            {e.taskPriority}
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200 leading-tight">{e.title}</p>
                                <div className="flex items-center gap-3 text-[10px] text-zinc-500 dark:text-zinc-400">
                                    <span className="flex items-center gap-1">
                                        <FiCalendar className="h-3 w-3" />
                                        {format(new Date(e.start), 'MMM d')}
                                    </span>
                                    {!e.allDay && (
                                        <span className="flex items-center gap-1">
                                            <FiClock className="h-3 w-3" />
                                            {format(new Date(e.start), 'h:mm a')} - {e.end ? format(new Date(e.end), 'h:mm a') : '...'}
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
                          } className="h-full flex-1" style={{ minWidth: slotEvents.length > 1 ? '80px' : 'none', maxWidth: slotEvents.length > 1 ? '150px' : 'none' }}>
                            <div
                                role="button"
                                onClick={(ev) => { ev.stopPropagation(); onEventClick?.(e); }}
                                className={`h-full truncate text-[10px] px-2 py-1.5 rounded-xl border ${c.border} bg-foreground/[0.05] hover:bg-foreground/[0.05] flex flex-col justify-center gap-0.5 transition-all cursor-pointer w-full group/card active:scale-[0.98]`}
                            >
                                <div className="flex items-center gap-1.5">
                                    {isTask ? (
                                    <FiCheckCircle className={`h-2.5 w-2.5 ${c.text}`} />
                                    ) : (
                                    <span className={`h-1 w-1 rounded-full ${c.dot}`} />
                                    )}
                                    <span className={`font-black uppercase tracking-tight ${c.text} truncate mb-0.5`}>{e.title}</span>
                                </div>
                                {slotEvents.length <= 3 && (
                                    <div className="flex items-center gap-2 opacity-40 text-[8px] font-bold uppercase tracking-wider text-text-secondary">
                                        <FiClock className="w-2 h-2" /> {format(new Date(e.start), 'HH:mm')}
                                    </div>
                                )}
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
        </div>
      </div>
    </div>
  );
}
