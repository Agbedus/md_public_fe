"use client";
import React, { useEffect, useState } from "react";
import { FiBell, FiX, FiCheck, FiClock, FiCalendar, FiMapPin, FiPlus } from "react-icons/fi";
import { createEvent } from "@/app/(dashboard)/[orgSlug]/calendar/actions";
import type { CalendarEvent, EventReminder } from "@/types/calendar";
import { Tooltip } from "@/components/ui/Tooltip";
import { CustomDatePicker } from "@/components/ui/inputs/custom-date-picker";
import { CustomNumberInput } from "@/components/ui/inputs/custom-number-input";
import { format } from "date-fns";

interface EventModalProps {
  open: boolean;
  initialStart?: Date | null;
  onClose: () => void;
  onCreated: () => Promise<void> | void;
  onOptimisticAdd?: (event: CalendarEvent) => void;
}

export default function EventModal({ open, initialStart, onClose, onCreated, onOptimisticAdd }: EventModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [allDay, setAllDay] = useState(false);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [location, setLocation] = useState("");
  const [organizer, setOrganizer] = useState("");
  const [attendees, setAttendees] = useState(""); // comma separated
  const [status, setStatus] = useState<"tentative"|"confirmed"|"cancelled">("tentative");
  const [privacy, setPrivacy] = useState<"public"|"private"|"confidential">("public");
  const [recurrence, setRecurrence] = useState<"none"|"daily"|"weekly"|"monthly"|"yearly">("none");
  const [reminders, setReminders] = useState<EventReminder[]>([]);
  const [color, setColor] = useState("#6366f1");
  
  const [rDays, setRDays] = useState(0);
  const [rHours, setRHours] = useState(0);
  const [rMinutes, setRMinutes] = useState(0);
  
  const [submitting, setSubmitting] = useState(false);

  // Helpers
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

  useEffect(() => {
    if (open) {
      const base = initialStart ?? new Date();
      const startLocal = toLocalISOString(base);
      const endBase = new Date(base.getTime() + 60*60*1000); // Default 1 hour duration
      const endLocal = toLocalISOString(endBase);
      const frame = window.requestAnimationFrame(() => {
        setTitle("");
        setDescription("");
        setAllDay(false);
        setStart(startLocal);
        setEnd(endLocal);
        setLocation("");
        setOrganizer("");
        setAttendees("");
        setStatus("tentative");
        setPrivacy("public");
        setRecurrence("none");
        setReminders([]);
        setColor("#6366f1");
        setRDays(0);
        setRHours(0);
        setRMinutes(0);
        setSubmitting(false);
      });
      return () => window.cancelAnimationFrame(frame);
    }
  }, [open, initialStart]);

  const handleAllDayChange = (nextAllDay: boolean) => {
    setAllDay(nextAllDay);
    if (nextAllDay) {
      setStart((prev) => toDateOnly(prev));
      setEnd((prev) => toDateOnly(prev));
    } else {
      setStart((prev) => toDateTime(prev, "09:00"));
      setEnd((prev) => toDateTime(prev, "10:00"));
    }
  };

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    // Optimistic Update
    const newEvent: CalendarEvent = {
        id: Math.random().toString(36).substr(2, 9), // Temp ID
        title: title || "Untitled Event",
        description: description || undefined,
        start: new Date(start).toISOString(),
        end: new Date(end).toISOString(),
        allDay: allDay,
        location: location || undefined,
        organizer: organizer || undefined,
        attendees: attendees ? attendees.split(",").map(s => s.trim()).filter(Boolean) : [],
        status: status,
        privacy: privacy,
        recurrence: recurrence,
        reminders: reminders,
        color: color,
        userId: "me", // Placeholder
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };
    onOptimisticAdd?.(newEvent);
    onClose(); // Close immediately for snappy feel

    try {
      const formData = new FormData();
      formData.append('title', title || "Untitled Event");
      if (description) formData.append('description', description);
      formData.append('start', new Date(start).toISOString());
      formData.append('end', new Date(end).toISOString());
      formData.append('allDay', String(allDay));
      if (location) formData.append('location', location);
      if (organizer) formData.append('organizer', organizer);
      if (attendees) formData.append('attendees', JSON.stringify(attendees.split(",").map((s) => s.trim()).filter(Boolean)));
      if (status) formData.append('status', status);
      if (privacy) formData.append('privacy', privacy);
      if (recurrence) formData.append('recurrence', recurrence);
      formData.append('reminders', JSON.stringify(reminders));
      formData.append('color', color);

      const result = await createEvent(formData);
      if (result && !result.success) {
        console.error(result.error || "Failed to save event");
        return;
      }
      
      await onCreated();
      // onClose called optimistically
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
      aria-labelledby="create-event-title"
    >
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-white/60 dark:bg-black/60 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      <div className="relative w-full md:max-w-3xl bg-background border border-card-border rounded-t-[2.5rem] md:rounded-[2.5rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex-none px-8 py-5 border-b border-card-border flex items-center justify-between bg-white dark:bg-white/[0.03]">
          <div id="create-event-title" className="text-foreground font-black tracking-tight text-lg uppercase italic">Add event</div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl hover:bg-foreground/[0.05] text-text-secondary hover:text-foreground transition-all border border-transparent hover:border-card-border"
            aria-label="Close"
          >
            <FiX className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
            <form id="create-event-form" onSubmit={handleSubmit} className="space-y-8">
            {/* All-day toggle at top */}
            <div className="flex items-center justify-between gap-3 p-4 bg-white dark:bg-white/[0.03] rounded-2xl border border-card-border">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-foreground/[0.06] rounded-lg">
                        <FiCalendar className="text-foreground/60 w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">
                        Temporal Mode
                    </span>
                </div>
                <button
                type="button"
                id="allday"
                onClick={() => handleAllDayChange(!allDay)}
                aria-pressed={allDay}
                className={`relative inline-flex h-10 items-center rounded-xl border p-1 transition-all duration-300 ${
                    allDay ? "bg-foreground/[0.08] border-foreground/20" : "bg-background border-card-border"
                }`}
                >
                <span
                    className={`inline-flex items-center px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all duration-300 ${
                    allDay ? "bg-foreground/[0.12] text-foreground" : "bg-transparent text-text-muted"
                    }`}
                >
                    Full Duration
                </span>
                <span
                    className={`inline-flex items-center px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all duration-300 ${
                    !allDay ? "bg-background text-foreground shadow-sm border border-card-border" : "bg-transparent text-text-muted"
                    }`}
                >
                    Precision
                </span>
                </button>
            </div>

            {/* Primary fields */}
            <div className="space-y-6">
                <div>
                <label className="block text-[10px] font-black text-text-muted uppercase tracking-[0.2em] mb-2 ml-1">Task name</label>
                <input
                    value={title}
                    onChange={(e)=>setTitle(e.target.value)}
                    className="w-full bg-white dark:bg-white/[0.03] border border-card-border rounded-2xl px-5 py-3 text-sm text-foreground placeholder:text-text-muted/50 focus:outline-none focus:border-blue-500/30 transition-all font-bold"
                    placeholder="Operational designation..."
                    required
                />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-[10px] font-black text-text-muted uppercase tracking-[0.2em] mb-2 ml-1 flex items-center gap-1.5">
                    <FiClock className="text-blue-500" /> Commencement
                    </label>
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
                <div>
                    <label className="block text-[10px] font-black text-text-muted uppercase tracking-[0.2em] mb-2 ml-1 flex items-center gap-1.5">
                    <FiClock className="text-blue-500" /> Termination
                    </label>
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

                <div>
                <label className="block text-[10px] font-black text-text-muted uppercase tracking-[0.2em] mb-2 ml-1 flex items-center gap-1.5">
                    <FiMapPin className="text-blue-500" /> Office location
                </label>
                <input
                    value={location}
                    onChange={(e)=>setLocation(e.target.value)}
                    className="w-full bg-white dark:bg-white/[0.03] border border-card-border rounded-2xl px-5 py-3 text-sm text-foreground placeholder:text-text-muted/50 focus:outline-none focus:border-blue-500/30 transition-all font-bold"
                    placeholder="Physical or virtual deployment zone"
                />
                </div>
            </div>

            {/* Advanced options */}
            <div className="space-y-6 pt-4">
                <div className="flex items-center gap-4">
                    <span className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] whitespace-nowrap">Additional details</span>
                    <div className="h-px w-full bg-foreground/[0.05]" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                    <label className="block text-[10px] font-black text-text-muted uppercase tracking-[0.2em] mb-2 ml-1">Assigned to</label>
                    <input
                        value={organizer}
                        onChange={(e)=>setOrganizer(e.target.value)}
                        className="w-full bg-white dark:bg-white/[0.03] border border-card-border rounded-2xl px-5 py-3 text-sm text-foreground placeholder:text-text-muted/50 focus:outline-none focus:border-blue-500/30 transition-all font-bold"
                        placeholder="Command authority"
                    />
                    </div>

                    <div className="md:col-span-2">
                    <label className="block text-[10px] font-black text-text-muted uppercase tracking-[0.2em] mb-2 ml-1">Assigned Personnel</label>
                    <input
                        value={attendees}
                        onChange={(e)=>setAttendees(e.target.value)}
                        className="w-full bg-white dark:bg-white/[0.03] border border-card-border rounded-2xl px-5 py-3 text-sm text-foreground placeholder:text-text-muted/50 focus:outline-none focus:border-blue-500/30 transition-all font-bold"
                        placeholder="Authorized identifiers (comma separated)"
                    />
                    </div>

                    <div>
                    <label className="block text-[10px] font-black text-text-muted uppercase tracking-[0.2em] mb-2 ml-1">Status</label>
                    <div className="flex flex-wrap gap-2">
                        {([
                        { v: "tentative", label: "Tentative" },
                        { v: "confirmed", label: "Confirmed" },
                        { v: "cancelled", label: "Aborted" },
                        ] as const).map((opt) => (
                        <button
                            type="button"
                            key={opt.v}
                            onClick={() => setStatus(opt.v)}
                            className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl border transition-all duration-300 ${
                            status === opt.v
                                ? "border-blue-500/60 bg-blue-500/10 text-blue-600 dark:text-blue-400"
                                : "border-card-border bg-foreground/[0.03] text-text-muted hover:border-foreground/10 hover:text-foreground"
                            }`}
                        >
                            {opt.label}
                        </button>
                        ))}
                    </div>
                    </div>

                    <div>
                    <label className="block text-[10px] font-black text-text-muted uppercase tracking-[0.2em] mb-2 ml-1">Security Classification</label>
                    <div className="flex flex-wrap gap-2">
                        {([
                        { v: "public", label: "Public", color: "border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10" },
                        { v: "private", label: "Private", color: "border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/10" },
                        { v: "confidential", label: "Restricted", color: "border-rose-500/30 text-rose-600 dark:text-rose-400 bg-rose-500/10" },
                        ] as const).map((opt) => (
                        <button
                            type="button"
                            key={opt.v}
                            onClick={() => setPrivacy(opt.v)}
                            className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl border transition-all duration-300 ${
                            privacy === opt.v
                                ? `${opt.color}`
                                : "border-card-border bg-foreground/[0.03] text-text-muted hover:border-foreground/10 hover:text-foreground"
                            }`}
                        >
                            {opt.label}
                        </button>
                        ))}
                    </div>
                    </div>

                    <div className="md:col-span-2">
                    <label className="block text-[10px] font-black text-text-muted uppercase tracking-[0.2em] mb-2 ml-1">Repeat</label>
                    <div className="flex flex-wrap gap-2">
                        {([
                        { v: "none", label: "Static" },
                        { v: "daily", label: "Daily" },
                        { v: "weekly", label: "Weekly" },
                        { v: "monthly", label: "Monthly" },
                        { v: "yearly", label: "Annual" },
                        ] as const).map((opt) => (
                        <button
                            type="button"
                            key={opt.v}
                            onClick={() => setRecurrence(opt.v)}
                            className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl border transition-all duration-300 ${
                            recurrence === opt.v
                                ? "border-blue-500/60 bg-blue-500/10 text-blue-600 dark:text-blue-400"
                                : "border-card-border bg-foreground/[0.03] text-text-muted hover:border-foreground/10 hover:text-foreground"
                            }`}
                        >
                            {opt.label}
                        </button>
                        ))}
                    </div>
                    </div>

                    <div className="md:col-span-2">
                    <label className="block text-[10px] font-black text-text-muted uppercase tracking-[0.2em] mb-2 ml-1">Chromatic Designation</label>
                    <div className="flex flex-wrap gap-3 p-4 bg-white dark:bg-white/[0.03] rounded-2xl border border-card-border">
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

                    <div className="md:col-span-2">
                    <label className="block text-[10px] font-black text-text-muted uppercase tracking-[0.2em] mb-2 ml-1">Summary</label>
                    <textarea
                        value={description}
                        onChange={(e)=>setDescription(e.target.value)}
                        className="w-full min-h-32 bg-white dark:bg-white/[0.03] border border-card-border rounded-2xl px-5 py-3 text-sm text-foreground placeholder:text-text-muted/50 focus:outline-none focus:border-blue-500/30 transition-all font-bold resize-none custom-scrollbar"
                        placeholder="What is this event about?"
                    />
                    </div>

                    <div className="md:col-span-2">
                    <label className="block text-[10px] font-black text-text-muted uppercase tracking-[0.2em] mb-3 ml-1 flex items-center gap-1.5">
                        <FiBell className="text-blue-500" /> Proactive Notifications
                    </label>
                    <div className="flex flex-wrap gap-2 mb-4">
                        {reminders.map((r, idx) => (
                        <span key={idx} className="inline-flex items-center gap-2 px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-full border border-card-border bg-foreground/[0.06] text-text-secondary shadow-sm">
                             {r.days > 0 && `${r.days}D `}
                             {r.hours > 0 && `${r.hours}H `}
                             {r.minutes > 0 && `${r.minutes}M `}
                             Lead Time
                            <button type="button" onClick={() => setReminders((prev) => prev.filter((_, i) => i !== idx))} className="ml-1 p-0.5 hover:bg-foreground/[0.12] rounded-full transition-all">
                            <FiX className="h-3 w-3" />
                            </button>
                        </span>
                        ))}
                        {reminders.length === 0 && <p className="text-[10px] font-black text-text-muted/30 uppercase tracking-widest italic ml-1">No alerts configured</p>}
                    </div>
                    
                    <div className="flex flex-wrap items-end gap-3 p-5 bg-white dark:bg-white/[0.03] border border-card-border rounded-2xl">
                        <div className="flex-1 min-w-[70px]">
                            <label className="block text-[9px] uppercase font-black tracking-[0.2em] text-text-muted mb-2 ml-1">Days</label>
                            <CustomNumberInput
                                value={rDays}
                                onChange={(val) => setRDays(Number(val) || 0)}
                                min={0}
                            />
                        </div>
                        <div className="flex-1 min-w-[70px]">
                            <label className="block text-[9px] uppercase font-black tracking-[0.2em] text-text-muted mb-2 ml-1">Hours</label>
                            <CustomNumberInput
                                value={rHours}
                                onChange={(val) => setRHours(Number(val) || 0)}
                                min={0}
                                max={23}
                            />
                        </div>
                        <div className="flex-1 min-w-[70px]">
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
                        <FiPlus className="h-4 w-4" /> Add Protocol
                        </button>
                    </div>
                    </div>
                </div>
                </div>
            </form>
        </div>

        {/* Fixed Footer */}
        <div className="flex-none flex items-center justify-end gap-3 p-6 border-t border-card-border bg-white dark:bg-white/[0.03]">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest text-text-secondary hover:text-foreground bg-white dark:bg-white/[0.03] hover:bg-foreground/[0.06] border border-card-border transition-all"
              >
                Abort
              </button>
            
              <button
                type="submit"
                form="create-event-form"
                disabled={submitting}
                className="px-8 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest text-text-muted hover:text-foreground bg-foreground/[0.03] hover:bg-foreground/[0.06] transition-all border border-card-border disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {submitting ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-foreground/60"></div> : <FiCheck className="h-4 w-4" />}
                Confirm Entry
              </button>
        </div>
      </div>
    </div>
  );
}
