"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { safeRevalidate } from "@/lib/safe-revalidate";
import { cache } from "react";
import { auth } from "@/auth";
import { getSessionHeaders, handleUnauthorizedResponse, handleForbiddenResponse } from '@/lib/server-auth';
import type { ActionResult } from '@/types/api';

const BASE_URL = process.env.BASE_URL_LOCAL || process.env.BASE_URL_PRODUCTION || "http://127.0.0.1:8000";
const API_BASE_URL = `${BASE_URL}/api/v1`;

// createUser removed

export async function updateUser(formData: FormData): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.accessToken) return { success: false, error: "Unauthorized" };

  const id = formData.get("id");
  const payload = {
    full_name: formData.get("fullName"),
    email: formData.get("email"),
    avatar_url: formData.get("avatarUrl"),
    roles: JSON.parse((formData.get("roles") as string) || "[]"),
  };

  try {
    const response = await fetch(`${API_BASE_URL}/users/${id}`, {
      method: "PUT",
      headers: { ...(await getSessionHeaders())! },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      if (await handleUnauthorizedResponse(response)) return { success: false, error: "Session expired" };
      const forbiddenMsg = await handleForbiddenResponse(response);
      if (forbiddenMsg) return { success: false, error: forbiddenMsg };
      console.error("Failed to update user:", await response.text());
      return { success: false, error: "Failed to update user" };
    }

    safeRevalidate(() => {
        revalidatePath("/[orgSlug]/users", "page");
        revalidateTag("users", "max");
    }, 'users mutation');
    return { success: true };
  } catch (error) {
    console.error("Error updating user:", error);
    return { success: false, error: "Failed to update user" };
  }
}

export async function deleteUser(formData: FormData): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.accessToken) return { success: false, error: "Unauthorized" };

  const id = formData.get("id");
  try {
    const response = await fetch(`${API_BASE_URL}/users/${id}`, {
      method: "DELETE",
      headers: { ...(await getSessionHeaders())! },
    });

    if (!response.ok) {
      if (await handleUnauthorizedResponse(response)) return { success: false, error: "Session expired" };
      const forbiddenMsg = await handleForbiddenResponse(response);
      if (forbiddenMsg) return { success: false, error: forbiddenMsg };
      console.error("Failed to delete user:", await response.text());
      return { success: false, error: "Failed to delete user" };
    }

    safeRevalidate(() => {
        revalidatePath("/[orgSlug]/users", "page");
        revalidateTag("users", "max");
    }, 'users mutation');
    return { success: true };
  } catch (error) {
    console.error("Error deleting user:", error);
    return { success: false, error: "Failed to delete user" };
  }
}

export const getUser = cache(async function (id: string) {
  const session = await auth();

  if (!session?.user?.accessToken) {
    return null;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/users/${id}`, {
      method: "GET",
      headers: { ...(await getSessionHeaders())! },
      next: { tags: [`user-${id}`], revalidate: 60 },
    });

    if (!response.ok) {
      console.error(`Failed to fetch user ${id}:`, await response.text());
      return null;
    }

    const u = await response.json();
    return {
      id: u.id,
      name: u.full_name,
      email: u.email,
      image: u.avatar_url,
      fullName: u.full_name,
      full_name: u.full_name,
      roles: u.roles || [],
      avatarUrl: u.avatar_url,
      avatar_url: u.avatar_url,
    };
  } catch (error) {
    console.error(`Error fetching user ${id}:`, error);
    return null;
  }
});

/**
 * Fetch users safely based on the current user's global roles:
 * - If user has `super_admin` or `manager` global roles → fetches all system users
 * - Otherwise → fetches organization members mapped to User shape
 *
 * This prevents "not enough privileges" errors for org-level users.
 */
export const getUsersSafe = cache(async function (): Promise<any[]> {
  const session = await auth();
  if (!session?.user?.accessToken) return [];

  const hasGlobalAccess =
    session.user.roles?.includes("super_admin") ||
    session.user.roles?.includes("manager");

  if (hasGlobalAccess) {
    return getUsers();
  }

  // Fall back to org members
  const orgId = session.user.currentOrganizationId;
  if (!orgId) return [];

  const headers = await getSessionHeaders();
  if (!headers) return [];

  try {
    const res = await fetch(`${API_BASE_URL}/organizations/${orgId}/members`, {
      headers: { ...headers },
      next: { tags: ["org-members"], revalidate: 60 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    const list = Array.isArray(data) ? data : (data.items || data.members || []);
    return list.map((m: any) => {
      const u = m.user || {};
      return {
        id: u.id || m.user_id,
        name: u.full_name || u.name,
        email: u.email || "",
        image: u.avatar_url || null,
        fullName: u.full_name || u.name,
        full_name: u.full_name || u.name,
        roles: u.roles || [],
        avatarUrl: u.avatar_url || null,
        avatar_url: u.avatar_url || null,
      };
    });
  } catch {
    return [];
  }
});

export const getUsers = cache(async function () {
  const session = await auth();

  if (!session?.user?.accessToken) {
    return [];
  }

  try {
    const response = await fetch(`${API_BASE_URL}/users`, {
      method: "GET",
      headers: { ...(await getSessionHeaders())! },
      next: { tags: ["users"], revalidate: 60 },
    });

    if (!response.ok) {
      const errorText = await response.text();
      if (await handleUnauthorizedResponse(response)) return [];
      // Suppress "The user doesn't have enough privileges" errors for non-admins
      if (
        response.status === 403 ||
        (response.status === 400 && errorText.includes("privileges"))
      ) {
        console.warn(
          "User fetch suppressed due to lack of privileges. Returning empty list.",
        );
        return [];
      }
      console.error("Failed to fetch users:", errorText);
      return [];
    }

    const users = await response.json();

    // Define interface for API response
    interface ApiUser {
      id: string;
      full_name: string;
      email: string;
      avatar_url: string;
      roles: string[];
    }

    // Map payload to User type
    return users.map((u: ApiUser) => ({
      id: u.id,
      name: u.full_name, // Map full_name to name
      email: u.email,
      image: u.avatar_url, // Use avatar_url for image
      fullName: u.full_name,
      full_name: u.full_name,
      roles: u.roles || [],
      avatarUrl: u.avatar_url,
      avatar_url: u.avatar_url,
    }));
  } catch (error) {
    console.error("Error fetching users:", error);
    return [];
  }
});

export const getUserTimeLogs = cache(async function (userId: string) {
  const session = await auth();
  if (!session?.user?.accessToken) return [];

  try {
    const response = await fetch(`${API_BASE_URL}/timelogs`, {
      method: "GET",
      headers: { ...(await getSessionHeaders())! },
      next: { tags: ["timelogs"], revalidate: 60 },
    });

    if (!response.ok) {
      console.error("Failed to fetch timelogs:", await response.text());
      return [];
    }

    const allLogs = await response.json();
    // Filter logs by user
    return allLogs
      .filter((log: any) => log.user_id === userId)
      .map((log: any) => ({
        id: log.id,
        task_id: log.task_id,
        user_id: log.user_id,
        start_time: log.start_time,
        end_time: log.end_time ?? null,
      }));
  } catch (error) {
    console.error("Error fetching user timelogs:", error);
    return [];
  }
});
