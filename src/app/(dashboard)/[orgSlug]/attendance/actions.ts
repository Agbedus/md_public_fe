'use server';

import { auth } from '@/auth';
import { revalidatePath, revalidateTag } from 'next/cache';
import type { AttendanceRecord, OfficeLocation, AttendancePolicy } from '@/types/attendance';
import { getDistanceInMeters } from '@/lib/distance-utils';
import { isTimeInWindow, isAfterTime, isWithinRadius } from '@/lib/attendance-utils';

import { getSessionHeaders, handleUnauthorizedResponse, handleForbiddenResponse } from '@/lib/server-auth';

const BASE_URL = process.env.BASE_URL_LOCAL || process.env.BASE_URL_PRODUCTION || "http://127.0.0.1:8000";
const API_BASE_URL = `${BASE_URL}/api/v1`;

// ── Helpers ─────────────────────────────────────────────────────────

async function getAuthHeaders() {
    return getSessionHeaders();
}

/**
 * Deduplicates attendance records by user_id and work_date.
 * Prioritizes: CLOCKED_IN > CLOCKED_OUT > NOT_CLOCKED_IN, then latest ID.
 */
function deduplicateAttendanceRecords(records: AttendanceRecord[]): AttendanceRecord[] {
    const map = new Map<string, AttendanceRecord>();
    
    // Sort ascending for deduplication (latest wins within same day)
    const sorted = [...records].sort((a, b) => {
        const dateA = a.work_date || a.date || '';
        const dateB = b.work_date || b.date || '';
        if (dateA !== dateB) return dateA.localeCompare(dateB);
        
        const statusScore = (s: string) => {
            if (s === 'CLOCKED_IN') return 3;
            if (s === 'CLOCKED_OUT') return 2;
            if (s === 'NOT_CLOCKED_IN') return 1;
            return 0;
        };
        const scoreA = statusScore(a.attendance_state);
        const scoreB = statusScore(b.attendance_state);
        if (scoreA !== scoreB) return scoreA - scoreB;
        
        return (a.id || 0) - (b.id || 0);
    });

    sorted.forEach(record => {
        const key = `${record.user_id}-${record.work_date || record.date}`;
        map.set(key, record);
    });
    
    // Convert to array and sort descending (latest first)
    return Array.from(map.values()).sort((a, b) => {
        const dateA = a.work_date || a.date || '';
        const dateB = b.work_date || b.date || '';
        return dateB.localeCompare(dateA);
    });
}

// ── Staff: My Attendance ────────────────────────────────────────────

export async function getMyAttendanceToday(): Promise<AttendanceRecord | null> {
    const headers = await getAuthHeaders();
    if (!headers) return null;

    try {
        const res = await fetch(`${API_BASE_URL}/attendance/me/today`, {
            method: 'GET',
            headers,
            next: { tags: ['attendance-my'], revalidate: 30 },
        });
        if (!res.ok) {
            if (res.status === 404) return null;
            if (await handleUnauthorizedResponse(res)) return null;
            const errText = await res.text();
            if (res.status === 400 && errText.includes('No organization selected')) {
                console.warn("getMyAttendanceToday: No organization selected.");
                return null;
            }
            console.error("getMyAttendanceToday:", res.status, errText);
            return null;
        }
        
        const data = await res.json();
        if (Array.isArray(data)) {
             return deduplicateAttendanceRecords(data)[0] || null;
        }
        return data;
    } catch (error) {
        console.error("Error fetching my attendance today:", error);
        return null;
    }
}

export async function getMyAttendanceHistory(): Promise<AttendanceRecord[]> {
    const headers = await getAuthHeaders();
    if (!headers) return [];

    try {
        const res = await fetch(`${API_BASE_URL}/attendance/me/history`, {
            method: 'GET',
            headers,
            next: { tags: ['attendance-history'], revalidate: 60 },
        });
        if (!res.ok) {
            if (await handleUnauthorizedResponse(res)) return [];
            console.error("getMyAttendanceHistory:", res.status, await res.text());
            return [];
        }
        const data = await res.json();
        return deduplicateAttendanceRecords(data);
    } catch (error) {
        console.error("Error fetching my attendance history:", error);
        return [];
    }
}

// ── Staff: Location Update ──────────────────────────────────────────

export async function updateLocation(
    latitude: number,
    longitude: number,
    accuracy: number,
    officeLocationId?: number,
    isManual: boolean = false,
) {
    const headers = await getAuthHeaders();
    if (!headers) return { success: false, error: "Unauthorized" };

    try {
        // If no office location ID provided, try to get the first one
        let resolvedOfficeId = officeLocationId;
        if (!resolvedOfficeId) {
            const locations = await getOfficeLocations();
            if (locations.length > 0) {
                resolvedOfficeId = locations[0].id;
            } else {
                return { success: false, error: "No office location configured. Ask your admin to create one." };
            }
        }

        // ── Backend Enforcement (Manual Logic Sync) ──
        if (isManual && resolvedOfficeId) {
            const policy = await getAttendancePolicy(resolvedOfficeId);
            const offices = await getOfficeLocations();
            const office = offices.find(o => o.id === resolvedOfficeId);

            if (policy && office) {
                const now = new Date();
                
                // 1. Radius Check
                const dist = getDistanceInMeters(latitude, longitude, office.latitude, office.longitude);
                if (!isWithinRadius(dist, office.in_office_radius_meters)) {
                    return { success: false, error: "Validation Error: Outside office geofence." };
                }

                // 2. Arrival Window Check
                if (!isTimeInWindow(now, policy.check_in_open_time, policy.check_in_close_time)) {
                    return { success: false, error: "Validation Error: Outside check-in window." };
                }

                // 3. Auto-Out Check
                if (isAfterTime(now, policy.auto_clock_out_time)) {
                    return { success: false, error: "Validation Error: After auto-clock-out threshold." };
                }
            }
        }

        const res = await fetch(`${API_BASE_URL}/attendance/location-update`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                latitude,
                longitude,
                accuracy_meters: accuracy,
                office_location_id: resolvedOfficeId,
                recorded_at: new Date().toISOString(),
                is_manual: isManual,
            }),
        });

        if (!res.ok) {
            if (await handleUnauthorizedResponse(res)) return { success: false, error: "Session expired" };
            const forbiddenMsg = await handleForbiddenResponse(res);
            if (forbiddenMsg) return { success: false, error: forbiddenMsg };
            const errorText = await res.text();
            console.error("updateLocation:", res.status, errorText);
            return { success: false, error: `API Error ${res.status}: ${errorText}` };
        }

        const data = await res.json();
        
        // Transform API response to match AttendanceRecord type if needed
        const record: AttendanceRecord = {
            id: data.id || 0,
            user_id: data.user_id || '',
            work_date: data.work_date || new Date().toISOString().split('T')[0],
            clock_in_at: data.clock_in_at || null,
            clock_out_at: data.clock_out_at || null,
            presence_state: data.presence_state,
            attendance_state: data.attendance_state,
            total_hours: null,
            created_at: null,
            updated_at: null,
        };

        revalidateTag('attendance-my', 'max');
        return { success: true, record };
    } catch (error) {
        console.error("Error updating location:", error);
        return { success: false, error: "Network error" };
    }
}

export async function clockOutManual(force = false) {
    const headers = await getAuthHeaders();
    if (!headers) return { success: false, error: "Unauthorized" };

    try {
        const today = await getMyAttendanceToday();
        if (!today || today.attendance_state !== 'CLOCKED_IN') {
            return { success: false, error: "Not currently clocked in." };
        }

        const res = await fetch(`${API_BASE_URL}/attendance/clock-out`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ force }),
        });

        if (!res.ok) {
            if (await handleUnauthorizedResponse(res)) return { success: false, error: "Session expired" };
            const forbiddenMsg = await handleForbiddenResponse(res);
            if (forbiddenMsg) return { success: false, error: forbiddenMsg };
            const errorText = await res.text();
            let errorMessage = errorText;
            let isConflict = false;

            try {
                const errorData = JSON.parse(errorText);
                errorMessage = errorData.detail || errorText;
                isConflict = res.status === 409;
            } catch (p) { /* ignore parse error */ }

            console.error("clockOutManual:", res.status, errorText);
            return { 
                success: false, 
                conflict: isConflict, 
                error: errorMessage 
            };
        }

        const data = await res.json();
        
        const record: AttendanceRecord = {
            id: data.id || 0,
            user_id: data.user_id || '',
            work_date: data.work_date || new Date().toISOString().split('T')[0],
            clock_in_at: data.clock_in_at || null,
            clock_out_at: data.clock_out_at || null,
            presence_state: data.presence_state,
            attendance_state: data.attendance_state,
            total_hours: null,
            created_at: null,
            updated_at: null,
        };

        revalidateTag('attendance-my', 'max');
        return { success: true, record };
    } catch (error) {
        console.error("Error manual clock out:", error);
        return { success: false, error: "Network error" };
    }
}

// ── Manager: Team Attendance ────────────────────────────────────────

export async function getTeamAttendanceToday(): Promise<AttendanceRecord[]> {
    const headers = await getAuthHeaders();
    if (!headers) return [];

    try {
        const res = await fetch(`${API_BASE_URL}/attendance/team/today`, {
            method: 'GET',
            headers,
            next: { tags: ['attendance-team'], revalidate: 30 },
        });
        if (!res.ok) {
            const errText = await res.text();
            if (await handleUnauthorizedResponse(res)) return [];
            if (res.status === 400 && errText.includes('No organization selected')) {
                console.warn("getTeamAttendanceToday: No organization selected.");
                return [];
            }
            console.error("getTeamAttendanceToday:", res.status, errText);
            return [];
        }
        const data = await res.json();
        return deduplicateAttendanceRecords(data);
    } catch (error) {
        console.error("Error fetching team attendance:", error);
        return [];
    }
}

export async function getTeamAttendanceHistory(): Promise<AttendanceRecord[]> {
    const session = await auth();
    const headers = await getAuthHeaders();
    if (!headers || !session) return [];

    const roles = session.user?.roles || [];
    const isAdmin = roles.some((r: string) => r.toLowerCase() === 'super_admin');

    try {
        // If admin, try the system-wide records endpoint first
        if (isAdmin) {
            const res = await fetch(`${API_BASE_URL}/attendance/admin/all-records`, {
                method: 'GET',
                headers,
                next: { tags: ['attendance-team-history'], revalidate: 60 },
            });

            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data) && data.length > 0) {
                    return deduplicateAttendanceRecords(data);
                }
            }
        }

        // Fallback for Managers or if Admin endpoint is unavailable: 
        // Fetch history for each user individually (limited to first 20 for performance)
        const { getUsersSafe } = await import('@/app/(dashboard)/[orgSlug]/users/actions');
        const users = await getUsersSafe();
        
        const historyPromises = users.slice(0, 20).map((user: any) => 
            getUserAttendanceHistory(String(user.id))
        );
        
        const histories = await Promise.all(historyPromises);
        const combined = histories.flat();
        return deduplicateAttendanceRecords(combined).sort((a, b) => {
            const dateA = new Date(a.work_date || a.date || 0).getTime();
            const dateB = new Date(b.work_date || b.date || 0).getTime();
            return dateB - dateA; // Newest first
        });

    } catch (error) {
        console.error("Error fetching team attendance history:", error);
        return [];
    }
}

export async function getUserAttendanceHistory(userId: string): Promise<AttendanceRecord[]> {
    const headers = await getAuthHeaders();
    if (!headers) return [];

    try {
        const res = await fetch(`${API_BASE_URL}/attendance/${userId}/history`, {
            method: 'GET',
            headers,
            next: { revalidate: 60 },
        });
        if (!res.ok) {
            if (await handleUnauthorizedResponse(res)) return [];
            console.error("getUserAttendanceHistory:", res.status, await res.text());
            return [];
        }
        const data = await res.json();
        return deduplicateAttendanceRecords(data);
    } catch (error) {
        console.error("Error fetching user attendance history:", error);
        return [];
    }
}

// ── Manager: Override ───────────────────────────────────────────────

export async function overrideAttendance(
    recordId: number,
    clockIn: string | null,
    clockOut: string | null,
) {
    const headers = await getAuthHeaders();
    if (!headers) return { success: false, error: "Unauthorized" };

    try {
        const res = await fetch(`${API_BASE_URL}/attendance/${recordId}/override`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                clock_in: clockIn,
                clock_out: clockOut,
            }),
        });

        if (!res.ok) {
            if (await handleUnauthorizedResponse(res)) return { success: false, error: "Session expired" };
            const forbiddenMsg = await handleForbiddenResponse(res);
            if (forbiddenMsg) return { success: false, error: forbiddenMsg };
            const errorText = await res.text();
            console.error("overrideAttendance:", res.status, errorText);
            return { success: false, error: `API Error ${res.status}: ${errorText}` };
        }

        revalidateTag('attendance-team', 'max');
        revalidateTag('attendance-my', 'max');
        revalidatePath('/attendance');
        return { success: true, record: await res.json() };
    } catch (error) {
        console.error("Error overriding attendance:", error);
        return { success: false, error: "Network error" };
    }
}

// ── Admin: Office Locations ─────────────────────────────────────────

export async function getOfficeLocations(): Promise<OfficeLocation[]> {
    const headers = await getAuthHeaders();
    if (!headers) return [];

    try {
        // The API docs don't list a GET all endpoint explicitly,
        // so we'll try the base path; fall back to empty if not supported
        const res = await fetch(`${API_BASE_URL}/attendance/office-locations`, {
            method: 'GET',
            headers,
            next: { tags: ['office-locations'], revalidate: 300 },
        });
        if (!res.ok) {
            await handleUnauthorizedResponse(res);
            return [];
        }
        return await res.json();
    } catch {
        return [];
    }
}

export async function createOfficeLocation(data: {
    name: string;
    latitude: number;
    longitude: number;
    in_office_radius_meters?: number;
    temporarily_out_radius_meters?: number;
    out_of_office_radius_meters?: number;
}) {
    const headers = await getAuthHeaders();
    if (!headers) return { success: false, error: "Unauthorized" };

    try {
        const res = await fetch(`${API_BASE_URL}/attendance/office-locations`, {
            method: 'POST',
            headers,
            body: JSON.stringify(data),
        });

        if (!res.ok) {
            if (await handleUnauthorizedResponse(res)) return { success: false, error: "Session expired" };
            const forbiddenMsg = await handleForbiddenResponse(res);
            if (forbiddenMsg) return { success: false, error: forbiddenMsg };
            const errorText = await res.text();
            return { success: false, error: `API Error ${res.status}: ${errorText}` };
        }

        revalidateTag('office-locations', 'max');
        revalidatePath('/attendance');
        return { success: true, location: await res.json() };
    } catch (error) {
        return { success: false, error: "Network error" };
    }
}

export async function updateOfficeLocation(id: number, data: Partial<OfficeLocation>) {
    const headers = await getAuthHeaders();
    if (!headers) return { success: false, error: "Unauthorized" };

    try {
        const res = await fetch(`${API_BASE_URL}/attendance/office-locations/${id}`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify(data),
        });

        if (!res.ok) {
            if (await handleUnauthorizedResponse(res)) return { success: false, error: "Session expired" };
            const forbiddenMsg = await handleForbiddenResponse(res);
            if (forbiddenMsg) return { success: false, error: forbiddenMsg };
            const errorText = await res.text();
            return { success: false, error: `API Error ${res.status}: ${errorText}` };
        }

        revalidateTag('office-locations', 'max');
        revalidatePath('/attendance');
        return { success: true, location: await res.json() };
    } catch (error) {
        return { success: false, error: "Network error" };
    }
}

// ── Admin: Attendance Policy ────────────────────────────────────────

export async function getAttendancePolicy(officeLocationId: number): Promise<AttendancePolicy | null> {
    const headers = await getAuthHeaders();
    if (!headers) return null;

    try {
        const res = await fetch(`${API_BASE_URL}/attendance-policy/${officeLocationId}`, {
            method: 'GET',
            headers,
            next: { tags: ['attendance-policy'], revalidate: 300 },
        });
        if (!res.ok) {
            await handleUnauthorizedResponse(res);
            return null;
        }
        return await res.json();
    } catch {
        return null;
    }
}

export async function updateAttendancePolicy(
    officeLocationId: number,
    data: Partial<AttendancePolicy>
) {
    const headers = await getAuthHeaders();
    if (!headers) return { success: false, error: "Unauthorized" };

    try {
        const res = await fetch(`${API_BASE_URL}/attendance-policy/${officeLocationId}`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify(data),
        });

        if (!res.ok) {
            if (await handleUnauthorizedResponse(res)) return { success: false, error: "Session expired" };
            const forbiddenMsg = await handleForbiddenResponse(res);
            if (forbiddenMsg) return { success: false, error: forbiddenMsg };
            const errorText = await res.text();
            return { success: false, error: `API Error ${res.status}: ${errorText}` };
        }

        revalidateTag('attendance-policy', 'max');
        revalidatePath('/attendance');
        return { success: true, policy: await res.json() };
    } catch (error) {
        return { success: false, error: "Network error" };
    }
}

// ── Client-side fetch for SWR polling ───────────────────────────────

export async function fetchTeamAttendanceLive(): Promise<AttendanceRecord[]> {
    return getTeamAttendanceToday();
}

export async function fetchMyAttendanceLive(): Promise<AttendanceRecord | null> {
    return getMyAttendanceToday();
}
