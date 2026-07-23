"use client";
import React, { useState, useMemo, useCallback, useEffect, useOptimistic, useTransition } from "react";
import { addDays, addMonths, addWeeks, startOfDay, isWithinInterval, endOfDay } from "date-fns";
import type { CalendarEvent, CalendarView } from "@/types/calendar";
import Toolbar from "./Toolbar";
import MonthGrid from "./MonthGrid";
import WeekGrid from "./WeekGrid";
import DayGrid from "./DayGrid";
import GanttGrid from "./GanttGrid";

import EventModal from "./EventModal";
import EventDetailModal from "./EventDetailModal";
import TimeOffModal from "./TimeOffModal";
import { useEvents } from "@/hooks/use-events";
import { useTasks } from "@/hooks/use-tasks";
import { useUsers } from "@/hooks/use-users";
import { useProjects } from "@/hooks/use-projects";
import { useTimeOff } from "@/hooks/use-time-off";
import { useCalendarData } from "@/hooks/use-calendar-data";
import CalendarLoading from "@/app/(dashboard)/[orgSlug]/calendar/loading";
import TimezoneClocks from "./TimezoneClocks";
import type { Task } from "@/types/task";
import type { User } from "@/types/user";
import type { Project } from "@/types/project";
import type { TimeOffRequest } from "@/types/time-off";

// UI-level event that may include task metadata
type UICalendarEvent = CalendarEvent;

interface CalendarProps {
  initialDate?: Date;
  initialView?: CalendarView;
  initialEvents?: CalendarEvent[];
  initialTasks?: Task[];
  initialUsers?: User[];
  initialProjects?: Project[];
  initialTimeOff?: TimeOffRequest[];
  currentUserRoles?: string[];
}

export default function Calendar({ initialDate, initialView = "month", initialEvents, initialTasks, initialUsers, initialProjects, initialTimeOff, currentUserRoles = [] }: CalendarProps) {
  const [currentDate, setCurrentDate] = useState<Date>(initialDate ? startOfDay(initialDate) : startOfDay(new Date()));
  const [view, setView] = useState<CalendarView>(initialView);
  const [activeFilter, setActiveFilter] = useState<'projects' | 'tasks' | 'events' | 'timeOff'>('tasks');
  const [, startTransition] = useTransition();

  // Force Gantt view for Projects and Time Off - Handle this in the change handler
  const handleFilterChange = useCallback((newFilter: 'projects' | 'tasks' | 'events' | 'timeOff') => {
    setActiveFilter(newFilter);
    if (newFilter === 'projects' || newFilter === 'timeOff') {
      setView('gantt');
    } else if (view === 'gantt') {
      setView('month');
    }
  }, [view]);

  // Background data
  const { users } = useUsers(initialUsers);
  const { 
    events: serverEvents, 
    tasks: serverTasks, 
    projects: serverProjects, 
    timeOffRequests, 
    isLoading: dataLoading, 
    mutate 
  } = useCalendarData({
    events: initialEvents,
    tasks: initialTasks,
    projects: initialProjects,
    timeOff: initialTimeOff
  }, users);

  const isLoading = dataLoading && serverEvents.length === 0;

  // Mutate data for everything when an update happens
  const mutateAll = useCallback(() => {
    mutate();
  }, [mutate]);

  // Can the current user request time off? (staff or above)
  const canRequestTimeOff = currentUserRoles.some(r => ['staff', 'manager', 'super_admin'].includes(r));

  // Combine events, tasks, projects, and time-off for the calendar
  const allEvents = useMemo(() => {
    const items: UICalendarEvent[] = [];

    if (activeFilter === 'events' || activeFilter === 'timeOff') {
        serverEvents.forEach((ev: any) => {
            const isTimeOffEvent = ev.title.toLowerCase().startsWith('leave:') || 
                                   ev.title.toLowerCase().startsWith('off:') || 
                                   ev.title.toLowerCase().startsWith('sick:') ||
                                   ev.title.toLowerCase().startsWith('other:');
            
            if ((isTimeOffEvent && activeFilter === 'timeOff') || (!isTimeOffEvent && activeFilter === 'events')) {
                const status = isTimeOffEvent ? 'approved' : undefined;
                const color = isTimeOffEvent ? 'bg-emerald-400' : ev.color;
                
                const user = isTimeOffEvent ? users.find((u: User) => u.id === ev.userId) : undefined;

                items.push({
                    ...ev,
                    start: new Date(ev.start),
                    end: new Date(ev.end),
                    color: color,
                    title: isTimeOffEvent ? `🌴 ${ev.title}` : ev.title,
                    isTimeOff: isTimeOffEvent,
                    timeOffStatus: status,
                    user: user,
                });
            }
        });
    }

    if (activeFilter === 'tasks') {
        serverTasks
          .filter((t: Task) => t.dueDate)
          .forEach((t: Task) => {
            const statusMap = t.status === "DONE" ? "completed" : t.status === "IN_PROGRESS" ? "in_progress" : "task";
            const color =
              statusMap === "completed" ? "bg-emerald-400" : statusMap === "in_progress" ? "bg-amber-400" : "bg-sky-400";
            items.push({
              id: `task-${t.id}`,
              title: t.name,
              start: new Date(t.dueDate!),
              end: new Date(t.dueDate!),
              allDay: true,
              color,
              isTask: true,
              taskStatus: statusMap as any,
              taskPriority: t.priority,
              taskAssignees: t.assignees?.map(a => a.user),
              description: t.description || "",
            });
          });
    }

    if (activeFilter === 'projects') {
        serverProjects.forEach((p: Project) => {
            if (p.startDate) {
                items.push({
                    id: `project-${p.id}`,
                    title: `[PROJ] ${p.name}`,
                    start: new Date(p.startDate),
                    end: p.endDate ? new Date(p.endDate) : addDays(new Date(p.startDate), 14),
                    allDay: true,
                    color: '#818cf8',
                    isProject: true,
                    projectStatus: p.status,
                    projectPriority: p.priority,
                    projectKey: p.key || undefined,
                    projectBudget: p.budget || undefined,
                    description: p.description || "",
                } as any);
            }
        });
    }

    if (activeFilter === 'timeOff') {
        timeOffRequests
          .filter((r: TimeOffRequest) => r.status === 'pending')
          .forEach((r: TimeOffRequest) => {
            const user = users.find((u: User) => u.id === r.user_id);
            const userName = user?.fullName || user?.email || 'User';
            const typeLabel = r.type.charAt(0).toUpperCase() + r.type.slice(1);
            items.push({
              id: `timeoff-${r.id}`,
              title: `⏳ ${userName} — ${typeLabel}`,
              start: new Date(r.start_date),
              end: new Date(r.end_date),
              allDay: true,
              color: 'bg-amber-300/80',
              description: r.justification || '',
              isTimeOff: true,
              timeOffStatus: r.status,
              timeOffType: r.type,
              timeOffJustification: r.justification || undefined,
              user: user,
              userId: r.user_id,
            } as any);
          });
    }

    return items;
  }, [serverEvents, serverTasks, serverProjects, timeOffRequests, users, activeFilter]);

  // Optimistic UI (rest of existing logic)
  const [optimisticEvents, addOptimisticEvent] = useOptimistic(
    allEvents,
    (state: UICalendarEvent[], action: { type: 'add' | 'update' | 'delete', event: UICalendarEvent }) => {
      switch (action.type) {
        case 'add':
          return [...state, action.event];
        case 'update':
          return state.map(e => e.id === action.event.id ? action.event : e);
        case 'delete':
          return state.filter(e => e.id !== action.event.id);
        default:
          return state;
      }
    }
  );

  const [modalOpen, setModalOpen] = useState(false);
  const [modalStart, setModalStart] = useState<Date | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<UICalendarEvent | null>(null);
  const [timeOffModalOpen, setTimeOffModalOpen] = useState(false);

  const onPrev = useCallback(() => {
    setCurrentDate((d) => (view === "month" ? addMonths(d, -1) : view === "week" ? addWeeks(d, -1) : addDays(d, -1)));
  }, [view]);

  const onNext = useCallback(() => {
    setCurrentDate((d) => (view === "month" ? addMonths(d, 1) : view === "week" ? addWeeks(d, 1) : addDays(d, 1)));
  }, [view]);

  const onToday = useCallback(() => setCurrentDate(startOfDay(new Date())), []);

  const normalizedEvents = useMemo(
    () =>
      optimisticEvents.map((e) => ({
        ...e,
        start: new Date(e.start),
        end: new Date(e.end),
      })),
    [optimisticEvents]
  );

  if (isLoading) {
    return <CalendarLoading />;
  }

  const isGanttForced = activeFilter === 'projects' || activeFilter === 'timeOff';

  return (
    <div className="flex flex-col h-full space-y-6 relative">
      <Toolbar
        currentDate={currentDate}
        view={view}
        onChangeView={setView}
        onPrev={onPrev}
        onNext={onNext}
        onToday={onToday}
        onAddEvent={() => {
          setModalStart(new Date());
          setModalOpen(true);
        }}
        onRequestTimeOff={() => setTimeOffModalOpen(true)}
        canRequestTimeOff={canRequestTimeOff}
        activeFilter={activeFilter}
        setActiveFilter={handleFilterChange}
        hideViewSwitcher={isGanttForced}
      />

      <div className="flex-1 bg-card rounded-2xl border border-card-border overflow-hidden">
        {isGanttForced ? (
          <GanttGrid
            date={currentDate}
            events={normalizedEvents}
            activeFilter={activeFilter}
            onEventClick={setSelectedEvent}
          />
        ) : (
          <>
            {view === "month" && (
              <MonthGrid
                date={currentDate}
                events={normalizedEvents}
                onSelectDate={(d) => {
                  setModalStart(d);
                  setModalOpen(true);
                }}
                onEventClick={setSelectedEvent}
              />
            )}
            {view === "week" && (
              <WeekGrid
                date={currentDate}
                events={normalizedEvents}
                onSelectDateTime={(d) => {
                  setModalStart(d);
                  setModalOpen(true);
                }}
                onEventClick={setSelectedEvent}
              />
            )}
            {view === "day" && (
              <DayGrid
                date={currentDate}
                events={normalizedEvents}
                onSelectDateTime={(d) => {
                  setModalStart(d);
                  setModalOpen(true);
                }}
                onEventClick={setSelectedEvent}
              />
            )}
            {view === "gantt" && (
               <GanttGrid
               date={currentDate}
               events={normalizedEvents}
               activeFilter={activeFilter}
               onEventClick={setSelectedEvent}
             />
            )}
          </>
        )}
      </div>

      <TimezoneClocks />

      <EventModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setModalStart(null);
        }}
        initialStart={modalStart}
        onCreated={() => { mutateAll(); }}
        onOptimisticAdd={(e) => startTransition(() => addOptimisticEvent({ type: 'add', event: e }))}
      />

      <TimeOffModal
        open={timeOffModalOpen}
        onClose={() => setTimeOffModalOpen(false)}
        onCreated={() => { mutateAll(); }}
      />

      {selectedEvent && (
        <EventDetailModal
          event={selectedEvent}
          open={!!selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onUpdated={() => { mutateAll(); }}
          onOptimisticUpdate={(e) => startTransition(() => addOptimisticEvent({ type: 'update', event: e }))}
          onOptimisticDelete={(e) => startTransition(() => addOptimisticEvent({ type: 'delete', event: e }))}
        />
      )}
    </div>
  );
}
