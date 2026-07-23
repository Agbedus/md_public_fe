'use server';

import { auth } from '@/auth';
import { getSessionHeaders, handleUnauthorizedResponse, handleForbiddenResponse } from '@/lib/server-auth';
import { revalidatePath, revalidateTag } from 'next/cache';
import { cache } from 'react';
import type { CalendarEvent } from '@/types/calendar';
import type { ActionResult } from '@/types/api';

const BASE_URL = process.env.BASE_URL_LOCAL || process.env.BASE_URL_PRODUCTION || "http://127.0.0.1:8000";
const API_BASE_URL = `${BASE_URL}/api/v1`;

interface ApiEvent {
    id: number;
    title: string;
    description: string | null;
    start: string;
    end: string;
    all_day: number;
    location: string | null;
    organizer: string | null;
    attendees: string[] | string | null;
    status: "tentative" | "confirmed" | "cancelled" | null;
    privacy: "public" | "private" | "confidential" | null;
    recurrence: "none" | "daily" | "weekly" | "monthly" | "yearly" | null;
    reminders: any[] | string | null;
    color: string | null;
    user_id: string;
    created_at: string;
    updated_at: string;
}

function mapApiEvent(p: ApiEvent): CalendarEvent {
    let parsedAttendees: string[] = [];
    if (Array.isArray(p.attendees)) {
        parsedAttendees = p.attendees;
    } else if (typeof p.attendees === 'string') {
        try {
            parsedAttendees = JSON.parse(p.attendees);
        } catch {
            parsedAttendees = p.attendees.split(',').map(s => s.trim()).filter(Boolean);
        }
    }

    let parsedReminders: any[] = [];
    if (Array.isArray(p.reminders)) {
        parsedReminders = p.reminders;
    } else if (typeof p.reminders === 'string') {
        try {
            parsedReminders = JSON.parse(p.reminders);
        } catch {
            parsedReminders = [];
        }
    }

    return {
        id: String(p.id),
        title: p.title,
        description: p.description ?? undefined,
        start: p.start,
        end: p.end,
        allDay: p.all_day === 1,
        location: p.location ?? undefined,
        organizer: p.organizer ?? undefined,
        attendees: parsedAttendees,
        status: (p.status as any) ?? undefined,
        privacy: (p.privacy as any) ?? undefined,
        recurrence: (p.recurrence as any) ?? undefined,
        reminders: parsedReminders,
        color: p.color ?? undefined,
        userId: p.user_id,
        createdAt: p.created_at,
        updatedAt: p.updated_at,
    };
}

export const getEvents = cache(async function(): Promise<CalendarEvent[]> {
  const session = await auth();
  if (!session?.user?.accessToken) return [];

  try {
    const response = await fetch(`${API_BASE_URL}/events`, {
        method: 'GET',
        headers: { ...(await getSessionHeaders())! },
        next: { tags: ['events'], revalidate: 60 }
    });

    if (!response.ok) {
        const errorText = await response.text();
        if (await handleUnauthorizedResponse(response)) return [];
        console.error("getEvents: API error", response.status, errorText);
        return [];
    }

    const events: ApiEvent[] = await response.json();
    return events.map(mapApiEvent);
  } catch (error) {
    console.error("Error fetching events:", error);
    return [];
  }
});

export async function createEvent(formData: FormData): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.accessToken) return { success: false, error: "Unauthorized" };

  const payload: Record<string, any> = {
    title: formData.get('title') || "Untitled Event",
    description: formData.get('description') || null,
    start: formData.get('start'),
    end: formData.get('end'),
    all_day: formData.get('allDay') === 'true' ? 1 : 0,
    location: formData.get('location') || null,
    organizer: formData.get('organizer') || null,
    status: formData.get('status') || "tentative",
    privacy: formData.get('privacy') || "public",
    recurrence: formData.get('recurrence') || "none",
    color: formData.get('color') || "#6366f1",
  };

  const attendeesRaw = formData.get('attendees');
  if (attendeesRaw) {
    try {
        const parsed = JSON.parse(attendeesRaw as string);
        payload.attendees = parsed;
    } catch {
        payload.attendees = (attendeesRaw as string).split(',').map(s => s.trim()).filter(Boolean);
    }
  } else {
    payload.attendees = [];
  }

  const remindersRaw = formData.get('reminders');
  if (remindersRaw) {
    try {
        const parsed = JSON.parse(remindersRaw as string);
        payload.reminders = parsed;
    } catch {
        payload.reminders = [];
    }
  } else {
    payload.reminders = [];
  }

  try {
    const response = await fetch(`${API_BASE_URL}/events`, {
        method: 'POST',
        headers: { ...(await getSessionHeaders())! },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        if (await handleUnauthorizedResponse(response)) return { success: false, error: "Session expired" };
        const forbiddenMsg = await handleForbiddenResponse(response);
        if (forbiddenMsg) return { success: false, error: forbiddenMsg };
        const errorText = await response.text();
        console.error("createEvent: API error", response.status, errorText);
        return { success: false, error: `API Error ${response.status}: ${errorText}` };
    }

    revalidatePath('/calendar');
    revalidateTag('events', 'max');
    return { success: true };
  } catch (error) {
    console.error("Error creating event:", error);
    return { success: false, error: "Network error creating event" };
  }
}

export async function updateEvent(formData: FormData): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.accessToken) return { success: false, error: "Unauthorized" };

  const id = formData.get('id');
  if (!id) return { success: false, error: "Missing event ID" };

  const payload: Record<string, unknown> = {};
  const fields = ['title', 'description', 'start', 'end', 'location', 'organizer', 'status', 'privacy', 'recurrence', 'color'];
  fields.forEach(field => {
    if (formData.has(field)) {
      const val = formData.get(field);
      if (['description', 'location', 'organizer'].includes(field)) {
         payload[field] = val ? val : null;
      } else {
         if (val) payload[field] = val;
      }
    }
  });
  
  if (formData.has('allDay')) payload.all_day = formData.get('allDay') === 'true' ? 1 : 0;

  if (formData.has('attendees')) {
    const attendeesRaw = formData.get('attendees') as string;
    try {
        const parsed = JSON.parse(attendeesRaw);
        payload.attendees = parsed;
    } catch {
        payload.attendees = attendeesRaw.split(',').map(s => s.trim()).filter(Boolean);
    }
  }

  if (formData.has('reminders')) {
    const remindersRaw = formData.get('reminders') as string;
    try {
        const parsed = JSON.parse(remindersRaw);
        payload.reminders = parsed;
    } catch {
        payload.reminders = [];
    }
  }

  try {
    const response = await fetch(`${API_BASE_URL}/events/${id}`, {
        method: 'PATCH',
        headers: { ...(await getSessionHeaders())! },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        if (await handleUnauthorizedResponse(response)) return { success: false, error: "Session expired" };
        const forbiddenMsg = await handleForbiddenResponse(response);
        if (forbiddenMsg) return { success: false, error: forbiddenMsg };
        const errorText = await response.text();
        console.error("updateEvent: API error", response.status, errorText);
        return { success: false, error: `API Error ${response.status}: ${errorText}` };
    }

    revalidatePath('/calendar');
    revalidateTag('events', 'max');
    return { success: true };
  } catch (error) {
    console.error("Error updating event:", error);
    return { success: false, error: "Network error updating event" };
  }
}

export async function deleteEvent(id: string | number): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.accessToken) return { success: false, error: "Unauthorized" };

  try {
    const response = await fetch(`${API_BASE_URL}/events/${id}`, {
        method: 'DELETE',
        headers: { ...(await getSessionHeaders())! },
    });

    if (!response.ok) {
        if (await handleUnauthorizedResponse(response)) return { success: false, error: "Session expired" };
        const forbiddenMsg = await handleForbiddenResponse(response);
        if (forbiddenMsg) return { success: false, error: forbiddenMsg };
        console.error("deleteEvent: API error", response.status, await response.text());
        return { success: false, error: `API Error ${response.status}` };
    }

    revalidatePath('/calendar');
    revalidateTag('events', 'max');
    return { success: true };
  } catch (error) {
    console.error("Error deleting event:", error);
    return { success: false, error: "Network error deleting event" };
  }
}

export const getCalendarData = cache(async function() {
    const [events, tasks, projects, timeOff, users] = await Promise.all([
        getEvents(),
        import('@/app/(dashboard)/[orgSlug]/tasks/actions').then(m => m.getTasks(undefined, undefined, undefined, undefined, 1000)),
        import('@/app/(dashboard)/[orgSlug]/projects/actions').then(m => m.getProjects(1000)),
        import('@/app/(dashboard)/[orgSlug]/time-off/actions').then(m => m.getTimeOffRequests()),
        import('@/app/(dashboard)/[orgSlug]/users/actions').then(m => m.getUsersSafe())
    ]);

    return {
        events,
        tasks,
        projects,
        timeOff,
        users
    };
});
