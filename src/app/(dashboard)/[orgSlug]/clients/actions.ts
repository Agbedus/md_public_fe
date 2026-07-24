'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { safeRevalidate } from '@/lib/safe-revalidate';
import { cache } from 'react';

const BASE_URL = process.env.BASE_URL_LOCAL || process.env.BASE_URL_PRODUCTION || "http://127.0.0.1:8000";
const API_BASE_URL = `${BASE_URL}/api/v1`;

import { auth } from '@/auth';
import { getSessionHeaders, handleUnauthorizedResponse, handleForbiddenResponse } from '@/lib/server-auth';
import { Client } from '@/types/client';
import type { ActionResult } from '@/types/api';

// Interface for what the API returns (snake_case)
interface ApiClient {
    id: string;
    company_name: string;
    contact_person_name: string | null;
    contact_email: string | null;
    website_url: string | null;
    created_at: string;
}

export const getClients = cache(async function(): Promise<Client[]> {

    const session = await auth();
    if (!session?.user?.accessToken) {

        return [];
    }

    try {
        const response = await fetch(`${API_BASE_URL}/clients`, {
            method: 'GET',
            headers: { ...(await getSessionHeaders())! },
            next: { tags: ['clients'], revalidate: 60 }
        });

        if (!response.ok) {
            if (await handleUnauthorizedResponse(response)) return [];
            if (await handleForbiddenResponse(response)) return [];
            console.error("Failed to fetch clients:", await response.text());
            return [];
        }

        const clients: ApiClient[] = await response.json();
        
        // Map API snake_case to Frontend camelCase
        return clients.map(client => ({
            id: client.id,
            companyName: client.company_name,
            contactPersonName: client.contact_person_name,
            contactEmail: client.contact_email,
            websiteUrl: client.website_url,
            createdAt: client.created_at
        }));
    } catch (error) {
        console.error("Error fetching clients:", error);
        return [];
    }
});

export async function createClient(formData: FormData): Promise<ActionResult> {
    const session = await auth();
    if (!session?.user?.accessToken) {
        return { success: false, error: "Unauthorized" };
    }

    const rawData = {
        company_name: formData.get('companyName'),
        contact_person_name: formData.get('contactPersonName'),
        contact_email: formData.get('contactEmail'),
        website_url: formData.get('websiteUrl'),
    };

    try {
        const response = await fetch(`${API_BASE_URL}/clients`, {
            method: 'POST',
            headers: { ...(await getSessionHeaders())! },
            body: JSON.stringify(rawData)
        });

        if (!response.ok) {
            if (await handleUnauthorizedResponse(response)) return { success: false, error: "Session expired" };
            const forbiddenMsg = await handleForbiddenResponse(response);
            if (forbiddenMsg) return { success: false, error: forbiddenMsg };
            const error = await response.text();
            console.error("Failed to create client:", error);
            return { success: false, error: "Failed to create client" };
        }

        safeRevalidate(() => {
            revalidatePath('/[orgSlug]/clients', 'page');
            revalidateTag('clients', 'max');
        }, 'clients mutation');
        return { success: true };
    } catch (error) {
        console.error("Error creating client:", error);
        return { success: false, error: "Failed to create client" };
    }
}

export async function updateClient(formData: FormData): Promise<ActionResult> {
    const session = await auth();
    if (!session?.user?.accessToken) {
        return { success: false, error: "Unauthorized" };
    }

    const id = formData.get('id');
    if (!id) return { success: false, error: "Missing client ID" };

    const rawData = {
        company_name: formData.get('companyName'),
        contact_person_name: formData.get('contactPersonName'),
        contact_email: formData.get('contactEmail'),
        website_url: formData.get('websiteUrl'),
    };

    try {
        const response = await fetch(`${API_BASE_URL}/clients/${id}`, {
            method: 'PATCH',
            headers: { ...(await getSessionHeaders())! },
            body: JSON.stringify(rawData)
        });

        if (!response.ok) {
            if (await handleUnauthorizedResponse(response)) return { success: false, error: "Session expired" };
            const forbiddenMsg = await handleForbiddenResponse(response);
            if (forbiddenMsg) return { success: false, error: forbiddenMsg };
            const errorText = await response.text();
            console.error("Failed to update client:", errorText);
            return { success: false, error: "Failed to update client" };
        }

        safeRevalidate(() => {
            revalidatePath('/[orgSlug]/clients', 'page');
            revalidateTag('clients', 'max');
        }, 'clients mutation');
        return { success: true };
    } catch (error) {
        console.error("Error updating client:", error);
        return { success: false, error: "Failed to update client" };
    }
}

export async function deleteClient(formData: FormData): Promise<ActionResult> {
    const session = await auth();
    if (!session?.user?.accessToken) {
        return { success: false, error: "Unauthorized" };
    }

    const id = formData.get('id');
    if (!id) return { success: false, error: "Missing client ID" };

    try {
        const response = await fetch(`${API_BASE_URL}/clients/${id}`, {
            method: 'DELETE',
            headers: { ...(await getSessionHeaders())! },
        });

        if (!response.ok) {
            if (await handleUnauthorizedResponse(response)) return { success: false, error: "Session expired" };
            const forbiddenMsg = await handleForbiddenResponse(response);
            if (forbiddenMsg) return { success: false, error: forbiddenMsg };
            const errorText = await response.text();
            console.error("Failed to delete client:", errorText);
            return { success: false, error: "Failed to delete client" };
        }

        safeRevalidate(() => {
            revalidatePath('/[orgSlug]/clients', 'page');
            revalidateTag('clients', 'max');
        }, 'clients mutation');
        return { success: true };
    } catch (error) {
        console.error("Error deleting client:", error);
        return { success: false, error: "Failed to delete client" };
    }
}
