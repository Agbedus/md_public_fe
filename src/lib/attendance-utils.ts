/**
 * Attendance & Geofencing Utilities
 * Handles policy-driven time window and radius calculations.
 */

import type { AttendancePolicy } from '@/types/attendance';

/**
 * Parses a HH:MM:SS string from the backend into a Date object for the current day.
 */
export function parsePolicyTime(timeStr: string | null): Date | null {
    if (!timeStr) return null;
    const [hours, minutes, seconds] = timeStr.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, seconds || 0, 0);
    return date;
}

/**
 * Checks if the current time is within an inclusive window.
 * Supports overnight windows (e.g., 22:00 to 02:00).
 */
export function isTimeInWindow(now: Date, startStr: string | null, endStr: string | null): boolean {
    if (!startStr || !endStr) return true;

    const start = parsePolicyTime(startStr);
    const end = parsePolicyTime(endStr);
    if (!start || !end) return true;

    // Normal window (e.g., 08:00 to 18:00)
    if (start <= end) {
        return now >= start && now <= end;
    }

    // Overnight window (e.g., 22:00 to 02:00)
    return now >= start || now <= end;
}

/**
 * Checks if the current time is past a specific threshold.
 */
export function isAfterTime(now: Date, timeStr: string | null): boolean {
    if (!timeStr) return false;
    const limit = parsePolicyTime(timeStr);
    if (!limit) return false;
    return now > limit;
}

/**
 * Checks if the current time is before a specific threshold.
 */
export function isBeforeTime(now: Date, timeStr: string | null): boolean {
    if (!timeStr) return false;
    const limit = parsePolicyTime(timeStr);
    if (!limit) return false;
    return now < limit;
}

/**
 * Validates if the user's distance is within the allowed radius.
 */
export function isWithinRadius(distance: number, radius: number): boolean {
    return distance <= radius;
}

/**
 * Mirrors the backend's automatic clock-in eligibility rules. The explicit
 * check-in window takes precedence, with the work window as a fallback for
 * older policies.
 */
export function isAutoClockInWindowOpen(now: Date, policy: AttendancePolicy): boolean {
    if (!policy.auto_clock_in) return false;

    const hasCheckInWindow = Boolean(
        policy.check_in_open_time && policy.check_in_close_time,
    );
    const isWithinConfiguredWindow = hasCheckInWindow
        ? isTimeInWindow(now, policy.check_in_open_time, policy.check_in_close_time)
        : isTimeInWindow(now, policy.work_start_time, policy.work_end_time);

    if (!isWithinConfiguredWindow) return false;
    if (policy.auto_clock_out_time && isAfterTime(now, policy.auto_clock_out_time)) {
        return false;
    }

    return true;
}
