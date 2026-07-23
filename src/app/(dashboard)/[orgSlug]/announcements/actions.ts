'use server';

import { auth } from '@/auth';
import { getSessionHeaders, handleUnauthorizedResponse, handleForbiddenResponse } from '@/lib/server-auth';
import { revalidatePath, revalidateTag } from 'next/cache';
import { Announcement, AnnouncementCreate, AnnouncementUpdate } from '@/types/announcement';
import type { ActionResult } from '@/types/api';

const BASE_URL = process.env.BASE_URL_LOCAL || process.env.BASE_URL_PRODUCTION || "http://127.0.0.1:8000";
const API_BASE_URL = `${BASE_URL}/api/v1`;

export async function getAnnouncements() {
    const session = await auth();
    if (!session?.user?.accessToken) return [];

    try {
        const response = await fetch(`${API_BASE_URL}/announcements/`, {
            method: 'GET',
            headers: { ...(await getSessionHeaders())! },
            next: { tags: ['announcements'], revalidate: 60 }
        });

        if (!response.ok) {
            if (await handleUnauthorizedResponse(response)) return [];
            console.error("Failed to fetch announcements:", await response.text());
            return [];
        }

        return await response.json() as Announcement[];
    } catch (error) {
        console.error("Error fetching announcements:", error);
        return [];
    }
}

export async function createAnnouncement(data: AnnouncementCreate): Promise<ActionResult<Announcement>> {
    const session = await auth();
    if (!session?.user?.accessToken) return { success: false, error: "Unauthorized" };

    try {
        const response = await fetch(`${API_BASE_URL}/announcements/`, {
            method: 'POST',
            headers: { ...(await getSessionHeaders())! },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            if (await handleUnauthorizedResponse(response)) return { success: false, error: "Session expired" };
            const forbiddenMsg = await handleForbiddenResponse(response);
            if (forbiddenMsg) return { success: false, error: forbiddenMsg };
            const error = await response.text();
            console.error("Failed to create announcement:", error);
            return { success: false, error: "Failed to create announcement" };
        }

        revalidateTag('announcements', 'max');
        return { success: true, data: await response.json() as Announcement };
    } catch (error) {
        console.error("Error creating announcement:", error);
        return { success: false, error: "Failed to create announcement" };
    }
}

export async function updateAnnouncement(id: string, data: AnnouncementUpdate): Promise<ActionResult<Announcement>> {
    const session = await auth();
    if (!session?.user?.accessToken) return { success: false, error: "Unauthorized" };

    try {
        const response = await fetch(`${API_BASE_URL}/announcements//${id}`, {
            method: 'PUT',
            headers: { ...(await getSessionHeaders())! },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            if (await handleUnauthorizedResponse(response)) return { success: false, error: "Session expired" };
            const forbiddenMsg = await handleForbiddenResponse(response);
            if (forbiddenMsg) return { success: false, error: forbiddenMsg };
            const error = await response.text();
            console.error("Failed to update announcement:", error);
            return { success: false, error: "Failed to update announcement" };
        }

        revalidateTag('announcements', 'max');
        return { success: true, data: await response.json() as Announcement };
    } catch (error) {
        console.error("Error updating announcement:", error);
        return { success: false, error: "Failed to update announcement" };
    }
}

export async function deleteAnnouncement(id: string): Promise<ActionResult> {
    const session = await auth();
    if (!session?.user?.accessToken) return { success: false, error: "Unauthorized" };

    try {
        const response = await fetch(`${API_BASE_URL}/announcements//${id}`, {
            method: 'DELETE',
            headers: { ...(await getSessionHeaders())! },
        });

        if (!response.ok) {
            if (await handleUnauthorizedResponse(response)) return { success: false, error: "Session expired" };
            const forbiddenMsg = await handleForbiddenResponse(response);
            if (forbiddenMsg) return { success: false, error: forbiddenMsg };
            console.error("Failed to delete announcement:", await response.text());
            return { success: false, error: "Failed to delete announcement" };
        }

        revalidateTag('announcements', 'max');
        return { success: true };
    } catch (error) {
        console.error("Error deleting announcement:", error);
        return { success: false, error: "Failed to delete announcement" };
    }
}
