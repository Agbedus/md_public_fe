"use server";

import { auth } from "@/auth";
import { getSessionHeaders, handleUnauthorizedResponse, handleForbiddenResponse } from '@/lib/server-auth';
import type { WaitlistEntry } from "@/types/waitlist";

const BASE_URL = process.env.BASE_URL_LOCAL || process.env.BASE_URL_PRODUCTION || "http://127.0.0.1:8000";
const API_BASE_URL = `${BASE_URL}/api/v1`;

export async function getWaitlistEntries(): Promise<WaitlistEntry[]> {
    const session = await auth();
    if (!session?.user?.accessToken) return [];

    try {
        const response = await fetch(`${API_BASE_URL}/waitlist`, {
            headers: { ...(await getSessionHeaders())! },
        });

        if (!response.ok) {
            if (await handleUnauthorizedResponse(response)) return [];
            console.error("Failed to fetch waitlist:", await response.text());
            return [];
        }

        return await response.json();
    } catch (error) {
        console.error("Failed to fetch waitlist:", error);
        return [];
    }
}
