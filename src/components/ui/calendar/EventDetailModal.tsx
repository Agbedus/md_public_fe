"use client";
import React, { useState, useEffect } from "react";
import type { CalendarEvent, EventReminder } from "@/types/calendar";
import { format } from "date-fns";
import { 
  FiX, FiCalendar, FiMapPin, FiUsers, FiEdit2, FiTrash2, 
  FiGlobe, FiLock, FiBell, FiPlus, FiCheck, FiFlag, FiTrello, FiCheckCircle, FiDollarSign, FiSun, FiClock, FiCoffee
} from "react-icons/fi";
import { updateEvent, deleteEvent } from "@/app/(dashboard)/[orgSlug]/calendar/actions";
import { Tooltip } from "@/components/ui/Tooltip";
import { CustomDatePicker } from "@/components/ui/inputs/custom-date-picker";
import { CustomNumberInput } from "@/components/ui/inputs/custom-number-input";
import { useConfirm } from "@/providers/confirmation-provider";

interface Props {
  event: CalendarEvent | null;
  open: boolean;
  onClose: () => void;
  onUpdated: () => Promise<void> | void;
  onOptimisticUpdate?: (event: CalendarEvent) => void;
  onOptimisticDelete?: (event: CalendarEvent) => void;
}

export default function EventDetailModal({ 
  event, 
  open, 
  onClose, 
  onUpdated,
  onOptimisticUpdate,
  onOptimisticDelete 
}: Props) {
  const confirm = useConfirm();
  const [isEditing, setIsEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [allDay, setAllDay] = useState(false);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [location, setLocation] = useState("");
  const [organizer, setOrganizer] = useState("");
  const [attendees, setAttendees] = useState("");
  const [status, setStatus] = useState<"tentative"|"confirmed"|"cancelled">("confirmed");
  const [privacy, setPrivacy] = useState<"public"|"private"|"confidential">("public");
  const [recurrence, setRecurrence] = useState<"none"|"daily"|"weekly"|"monthly"|"yearly">("none");
  const [reminders, setReminders] = useState<EventReminder[]>([]);
  const [color, setColor] = useState("#6366f1");

  // Reminder inputs
  const [rDays, setRDays] = useState(0);
  const [rHours, setRHours] = useState(0);
  const [rMinutes, setRMinutes] = useState(0);

  // Helper functions
  function toLocalISOString(date: Date) {
    const pad = (n: number) => n.toString().padStart(2, '0');
    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  function toDateOnly(value: string) {
    return value.length > 10 ? value.slice(0, 10) : value;
  }

  function toDateTime(value: string, fallbackTime: string) {
    return value.length === 10 ? `${value}T${fallbackTime}` : value;
  }

  // Initialize state when event opens
  useEffect(() => {
    if (event && open) {
      setIsEditing(false); // Start in view mode
      setTitle(event.title);
      setDescription(event.description || "");
      setAllDay(Boolean(event.allDay));
      
      try {
          const s = new Date(event.start);
          const e = new Date(event.end);
          if(!isNaN(s.getTime())) setStart(toLocalISOString(s));
          if(!isNaN(e.getTime())) setEnd(toLocalISOString(e));
      } catch (e) {
          console.error("Invalid dates", e);
      }

      setLocation(event.location || "");
      setOrganizer(event.organizer || "");
      setAttendees(event.attendees ? event.attendees.join(", ") : "");
      
      setStatus((event.status as any) || "confirmed");
      setPrivacy((event.privacy as any) || "public");
      setRecurrence((event.recurrence as any) || "none");
      
      setReminders(event.reminders || []);
      setColor(event.color || "#6366f1");
    }
  }, [event, open]);

  // Handle all-day toggle
  useEffect(() => {
    if (allDay) {
      setStart((prev) => toDateOnly(prev));
      setEnd((prev) => toDateOnly(prev));
    } else {
      setStart((prev) => toDateTime(prev, "09:00"));
      setEnd((prev) => toDateTime(prev, "10:00"));
    }
  }, [allDay]);


  if (!open || !event) return null;

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!event) return;
    setSubmitting(true);

    // Optimistic Update
    const updatedEvent: CalendarEvent = {
        ...event,
        title,
        description: description || undefined,
        start: new Date(start).toISOString(),
        end: new Date(end).toISOString(),
        allDay,
        location: location || undefined,
        organizer: organizer || undefined,
        attendees: attendees.split(",").map(s => s.trim()).filter(Boolean),
        status,
        privacy,
        recurrence,
        reminders,
        color,
        updatedAt: new Date().toISOString()
    };
    onOptimisticUpdate?.(updatedEvent);
    onClose();

    try {
      const formData = new FormData();
      formData.append('id', String(event.id));
      formData.append('title', title);
      formData.append('description', description);
      formData.append('start', new Date(start).toISOString());
      formData.append('end', new Date(end).toISOString());
      formData.append('allDay', String(allDay));
      formData.append('location', location);
      formData.append('organizer', organizer);
      formData.append('attendees', JSON.stringify(attendees.split(",").map(s => s.trim()).filter(Boolean)));
      formData.append('status', status);
      formData.append('privacy', privacy);
      formData.append('recurrence', recurrence);
      formData.append('reminders', JSON.stringify(reminders));
      formData.append('color', color);

      const res = await updateEvent(formData);
      if (res && !res.success) {
        console.error(res.error || "Failed to update event");
      }
      await onUpdated();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    const confirmed = await confirm({
      title: 'Delete Event',
      message: `Are you sure you want to delete "${event?.title}"? This action cannot be undone.`,
      confirmText: 'Delete Event',
      type: 'danger'
    });

    if (!confirmed) return;
    if (!event) return;
    setSubmitting(true);

    onOptimisticDelete?.(event);
    onClose();

    try {
      const res = await deleteEvent(event.id);
      if (res && !res.success) {
         console.error(res.error || "Failed to delete");
      }
      await onUpdated();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  }

  function handleBackdropClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose();
  }

  const startInputType = allDay ? "date" : "datetime-local";
  const endInputType = allDay ? "date" : "datetime-local";

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end md:items-center justify-center p-0 md:p-6"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-white/60 dark:bg-black/60 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      <div className="relative w-full md:max-w-3xl bg-background border border-card-border rounded-t-[2.5rem] md:rounded-[2.5rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex-none px-8 py-5 border-b border-card-border flex items-center justify-between bg-foreground/[0.03]">
          <div className="text-foreground font-black tracking-tightest truncate pr-4 text-lg uppercase italic">
            {isEditing ? "Refine Objective" : event.title.replace(/[\u{1F300}-\u{1F9FF}]/gu, '').trim()}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl hover:bg-foreground/[0.05] text-text-secondary hover:text-foreground transition-all border border-transparent hover:border-card-border"
          >
            <FiX className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
          
          {/* View Mode */}
          {!isEditing && (
            <div className="space-y-8">
              <div className="flex flex-col gap-6">
                 {/* Timing */}
                 <div className="flex items-start gap-4">
                    <div className="mt-1 h-10 w-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0 shadow-sm">
                      <FiCalendar className="h-5 w-5" />
                    </div>
                    <div className="space-y-1">
                        <div className="text-lg font-black text-foreground uppercase tracking-tightest italic">
                            {event.allDay ? (
                                <span>{format(new Date(event.start), "EEEE, MMMM d, yyyy")}</span>
                            ) : (
                                <span>
                                    {format(new Date(event.start), "EEEE, MMMM d")} • {format(new Date(event.start), "h:mm a")} - {format(new Date(event.end), "h:mm a")}
                                </span>
                            )}
                        </div>
                        <div className="text-[10px] text-text-muted font-black uppercase tracking-[0.2em] flex items-center gap-2">
                            {event.allDay ? "Full Duration Active" : "Precision Timing Active"}
                            {event.recurrence && event.recurrence !== 'none' && (
                                <span className="text-purple-600 dark:text-purple-400 font-black uppercase tracking-[0.2em] bg-purple-500/10 px-2 py-0.5 rounded-lg border border-purple-500/20">
                                    Protocol: {event.recurrence}
                                </span>
                            )}
                        </div>
                    </div>
                 </div>

                  {/* Time Off Specific Details */}
                  {event.isTimeOff && (
                    <div className="space-y-6 pt-2 animate-in fade-in slide-in-from-top-2 duration-300">
                      <div className="grid grid-cols-2 gap-6">
                        <div className="p-4 bg-amber-500/5 border border-amber-500/10 rounded-2xl">
                          <div className="text-[10px] font-black text-amber-600 dark:text-amber-500 uppercase tracking-[0.2em] mb-2 flex items-center gap-1.5">
                            <FiCoffee className="w-3.5 h-3.5" /> Exemption Type
                          </div>
                          <div className="text-sm font-black text-foreground uppercase tracking-widest">
                            {event.timeOffType || 'Vacation'}
                          </div>
                        </div>
                        <div className="p-4 bg-amber-500/5 border border-amber-500/10 rounded-2xl">
                          <div className="text-[10px] font-black text-amber-600 dark:text-amber-500 uppercase tracking-[0.2em] mb-2 flex items-center gap-1.5">
                            {event.timeOffStatus === 'approved' ? <FiCheckCircle className="w-3.5 h-3.5 text-emerald-500" /> : <FiClock className="w-3.5 h-3.5 text-amber-500" />} Operational Status
                          </div>
                          <div className={`text-sm font-black uppercase tracking-widest ${event.timeOffStatus === 'approved' ? 'text-emerald-600 dark:text-emerald-500' : 'text-amber-600 dark:text-amber-400'}`}>
                            {event.timeOffStatus || 'Pending'}
                          </div>
                        </div>
                      </div>
                      
                      {event.timeOffJustification && (
                        <div className="p-6 bg-foreground/[0.03] border border-card-border rounded-2xl">
                          <div className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] mb-3 flex items-center gap-1.5">
                            <FiEdit2 className="w-3.5 h-3.5" /> Operational Justification
                          </div>
                          <div className="text-sm text-foreground leading-relaxed italic font-bold">
                            &ldquo;{event.timeOffJustification}&rdquo;
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Project Specific Details */}
                  {event.isProject && (
                    <div className="space-y-6 pt-2 animate-in fade-in slide-in-from-top-2 duration-300">
                      <div className="grid grid-cols-2 gap-6">
                        <div className="p-4 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl">
                          <div className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.2em] mb-2 flex items-center gap-1.5">
                            <FiTrello className="w-3.5 h-3.5" /> Mission Key / Client
                          </div>
                          <div className="text-sm font-black text-foreground uppercase tracking-widest">
                            {event.projectKey || 'N/A'} {event.projectClient ? `• ${event.projectClient}` : ''}
                          </div>
                        </div>
                        <div className="p-4 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl">
                          <div className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.2em] mb-2 flex items-center gap-1.5">
                            <FiFlag className="w-3.5 h-3.5 text-rose-500" /> Strategic Priority
                          </div>
                          <div className="text-sm font-black text-foreground uppercase tracking-widest">
                            {event.projectPriority || 'Medium'}
                          </div>
                        </div>
                      </div>

                      {event.projectBudget && (
                        <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl flex items-center justify-between">
                          <div className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-[0.2em] flex items-center gap-1.5">
                            <FiDollarSign className="w-3.5 h-3.5" /> Allocated Capital
                          </div>
                          <div className="text-lg font-black text-emerald-600 dark:text-emerald-400 tracking-tighter tabular-nums">
                            ${event.projectBudget.toLocaleString()}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Task Specific Details */}
                  {event.isTask && (
                    <div className="space-y-6 pt-2 animate-in fade-in slide-in-from-top-2 duration-300">
                      <div className="grid grid-cols-2 gap-6">
                        <div className="p-4 bg-sky-500/5 border border-sky-500/10 rounded-2xl">
                          <div className="text-[10px] font-black text-sky-600 dark:text-sky-400 uppercase tracking-[0.2em] mb-2 flex items-center gap-1.5">
                            <FiCheckCircle className="w-3.5 h-3.5 text-indigo-500" /> Operational State
                          </div>
                          <div className="text-sm font-black text-foreground uppercase tracking-widest">
                            {event.taskStatus || 'Todo'}
                          </div>
                        </div>
                        <div className="p-4 bg-sky-500/5 border border-sky-500/10 rounded-2xl">
                          <div className="text-[10px] font-black text-sky-600 dark:text-sky-400 uppercase tracking-[0.2em] mb-2 flex items-center gap-1.5">
                            <FiFlag className="w-3.5 h-3.5 text-rose-500" /> Strategic Priority
                          </div>
                          <div className="text-sm font-black text-foreground uppercase tracking-widest">
                            {event.taskPriority || 'Medium'}
                          </div>
                        </div>
                      </div>

                      {event.taskAssignees && event.taskAssignees.length > 0 && (
                        <div className="p-5 bg-foreground/[0.03] border border-card-border rounded-2xl">
                          <div className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] mb-4 flex items-center gap-1.5">
                            <FiUsers className="w-3.5 h-3.5" /> Assigned Personnel
                          </div>
                          <div className="flex flex-wrap gap-3">
                             {event.taskAssignees.map((u, i) => (
                               <div key={i} className="flex items-center gap-2.5 px-3 py-1.5 bg-background rounded-xl border border-card-border shadow-sm">
                                 <div className="h-5 w-5 bg-indigo-500 rounded-full flex items-center justify-center text-[10px] font-black text-white uppercase">
                                   {u.fullName?.charAt(0) || u.email?.charAt(0)}
                                 </div>
                                 <span className="text-[11px] text-foreground font-bold uppercase tracking-tight">{u.fullName || u.email}</span>
                               </div>
                             ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {!event.isProject && !event.isTask && !event.isTimeOff && (
                    <>
                      {/* Location */}
                      {event.location && (
                          <div className="flex items-start gap-4">
                              <div className="mt-1 h-10 w-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0 shadow-sm">
                                <FiMapPin className="h-5 w-5" />
                              </div>
                              <div className="space-y-1">
                                  <div className="text-lg font-black text-foreground uppercase tracking-tight">{event.location}</div>
                                  <div className="text-[10px] text-text-muted font-black uppercase tracking-[0.2em]">Operational Coordinates</div>
                              </div>
                          </div>
                      )}

                      {/* Attendees */}
                      {event.attendees && event.attendees.length > 0 && (
                          <div className="flex items-start gap-4">
                              <div className="mt-1 h-10 w-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0 shadow-sm">
                                <FiUsers className="h-5 w-5" />
                              </div>
                              <div className="space-y-3 flex-1 min-w-0">
                                  <div className="flex flex-wrap gap-2">
                                      {event.attendees.map((email, idx) => (
                                          <span key={idx} className="px-3 py-1 text-[11px] font-bold bg-foreground/[0.03] text-foreground rounded-lg border border-card-border uppercase tracking-tight">
                                              {email.trim()}
                                          </span>
                                      ))}
                                  </div>
                                  <div className="text-[10px] text-text-muted font-black uppercase tracking-[0.2em]">Assigned Personnel</div>
                              </div>
                          </div>
                      )}

                      {/* Description */}
                      {event.description && (
                          <div className="bg-foreground/[0.02] rounded-[2rem] border border-card-border p-6 mt-4">
                              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted mb-3 flex items-center gap-2">
                                  <FiEdit2 className="h-3.5 w-3.5" /> Tactical Briefing
                              </div>
                              <div className="text-sm text-foreground font-bold whitespace-pre-wrap leading-relaxed italic opacity-80 uppercase tracking-tight">
                                  &ldquo;{event.description}&rdquo;
                              </div>
                          </div>
                      )}
                      
                      {/* Metadata Badge Row */}
                      <div className="flex flex-wrap gap-3 mt-6 border-t border-card-border pt-8">
                          <div className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border inline-flex items-center gap-2 shadow-sm ${
                              event.status === 'confirmed' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400' :
                              event.status === 'cancelled' ? 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400' :
                              'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400'
                          }`}>
                              <div className={`h-2 w-2 rounded-full ${
                                  event.status === 'confirmed' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' :
                                  event.status === 'cancelled' ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]' :
                                  'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]'
                              }`} />
                              {event.status || 'Tentative'}
                          </div>
                          
                          <div className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-foreground/[0.03] border border-card-border text-text-secondary inline-flex items-center gap-2 shadow-sm">
                              {event.privacy === 'private' ? <FiLock className="h-3.5 w-3.5" /> : <FiGlobe className="h-3.5 w-3.5" />}
                              Security: {event.privacy || 'Public'}
                          </div>

                          <div className="flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-foreground/[0.03] border border-card-border text-text-secondary shadow-sm">
                              <div className="h-2.5 w-2.5 rounded-full ring-2 ring-background shadow-sm" style={{backgroundColor: event.color || '#6366f1'}} />
                              Chromatic
                          </div>
                      </div>
                    </>
                  )}
              </div>
            </div>
          )}

          {/* Edit Mode Form */}
          {isEditing && (
            <form id="edit-event-form" onSubmit={handleUpdate} className="space-y-8 animate-in fade-in zoom-in-95 duration-300">
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-1">Mission Identifier</label>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-foreground/[0.03] border border-card-border rounded-2xl px-5 py-3 text-sm text-foreground placeholder:text-text-muted/50 focus:outline-none focus:border-purple-500/30 transition-all font-bold"
                    placeholder="Operational designation..."
                    required
                  />
                </div>
                
                <div className="flex items-center gap-4 py-1">
                   <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-foreground/[0.03] border border-card-border hover:bg-foreground/[0.05] transition-all cursor-pointer group">
                      <input 
                        type="checkbox" 
                        id="edit-allday" 
                        checked={allDay} 
                        onChange={(e) => setAllDay(e.target.checked)}
                        className="rounded-md border-card-border bg-background text-purple-600 focus:ring-purple-500/30 focus:ring-offset-0 h-4 w-4 transition-all"
                      />
                      <label htmlFor="edit-allday" className="text-[10px] font-black text-text-muted group-hover:text-foreground uppercase tracking-widest cursor-pointer select-none transition-colors">Temporal Mode: Full Duration</label>
                   </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="block text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-1">Commencement</label>
                        <CustomDatePicker
                            value={start}
                            onChange={(date) => {
                                if (date) {
                                    setStart(allDay ? format(date, "yyyy-MM-dd") : format(date, "yyyy-MM-dd'T'HH:mm"));
                                }
                            }}
                            enableTime={!allDay}
                            className="w-full"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="block text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-1">Termination</label>
                        <CustomDatePicker
                            value={end}
                            onChange={(date) => {
                                if (date) {
                                    setEnd(allDay ? format(date, "yyyy-MM-dd") : format(date, "yyyy-MM-dd'T'HH:mm"));
                                }
                            }}
                            enableTime={!allDay}
                            className="w-full"
                            minDate={start ? new Date(start) : undefined}
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="block text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-1">Operational Coordinates</label>
                    <input
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        className="w-full bg-foreground/[0.03] border border-card-border rounded-2xl px-5 py-3 text-sm text-foreground placeholder:text-text-muted/50 focus:outline-none focus:border-purple-500/30 transition-all font-bold"
                        placeholder="Deployment zone..."
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="block text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-1">Mission Lead</label>
                        <input
                            value={organizer}
                            onChange={(e) => setOrganizer(e.target.value)}
                            className="w-full bg-foreground/[0.03] border border-card-border rounded-2xl px-5 py-3 text-sm text-foreground placeholder:text-text-muted/50 focus:outline-none focus:border-purple-500/30 transition-all font-bold"
                            placeholder="Host name"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="block text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-1">Assigned Personnel</label>
                        <input
                            value={attendees}
                            onChange={(e) => setAttendees(e.target.value)}
                            className="w-full bg-foreground/[0.03] border border-card-border rounded-2xl px-5 py-3 text-sm text-foreground placeholder:text-text-muted/50 focus:outline-none focus:border-purple-500/30 transition-all font-bold"
                            placeholder="Authorized IDs..."
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                     <div className="space-y-2">
                        <label className="block text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-1">Operational Status</label>
                        <select 
                            value={status} 
                            onChange={(e) => setStatus(e.target.value as any)}
                            className="w-full bg-foreground/[0.03] border border-card-border rounded-2xl px-5 py-3 text-sm text-foreground focus:outline-none focus:border-purple-500/30 font-bold appearance-none cursor-pointer"
                        >
                            <option value="tentative" className="bg-background">Tentative</option>
                            <option value="confirmed" className="bg-background">Confirmed</option>
                            <option value="cancelled" className="bg-background">Aborted</option>
                        </select>
                     </div>
                     <div className="space-y-2">
                        <label className="block text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-1">Recurrence Protocol</label>
                        <select 
                            value={recurrence} 
                            onChange={(e) => setRecurrence(e.target.value as any)}
                            className="w-full bg-foreground/[0.03] border border-card-border rounded-2xl px-5 py-3 text-sm text-foreground focus:outline-none focus:border-purple-500/30 font-bold appearance-none cursor-pointer"
                        >
                            <option value="none" className="bg-background">Static</option>
                            <option value="daily" className="bg-background">Daily</option>
                            <option value="weekly" className="bg-background">Weekly</option>
                            <option value="monthly" className="bg-background">Monthly</option>
                            <option value="yearly" className="bg-background">Annual</option>
                        </select>
                     </div>
                </div>
                
                 <div className="space-y-2">
                    <label className="block text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-1">Security Classification</label>
                    <select 
                        value={privacy} 
                        onChange={(e) => setPrivacy(e.target.value as any)}
                        className="w-full bg-foreground/[0.03] border border-card-border rounded-2xl px-5 py-3 text-sm text-foreground focus:outline-none focus:border-purple-500/30 font-bold appearance-none cursor-pointer"
                    >
                        <option value="public" className="bg-background">Public</option>
                        <option value="private" className="bg-background">Private</option>
                        <option value="confidential" className="bg-background">Restricted</option>
                    </select>
                 </div>

                <div className="space-y-3">
                    <label className="block text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-1">Chromatic Designation</label>
                    <div className="flex flex-wrap gap-3 p-4 bg-foreground/[0.03] rounded-2xl border border-card-border">
                        {(["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4"] as const).map((c) => (
                        <button
                            type="button"
                            key={c}
                            onClick={() => setColor(c)}
                            className={`h-6 w-6 rounded-full border-2 transition-all duration-500 ${
                            color === c ? "border-foreground scale-110 shadow-lg" : "border-transparent opacity-40 hover:opacity-100 hover:scale-110"
                            }`}
                            style={{ backgroundColor: c }}
                        />
                        ))}
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="block text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-1">Tactical Briefing</label>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full bg-foreground/[0.03] border border-card-border rounded-2xl px-5 py-3 text-sm text-foreground placeholder:text-text-muted/50 focus:outline-none focus:border-purple-500/30 transition-all font-bold resize-none custom-scrollbar min-h-[100px]"
                        placeholder="Add mission context..."
                    />
                </div>

                <div className="space-y-4">
                    <label className="block text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
                        <FiBell className="text-purple-500" /> Proactive Notifications
                    </label>
                    <div className="flex flex-wrap gap-2 mb-2">
                        {reminders.map((r, idx) => (
                        <span key={idx} className="inline-flex items-center gap-2 px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full border border-purple-500/30 bg-purple-500/10 text-purple-600 dark:text-purple-400 shadow-sm">
                            {r.days > 0 && `${r.days}D `}
                            {r.hours > 0 && `${r.hours}H `}
                            {r.minutes > 0 && `${r.minutes}M `}
                            Lead Time
                            <button type="button" onClick={() => setReminders((prev) => prev.filter((_, i) => i !== idx))} className="ml-1 p-0.5 hover:bg-purple-500/20 rounded-full transition-all">
                             <FiX className="h-3 w-3" />
                            </button>
                        </span>
                        ))}
                    </div>
                    
                    <div className="flex flex-wrap items-end gap-3 p-5 bg-foreground/[0.03] border border-card-border rounded-2xl shadow-sm">
                        <div className="flex-1 min-w-[60px]">
                        <label className="block text-[9px] uppercase font-black tracking-[0.2em] text-text-muted mb-2 ml-1">Days</label>
                        <CustomNumberInput
                            value={rDays}
                            onChange={(val) => setRDays(Number(val) || 0)}
                            min={0}
                        />
                        </div>
                        <div className="flex-1 min-w-[60px]">
                        <label className="block text-[9px] uppercase font-black tracking-[0.2em] text-text-muted mb-2 ml-1">Hrs</label>
                        <CustomNumberInput
                            value={rHours}
                            onChange={(val) => setRHours(Number(val) || 0)}
                            min={0}
                            max={23}
                        />
                        </div>
                        <div className="flex-1 min-w-[60px]">
                        <label className="block text-[9px] uppercase font-black tracking-[0.2em] text-text-muted mb-2 ml-1">Mins</label>
                        <CustomNumberInput
                            value={rMinutes}
                            onChange={(val) => setRMinutes(Number(val) || 0)}
                            min={0}
                            max={59}
                        />
                        </div>
                        <button
                        type="button"
                        onClick={() => {
                            if (rDays === 0 && rHours === 0 && rMinutes === 0) return;
                            setReminders((prev) => [...prev, { days: rDays, hours: rHours, minutes: rMinutes }]);
                            setRDays(0); setRHours(0); setRMinutes(0);
                        }}
                        className="h-11 px-5 inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest rounded-xl bg-foreground/10 text-foreground border border-card-border hover:bg-foreground/[0.15] transition-all active:scale-95 shadow-sm"
                        >
                        <FiPlus className="h-4 w-4" /> Add Alert
                        </button>
                    </div>
                </div>
            </form>
          )}

        </div>

        {/* Footer Actions */}
        <div className="flex-none p-6 border-t border-card-border bg-foreground/[0.03] flex items-center justify-between">
            {isEditing ? (
                <>
                    <button
                        type="button"
                        onClick={handleDelete}
                        className="px-4 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-[10px] font-black uppercase tracking-widest hover:bg-rose-500/20 transition-all flex items-center gap-2 shadow-sm"
                    >
                        <FiTrash2 className="h-4 w-4" />
                        Terminate
                    </button>
                    
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => setIsEditing(false)}
                            className="px-6 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest text-text-secondary hover:text-foreground bg-foreground/[0.03] hover:bg-foreground/[0.06] border border-card-border transition-all"
                        >
                            Abort
                        </button>
                        
                        <button
                            type="submit"
                            form="edit-event-form"
                            disabled={submitting}
                            className="px-8 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest text-white bg-purple-600 hover:bg-purple-500 transition-all shadow-lg shadow-purple-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {submitting ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> : <FiCheck className="h-4 w-4" />}
                            Execute Sync
                        </button>
                    </div>
                </>
            ) : (
                <>
                    <button
                        type="button"
                        onClick={handleDelete}
                        disabled={event.isProject || event.isTask || event.isTimeOff}
                        className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border flex items-center gap-2 transition-all shadow-sm ${
                            (event.isProject || event.isTask || event.isTimeOff) 
                            ? 'opacity-20 bg-foreground/[0.03] border-card-border text-text-muted cursor-not-allowed grayscale' 
                            : 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20'
                        }`}
                    >
                        <FiTrash2 className="h-4 w-4" />
                        Terminate
                    </button>
                    
                    <button
                        type="button"
                        onClick={() => setIsEditing(true)}
                        disabled={event.isProject || event.isTask || event.isTimeOff}
                        className={`px-6 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest border transition-all flex items-center gap-2 shadow-sm ${
                            (event.isProject || event.isTask || event.isTimeOff)
                            ? 'bg-foreground/[0.02] border-card-border text-text-muted cursor-not-allowed'
                            : 'bg-indigo-600 border-indigo-500 text-white hover:bg-indigo-500 shadow-indigo-500/20'
                        }`}
                    >
                        <FiEdit2 className="h-4 w-4" />
                        { (event.isProject || event.isTask || event.isTimeOff) ? "Locked Record" : "Refine Mission" }
                    </button>
                </>
            )}
        </div>

      </div>
    </div>
  );
}
