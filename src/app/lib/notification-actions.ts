'use server';

import { auth } from '@/auth';
import { getSessionHeaders, handleUnauthorizedResponse, handleForbiddenResponse } from '@/lib/server-auth';
import { revalidateTag } from 'next/cache';
import { safeRevalidate } from '@/lib/safe-revalidate';
import { Notification } from '@/components/ui/notifications/notification-provider';
import type { ActionResult } from '@/types/api';

const BASE_URL = process.env.BASE_URL_LOCAL || process.env.BASE_URL_PRODUCTION || "http://127.0.0.1:8000";
const API_BASE_URL = `${BASE_URL}/api/v1`;

export async function getNotifications() {
    const session = await auth();
    if (!session?.user?.accessToken) return [];

    try {
        const response = await fetch(`${API_BASE_URL}/notifications`, {
            method: 'GET',
            headers: { ...(await getSessionHeaders())! },
            next: { tags: ['notifications'], revalidate: 30 }
        });

        if (!response.ok) {
            if (await handleUnauthorizedResponse(response)) return [];
            console.error("Failed to fetch notifications:", await response.text());
            return [];
        }

        return await response.json() as Notification[];
    } catch (error) {
        console.error("Error fetching notifications:", error);
        return [];
    }
}

export async function markNotificationAsRead(id: string): Promise<ActionResult> {
    const session = await auth();
    if (!session?.user?.accessToken) return { success: false, error: "Unauthorized" };

    try {
        const response = await fetch(`${API_BASE_URL}/notifications/${id}/read`, {
            method: 'PUT',
            headers: { ...(await getSessionHeaders())! },
        });

        if (!response.ok) {
            if (await handleUnauthorizedResponse(response)) return { success: false, error: "Session expired" };
            const forbiddenMsg = await handleForbiddenResponse(response);
            if (forbiddenMsg) return { success: false, error: forbiddenMsg };
            console.error("Failed to mark notification as read:", await response.text());
            return { success: false, error: "Failed to mark as read" };
        }

        safeRevalidate(() => {
            revalidateTag('notifications', 'max');
        }, 'lib mutation');
        return { success: true };
    } catch (error) {
        console.error("Error marking notification as read:", error);
        return { success: false, error: "Network error" };
    }
}

export async function markAllNotificationsAsRead(): Promise<ActionResult> {
    const session = await auth();
    if (!session?.user?.accessToken) return { success: false, error: "Unauthorized" };

    const headers = { ...(await getSessionHeaders())! };
    try {
        const notifications = await getNotifications();
        const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);

        await Promise.all(unreadIds.map(id => 
            fetch(`${API_BASE_URL}/notifications/${id}/read`, {
                method: 'PUT',
                headers,
            })
        ));

        safeRevalidate(() => {
            revalidateTag('notifications', 'max');
        }, 'lib mutation');
        return { success: true };
    } catch (error) {
        console.error("Error marking all notifications as read:", error);
        return { success: false, error: "Network error" };
    }
}
