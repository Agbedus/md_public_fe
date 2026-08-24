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

export async function createTimeOffRequest(formData: FormData): Promise<ActionResult<TimeOffRequest | null>> {
    const session = await auth();
    if (!session?.user?.accessToken) return { success: false, error: "Unauthorized" };

    const payload: Record<string, unknown> = {
        type: formData.get('type') || 'leave',
        start_date: formData.get('start_date'),
        end_date: formData.get('end_date'),
        justification: formData.get('justification') || null,
    };
    const attachment = formData.get('attachment');
    const hasAttachment = attachment instanceof File && attachment.size > 0;

    if (hasAttachment) {
        if (attachment.type !== 'application/pdf' || !attachment.name.toLowerCase().endsWith('.pdf')) {
            return { success: false, error: 'Only PDF attachments are accepted.' };
        }
        if (attachment.size > 2 * 1024 * 1024) {
            return { success: false, error: 'The PDF must not exceed 2 MB.' };
        }
    }

    try {
        const sessionHeaders = { ...(await getSessionHeaders())! };
        let endpoint = `${API_BASE_URL}/time-off`;
        let body: BodyInit;

        if (hasAttachment) {
            delete sessionHeaders['Content-Type'];
            const multipart = new FormData();
            multipart.set('type', String(payload.type));
            multipart.set('start_date', String(payload.start_date));
            multipart.set('end_date', String(payload.end_date));
            if (payload.justification) multipart.set('justification', String(payload.justification));
            multipart.set('attachment', attachment);
            endpoint = `${API_BASE_URL}/time-off/with-attachment`;
            body = multipart;
        } else {
            body = JSON.stringify(payload);
        }

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: sessionHeaders,
            body,
        });

        if (!response.ok) {
            if (await handleUnauthorizedResponse(response)) return { success: false, error: "Session expired" };
            const forbiddenMsg = await handleForbiddenResponse(response);
            if (forbiddenMsg) return { success: false, error: forbiddenMsg };
            const errorText = await response.text();
            console.error("createTimeOffRequest: API error", response.status, errorText);
            try {
                const parsed = JSON.parse(errorText) as { detail?: string };
                return { success: false, error: parsed.detail || 'Could not submit the time-off request.' };
            } catch {
                return { success: false, error: 'Could not submit the time-off request.' };
            }
        }

        const createdRequest = await response.json().catch(() => null) as TimeOffRequest | null;
        safeRevalidate(() => {
            revalidatePath('/[orgSlug]/calendar', 'page');
        }, 'time-off mutation');
        return { success: true, data: createdRequest };
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
