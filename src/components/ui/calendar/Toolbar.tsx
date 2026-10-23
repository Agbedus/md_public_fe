"use client";

import { format } from "date-fns";
import { FiChevronLeft, FiChevronRight, FiPlus, FiSun } from "react-icons/fi";
import type { CalendarView } from "@/types/calendar";
import TimezoneClocks from "./TimezoneClocks";
import { TabPill } from "@/components/ui/tab-pill";
import { CollectionToolbar } from "@/components/ui/collection-toolbar";

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
  activeFilter: "projects" | "tasks" | "events" | "timeOff";
  setActiveFilter: (
    filter: "projects" | "tasks" | "events" | "timeOff",
  ) => void;
  hideViewSwitcher?: boolean;
}
type CalendarFilter = ToolbarProps["activeFilter"];

export default function Toolbar({
  currentDate,
  view,
  onPrev,
  onNext,
  onToday,
  onChangeView,
  onAddEvent,
  onRequestTimeOff,
  canRequestTimeOff,
  activeFilter,
  setActiveFilter,
  hideViewSwitcher,
}: ToolbarProps) {
  const categories: {
    id: CalendarFilter;
    label: string;
    dot: string;
    group: "calendar" | "timeline";
  }[] = [
    {
      id: "events",
      label: "Events",
      dot: "var(--status-qa)",
      group: "calendar",
    },
    { id: "tasks", label: "Tasks", dot: "var(--accent)", group: "calendar" },
    {
      id: "projects",
      label: "Projects",
      dot: "var(--status-review)",
      group: "timeline",
    },
    {
      id: "timeOff",
      label: "Time off",
      dot: "var(--warning)",
      group: "timeline",
    },
  ];
  const iconButton =
    "grid h-11 w-11 place-items-center rounded-full text-text-muted transition-colors duration-150 hover:bg-foreground/[0.06] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50";

  return (
    <div className="space-y-4">
      {/* Navigation, title, actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">
          {format(currentDate, view === "day" ? "MMMM d, yyyy" : "MMMM yyyy")}
        </h2>
        <TimezoneClocks />
      </div>
      <CollectionToolbar
        label="Calendar controls"
        search={
          <div className="flex w-fit items-center rounded-full bg-foreground/[0.04]">
            <button
              type="button"
              onClick={onPrev}
              aria-label="Previous period"
              className={iconButton}
            >
              <FiChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onToday}
              className="min-h-11 rounded-full px-5 text-sm font-medium text-text-secondary transition-colors hover:bg-foreground/[0.06] hover:text-foreground"
            >
              Today
            </button>
            <button
              type="button"
              onClick={onNext}
              aria-label="Next period"
              className={iconButton}
            >
              <FiChevronRight className="h-4 w-4" />
            </button>
          </div>
        }
        filters={
          /* What the calendar shows: one choice at a time, as tabs */
          <div
            className="flex shrink-0 items-center gap-1 rounded-full bg-foreground/[0.04] p-1"
            role="group"
            aria-label="Show on calendar"
          >
            {categories.map((c) => (
              <button
                key={c.id}
                type="button"
                aria-pressed={activeFilter === c.id}
                onClick={() => setActiveFilter(c.id)}
                data-tooltip={
                  c.group === "timeline" ? "Timeline view" : undefined
                }
                className={`relative isolate inline-flex min-h-9 shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-3.5 text-sm transition-colors ${activeFilter === c.id ? "font-medium text-on-ink" : "text-text-secondary hover:text-foreground"}`}
              >
                {activeFilter === c.id && <TabPill />}
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: c.dot }}
                />
                {c.label}
              </button>
            ))}
          </div>
        }
        tools={
          <>
            {!hideViewSwitcher && (
              <div
                className="flex shrink-0 items-center gap-1 rounded-full bg-foreground/[0.04] p-1"
                role="group"
                aria-label="Calendar layout"
              >
                {(["month", "week", "day", "agenda"] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => onChangeView?.(value)}
                    aria-pressed={view === value}
                    className={`relative isolate min-h-9 rounded-full px-3.5 text-sm transition-colors ${view === value ? "font-medium text-on-ink" : "text-text-muted hover:text-foreground"}`}
                  >
                    {view === value && <TabPill />}
                    {value.charAt(0).toUpperCase() + value.slice(1)}
                  </button>
                ))}
              </div>
            )}
            {canRequestTimeOff && onRequestTimeOff && (
              <button
                type="button"
                onClick={onRequestTimeOff}
                className="md-btn md-btn-secondary !min-h-11"
              >
                <FiSun className="h-4 w-4" />
                Time off
              </button>
            )}
            {onAddEvent && (
              <button
                type="button"
                onClick={onAddEvent}
                className="md-btn md-btn-primary !min-h-11"
              >
                New event
                <span className="md-btn-chip">
                  <FiPlus />
                </span>
              </button>
            )}
          </>
        }
      />
    </div>
  );
}
