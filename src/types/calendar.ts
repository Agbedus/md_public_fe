import type { User } from "./user";

export type CalendarView = "month" | "week" | "day" | "gantt";

export type EventStatus = "tentative" | "confirmed" | "cancelled";
export type EventPrivacy = "public" | "private" | "confidential";
export type EventRecurrence =
  | "none"
  | "daily"
  | "weekly"
  | "monthly"
  | "yearly";

export interface EventReminder {
  days: number;
  hours: number;
  minutes: number;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  // Accept either ISO string (from server) or Date (runtime)
  start: string | Date;
  end: string | Date;
  allDay: boolean | number; // API: all_day (0 or 1)
  location?: string;
  organizer?: string;
  attendees?: string[]; // emails
  status?: EventStatus;
  privacy?: EventPrivacy;
  recurrence?: EventRecurrence;
  reminders?: EventReminder[];
  color?: string; // HEX color string, e.g. '#6366f1'
  userId?: string;
  user?: User;
  createdAt?: string;
  updatedAt?: string;
  isProject?: boolean;
  projectStatus?: string;
  projectPriority?: string;
  projectClient?: string;
  projectKey?: string;
  projectBudget?: number;
  
  isTask?: boolean;
  taskStatus?: "task" | "in_progress" | "completed";
  taskPriority?: string;
  taskAssignees?: User[];
  
  isTimeOff?: boolean;
  timeOffStatus?: string;
  timeOffType?: string;
  timeOffJustification?: string;
}
