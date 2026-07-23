'use server';

import { z } from 'zod';
import { WaitlistResult } from '@/types/waitlist';

const WaitlistSchema = z.object({
    name: z.string().min(2, 'Name is required'),
    company: z.string().min(2, 'Company is required'),
    role: z.string().min(1, 'Role is required'),
    source: z.string().min(1, 'Source is required'),
    phone: z.string().min(5, 'Phone is required'),
    email: z.string().email('Please enter a valid email'),
});

const BASE_URL = process.env.BASE_URL_LOCAL || process.env.BASE_URL_PRODUCTION || "http://127.0.0.1:8000";
const API_BASE_URL = `${BASE_URL}/api/v1`;

export async function submitWaitlist(data: Record<string, string>): Promise<WaitlistResult> {
    const validated = WaitlistSchema.safeParse(data);

    if (!validated.success) {
        return { success: false, error: validated.error.issues[0]?.message || 'Invalid fields' };
    }

    try {
        const res = await fetch(`${API_BASE_URL}/waitlist`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(validated.data),
        });

        if (!res.ok) {
            const errorText = await res.text();
            try {
                const errorJson = JSON.parse(errorText);
                return { success: false, error: errorJson.detail || 'Failed to join waitlist' };
            } catch {
                return { success: false, error: 'Failed to join waitlist' };
            }
        }

        return { success: true };
    } catch {
        return { success: false, error: 'Network error. Please try again.' };
    }
}
