"use client";

import {
  eachDayOfInterval,
  endOfMonth,
  endOfDay,
  format,
  isSameDay,
  isValid,
  startOfDay,
  startOfMonth,
} from "date-fns";
import {
  FiCalendar,
  FiCheckCircle,
  FiChevronRight,
  FiMapPin,
} from "react-icons/fi";
import type { CalendarEvent } from "@/types/calendar";

export default function AgendaView({
  date,
  events,
  onEventClick,
}: {
  date: Date;
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
}) {
  const groups = eachDayOfInterval({
    start: startOfMonth(date),
    end: endOfMonth(date),
  })
    .map((day) => ({
      day,
      events: events
        .filter((event) => {
          const start = new Date(event.start),
            end = new Date(event.end || event.start);
          return (
            isValid(start) &&
            isValid(end) &&
            start <= endOfDay(day) &&
            end >= startOfDay(day)
          );
        })
        .sort(
          (a, b) =>
            Number(Boolean(b.allDay)) - Number(Boolean(a.allDay)) ||
            new Date(a.start).getTime() - new Date(b.start).getTime(),
        ),
    }))
    .filter((group) => group.events.length > 0);

  return (
    <section
      aria-label={`${format(date, "MMMM yyyy")} agenda`}
      className="p-4 sm:p-6"
    >
      {groups.length ? (
        <div className="divide-y divide-card-border">
          {groups.map(({ day, events: dayEvents }) => (
            <section
              key={day.toISOString()}
              className="grid gap-3 py-5 first:pt-0 last:pb-0 sm:grid-cols-[100px_minmax(0,1fr)] sm:gap-6"
            >
              <h3 className="flex items-baseline gap-2 sm:block">
                <span
                  className={`text-2xl font-semibold tracking-tight ${isSameDay(day, date) ? "text-accent-text" : "text-foreground"}`}
                >
                  {format(day, "d")}
                </span>
                <span className="text-xs text-text-muted sm:mt-1 sm:block">
                  {format(day, "EEEE")}
                  {isSameDay(day, new Date()) ? " · Today" : ""}
                </span>
              </h3>
              <ul className="min-w-0 space-y-2">
                {dayEvents.map((event) => (
                  <li key={event.id}>
                    <button
                      type="button"
                      onClick={() => onEventClick(event)}
                      className="group flex min-h-16 w-full items-center gap-4 rounded-[20px] bg-foreground/[0.025] px-4 py-3 text-left transition-colors duration-150 hover:bg-foreground/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
                    >
                      <span
                        className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${event.isTask ? "bg-success/10 text-success-text" : "bg-accent/10 text-accent-text"}`}
                      >
                        {event.isTask ? (
                          <FiCheckCircle className="h-4 w-4" />
                        ) : (
                          <FiCalendar className="h-4 w-4" />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-foreground">
                          {event.title}
                        </span>
                        <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-muted">
                          <span>
                            {event.allDay
                              ? "All day"
                              : `${format(new Date(event.start), "p")} – ${format(new Date(event.end), "p")}`}
                          </span>
                          {event.location && (
                            <span className="inline-flex min-w-0 items-center gap-1">
                              <FiMapPin className="shrink-0" />
                              <span className="truncate">{event.location}</span>
                            </span>
                          )}
                        </span>
                      </span>
                      <FiChevronRight className="h-4 w-4 shrink-0 text-text-muted transition-transform duration-150 group-hover:translate-x-0.5 motion-reduce:transform-none" />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      ) : (
        <div className="py-16 text-center">
          <FiCalendar className="mx-auto mb-3 h-7 w-7 text-text-muted" />
          <h3 className="text-base font-medium text-foreground">
            A clear month
          </h3>
          <p className="mt-1 text-sm text-text-muted">
            No items match this calendar filter.
          </p>
        </div>
      )}
    </section>
  );
}
