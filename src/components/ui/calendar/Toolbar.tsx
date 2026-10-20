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

export default function Toolbar({ 
  currentDate, view, onPrev, onNext, onToday, onChangeView, onAddEvent,
  onRequestTimeOff, canRequestTimeOff,
  activeFilter, setActiveFilter,
  hideViewSwitcher
}: ToolbarProps) {
  return (
    <div className="flex flex-col gap-6 mb-8">
      <div className="bg-card p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 border border-card-border">
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-foreground/[0.05] rounded-full border border-card-border p-1">
              <button onClick={onPrev} className="p-2 text-(--text-muted) hover:text-foreground hover:bg-foreground/[0.06] transition-all rounded-full">
              <FiChevronLeft className="h-4 w-4" />
              </button>
              <button onClick={onNext} className="p-2 text-(--text-muted) hover:text-foreground hover:bg-foreground/[0.06] transition-all rounded-full">
              <FiChevronRight className="h-4 w-4" />
              </button>
          </div>
          <button 
              onClick={onToday} 
              className="px-4 py-2 rounded-full bg-foreground/[0.05] border border-card-border text-(--text-muted) hover:text-foreground hover:bg-foreground/[0.06] text-sm font-medium transition-all"
          >
              Today
          </button>
          {onAddEvent && (
              <button 
                  onClick={onAddEvent} 
                  className="flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--pastel-indigo)]/10 border border-[var(--pastel-indigo)]/20 text-[var(--pastel-indigo)] hover:bg-[var(--pastel-indigo)]/20 text-sm font-bold transition-all ml-2"
              >
                  <FiPlus className="h-4 w-4" />
                  <span>Event</span>
              </button>
          )}
          {canRequestTimeOff && onRequestTimeOff && (
              <button 
                  onClick={onRequestTimeOff} 
                  className="flex items-center gap-2 px-4 py-2 rounded-full bg-warning/10 border border-warning/20 text-warning-text hover:bg-warning/20 text-sm font-bold transition-all"
              >
                  <FiSun className="h-4 w-4" />
                  <span>Time Off</span>
              </button>
          )}
        </div>
        
        <div className="text-xl font-bold text-foreground tracking-tight">
          {format(currentDate, "MMMM yyyy")}
        </div>

        {!hideViewSwitcher && (
          <div className="flex items-center space-x-1 bg-foreground/[0.05] p-1 rounded-full border border-card-border">
            {(['month', 'week', 'day'] as const).map((v) => (
                <button
                    key={v}
                    onClick={() => onChangeView?.(v)}
                    className={`relative isolate px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                        view === v ? "text-on-ink" : "text-(--text-muted) hover:text-foreground"
                    }`}
                >
                    {view === v && <TabPill id="calendar-view" />}
                    {v.charAt(0).toUpperCase() + v.slice(1)}
                </button>
            ))}
          </div>
        )}
      </div>

      {/* Filter Toggles */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 pb-2">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
              {/* Main Calendar Group */}
              <div className="flex flex-col gap-2.5">
                  <span className="text-[10px] font-black text-(--text-muted) uppercase tracking-[0.2em] px-1">Main Calendar</span>
                  <div className="flex items-center gap-2">
                      <FilterToggle
                        label="Events"
                        active={activeFilter === 'events'}
                        onClick={() => setActiveFilter('events')}
                        color="purple"
                      />
                      <FilterToggle
                        label="Tasks"
                        active={activeFilter === 'tasks'}
                        onClick={() => setActiveFilter('tasks')}
                        color="emerald"
                      />
                  </div>
              </div>

              <div className="hidden sm:block h-6 w-px bg-card-border self-end mb-2" />

              {/* Timeline Group */}
              <div className="flex flex-col gap-2.5">
                  <span className="text-[10px] font-black text-(--text-muted) uppercase tracking-[0.2em] px-1">Timeline (Gantt)</span>
                  <div className="flex items-center gap-2">
                      <FilterToggle
                        label="Projects"
                        active={activeFilter === 'projects'}
                        onClick={() => setActiveFilter('projects')}
                        color="indigo"
                      />
                      <FilterToggle
                        label="Time Off"
                        active={activeFilter === 'timeOff'}
                        onClick={() => setActiveFilter('timeOff')}
                        color="amber"
                      />
                  </div>
              </div>
          </div>

          <TimezoneClocks />
      </div>
    </div>
  );
}

function FilterToggle({ label, active, onClick, color }: { label: string, active: boolean, onClick: () => void, color: 'indigo' | 'emerald' | 'purple' | 'amber' }) {
    const activeColors = {
        indigo: 'bg-accent/10 dark:bg-accent/40 border-accent dark:border-accent text-accent-text dark:text-accent-text',
        emerald: 'bg-success/10 dark:bg-success/40 border-success dark:border-success text-success-text dark:text-success-text',
        purple: 'bg-purple-100 dark:bg-purple-900/40 border-purple-400 dark:border-purple-600 text-purple-600 dark:text-purple-300',
        amber: 'bg-warning/10 dark:bg-warning/40 border-warning dark:border-warning text-warning-text dark:text-warning-text'
    };

    return (
        <button
            onClick={onClick}
            className={`
                px-4 py-2 rounded-full border text-xs font-bold uppercase tracking-widest transition-all duration-300
                ${active 
                    ? activeColors[color] 
                    : 'bg-foreground/[0.02] border-card-border text-(--text-muted) hover:text-foreground hover:bg-foreground/[0.04]'
                }
            `}
        >
            {label}
        </button>
    );
}
