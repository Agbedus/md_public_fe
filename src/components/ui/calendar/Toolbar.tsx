"use client";
import React from "react";
import { format } from "date-fns";
import { FiChevronLeft, FiChevronRight, FiPlus, FiSun } from "react-icons/fi";
import type { CalendarView } from "@/types/calendar";
import TimezoneClocks from "./TimezoneClocks";
import { TabPill } from '@/components/ui/tab-pill';

interface ToolbarProps {
  currentDate: Date;
  view: CalendarView;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onChangeView?: (v: CalendarView) => void;
  onAddEvent?: () => void;
  onRequestTimeOff?: () => void;
  canRequestTimeOff?: boolean;
  activeFilter: 'projects' | 'tasks' | 'events' | 'timeOff';
  setActiveFilter: (filter: 'projects' | 'tasks' | 'events' | 'timeOff') => void;
  hideViewSwitcher?: boolean;
}

type CalendarFilter = 'projects' | 'tasks' | 'events' | 'timeOff';

export default function Toolbar({ 
  currentDate, view, onPrev, onNext, onToday, onChangeView, onAddEvent,
  onRequestTimeOff, canRequestTimeOff,
  activeFilter, setActiveFilter,
  hideViewSwitcher
}: ToolbarProps) {
  const categories: { id: CalendarFilter; label: string; dot: string; group: 'calendar' | 'timeline' }[] = [
    { id: 'events', label: 'Events', dot: 'var(--status-qa)', group: 'calendar' },
    { id: 'tasks', label: 'Tasks', dot: 'var(--accent)', group: 'calendar' },
    { id: 'projects', label: 'Projects', dot: 'var(--status-review)', group: 'timeline' },
    { id: 'timeOff', label: 'Time off', dot: 'var(--warning)', group: 'timeline' },
  ];
  const iconButton = "grid h-9 w-9 place-items-center rounded-full text-text-muted transition-colors hover:bg-foreground/[0.06] hover:text-foreground";

  return (
    <div className="mb-6 flex flex-col gap-4">
      {/* Navigation, title, actions */}
      <div className="flex flex-col gap-3 rounded-[28px] bg-card p-3 sm:flex-row sm:items-center sm:justify-between sm:pl-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-0.5 rounded-full bg-foreground/[0.05] p-0.5">
            <button type="button" onClick={onPrev} aria-label="Previous" className={iconButton}>
              <FiChevronLeft className="h-4 w-4" />
            </button>
            <button type="button" onClick={onToday} className="min-h-9 rounded-full px-3.5 text-sm font-medium text-text-secondary transition-colors hover:bg-foreground/[0.06] hover:text-foreground">
              Today
            </button>
            <button type="button" onClick={onNext} aria-label="Next" className={iconButton}>
              <FiChevronRight className="h-4 w-4" />
            </button>
          </div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            {format(currentDate, "MMMM yyyy")}
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!hideViewSwitcher && (
            <div className="flex items-center gap-1 rounded-full bg-foreground/[0.05] p-1" role="group" aria-label="Calendar view">
              {(['month', 'week', 'day'] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => onChangeView?.(v)}
                  aria-pressed={view === v}
                  className={`relative isolate min-h-9 rounded-full px-3.5 text-sm transition-colors ${
                    view === v ? "font-medium text-on-ink" : "text-text-muted hover:text-foreground"
                  }`}
                >
                  {view === v && <TabPill />}
                  {v.charAt(0).toUpperCase() + v.slice(1)}
                </button>
              ))}
            </div>
          )}
          {canRequestTimeOff && onRequestTimeOff && (
            <button type="button" onClick={onRequestTimeOff} className="md-btn md-btn-secondary md-btn-sm">
              <FiSun className="h-4 w-4" />
              Time off
            </button>
          )}
          {onAddEvent && (
            <button type="button" onClick={onAddEvent} className="md-btn md-btn-primary md-btn-sm">
              New event
              <span className="md-btn-chip"><FiPlus /></span>
            </button>
          )}
        </div>
      </div>

      {/* What the calendar shows: one choice at a time, as tabs */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="-mx-1 flex max-w-full items-center gap-1 overflow-x-auto rounded-full bg-foreground/[0.05] p-1 scrollbar-hide" role="tablist" aria-label="Show on calendar">
          {categories.map((c, i) => (
            <React.Fragment key={c.id}>
              {i > 0 && c.group !== categories[i - 1].group && (
                <span className="mx-1 h-5 w-px shrink-0 bg-card-border" aria-hidden="true" />
              )}
              <button
                type="button"
                role="tab"
                aria-selected={activeFilter === c.id}
                onClick={() => setActiveFilter(c.id)}
                title={c.group === 'calendar' ? 'Calendar view' : 'Timeline view'}
                className={`relative isolate inline-flex min-h-9 shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-3.5 text-sm transition-colors ${
                  activeFilter === c.id ? "font-medium text-on-ink" : "text-text-secondary hover:text-foreground"
                }`}
              >
                {activeFilter === c.id && <TabPill />}
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: c.dot }} />
                {c.label}
              </button>
            </React.Fragment>
          ))}
        </div>

        <TimezoneClocks />
      </div>
    </div>
  );
}
