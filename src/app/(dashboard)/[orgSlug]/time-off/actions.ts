'use server';

import { auth } from '@/auth';
import { getSessionHeaders, handleUnauthorizedResponse, handleForbiddenResponse } from '@/lib/server-auth';
import { revalidatePath } from 'next/cache';
import { safeRevalidate } from '@/lib/safe-revalidate';
import type { TimeOffRequest } from '@/types/time-off';
import type { ActionResult } from '@/types/api';

const BASE_URL = process.env.BASE_URL_LOCAL || process.env.BASE_URL_PRODUCTION || "http://127.0.0.1:8000";
const API_BASE_URL = `${BASE_URL}/api/v1`;

export async function getTimeOffRequests(): Promise<TimeOffRequest[]> {
    const session = await auth();
    if (!session?.user?.accessToken) return [];

    try {
        const response = await fetch(`${API_BASE_URL}/time-off`, {
            method: 'GET',
            headers: { ...(await getSessionHeaders())! },
            next: { tags: ['time-off'], revalidate: 60 }
        });

        if (!response.ok) {
            if (await handleUnauthorizedResponse(response)) return [];
            console.error("getTimeOffRequests: API error", response.status, await response.text());
            return [];
        }

        return await response.json();
    } catch (error) {
        console.error("Error fetching time-off requests:", error);
        return [];
    }
}

export async function createTimeOffRequest(formData: FormData): Promise<ActionResult> {
    const session = await auth();
    if (!session?.user?.accessToken) return { success: false, error: "Unauthorized" };

    const payload: Record<string, unknown> = {
        type: formData.get('type') || 'leave',
        start_date: formData.get('start_date'),
        end_date: formData.get('end_date'),
        justification: formData.get('justification') || null,
    };

    try {
        const response = await fetch(`${API_BASE_URL}/time-off`, {
            method: 'POST',
            headers: { ...(await getSessionHeaders())! },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            if (await handleUnauthorizedResponse(response)) return { success: false, error: "Session expired" };
            const forbiddenMsg = await handleForbiddenResponse(response);
            if (forbiddenMsg) return { success: false, error: forbiddenMsg };
            const errorText = await response.text();
            console.error("createTimeOffRequest: API error", response.status, errorText);
            return { success: false, error: `API Error ${response.status}: ${errorText}` };
        }

        safeRevalidate(() => {
            revalidatePath('/[orgSlug]/calendar', 'page');
        }, 'time-off mutation');
        return { success: true };
    } catch (error) {
        console.error("Error creating time-off request:", error);
        return { success: false, error: "Network error creating time-off request" };
    }
}

export async function approveTimeOffRequest(requestId: number): Promise<ActionResult> {
    const session = await auth();
    if (!session?.user?.accessToken) return { success: false, error: "Unauthorized" };

    try {
        const response = await fetch(`${API_BASE_URL}/time-off/${requestId}/approve`, {
            method: 'POST',
            headers: { ...(await getSessionHeaders())! },
        });

        if (!response.ok) {
            if (await handleUnauthorizedResponse(response)) return { success: false, error: "Session expired" };
            const forbiddenMsg = await handleForbiddenResponse(response);
            if (forbiddenMsg) return { success: false, error: forbiddenMsg };
            const errorText = await response.text();
            console.error("approveTimeOffRequest: API error", response.status, errorText);
            return { success: false, error: `API Error ${response.status}: ${errorText}` };
        }

        safeRevalidate(() => {
            revalidatePath('/[orgSlug]/calendar', 'page');
        }, 'time-off mutation');
        return { success: true };
    } catch (error) {
        console.error("Error approving time-off request:", error);
        return { success: false, error: "Network error" };
    }
}

export async function rejectTimeOffRequest(requestId: number): Promise<ActionResult> {
    const session = await auth();
    if (!session?.user?.accessToken) return { success: false, error: "Unauthorized" };

    try {
        const response = await fetch(`${API_BASE_URL}/time-off/${requestId}/reject`, {
            method: 'POST',
            headers: { ...(await getSessionHeaders())! },
        });

        if (!response.ok) {
            if (await handleUnauthorizedResponse(response)) return { success: false, error: "Session expired" };
            const forbiddenMsg = await handleForbiddenResponse(response);
            if (forbiddenMsg) return { success: false, error: forbiddenMsg };
            const errorText = await response.text();
            console.error("rejectTimeOffRequest: API error", response.status, errorText);
            return { success: false, error: `API Error ${response.status}: ${errorText}` };
        }

        safeRevalidate(() => {
            revalidatePath('/[orgSlug]/calendar', 'page');
        }, 'time-off mutation');
        return { success: true };
    } catch (error) {
        console.error("Error rejecting time-off request:", error);
        return { success: false, error: "Network error" };
    }
}

export async function deleteTimeOffRequest(requestId: number): Promise<ActionResult> {
    const session = await auth();
    if (!session?.user?.accessToken) return { success: false, error: "Unauthorized" };

    try {
        const response = await fetch(`${API_BASE_URL}/time-off/${requestId}`, {
            method: 'DELETE',
            headers: { ...(await getSessionHeaders())! },
        });

        if (!response.ok) {
            if (await handleUnauthorizedResponse(response)) return { success: false, error: "Session expired" };
            const forbiddenMsg = await handleForbiddenResponse(response);
            if (forbiddenMsg) return { success: false, error: forbiddenMsg };
            console.error("deleteTimeOffRequest: API error", response.status, await response.text());
            return { success: false, error: `API Error ${response.status}` };
        }

        safeRevalidate(() => {
            revalidatePath('/[orgSlug]/calendar', 'page');
        }, 'time-off mutation');
        return { success: true };
    } catch (error) {
        console.error("Error deleting time-off request:", error);
        return { success: false, error: "Network error" };
    }
}
