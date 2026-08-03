'use server';

import { getSessionHeaders, handleUnauthorizedResponse, handleForbiddenResponse } from '@/lib/server-auth';
import { revalidatePath } from 'next/cache';
import type { ActionResult } from '@/types/api';

const BASE_URL = process.env.BASE_URL_LOCAL || process.env.BASE_URL_PRODUCTION || "http://127.0.0.1:8000";
const API_BASE_URL = `${BASE_URL}/api/v1`;

/** Same coercion as team/actions.ts — FastAPI's 422 `detail` is an array of
 *  `{type, loc, msg, input}`, not a string, and must never hit a toast raw. */
function extractErrorDetail(detail: unknown, fallback: string): string {
  if (typeof detail === 'string' && detail.trim()) return detail;
  if (Array.isArray(detail)) {
    const msgs = detail
      .map((d) => (d && typeof d === 'object' && 'msg' in d ? String((d as { msg: unknown }).msg) : null))
      .filter(Boolean);
    if (msgs.length) return msgs.join('; ');
  }
  return fallback;
}

/**
 * Update the signed-in user's own basic profile. This is the self-service
 * counterpart to the Team page's member-edit modal — no hierarchy check is
 * needed here since you always may edit yourself.
 */
export async function updateMyProfile(data: {
  full_name?: string;
  job_title?: string;
  phone?: string;
}): Promise<ActionResult> {
  const headers = await getSessionHeaders();
  if (!headers.Authorization) return { success: false, error: 'Unauthorized' };

  try {
    const res = await fetch(`${API_BASE_URL}/users/me`, {
      method: 'PUT',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      if (await handleUnauthorizedResponse(res)) return { success: false, error: 'Session expired' };
      const msg = await handleForbiddenResponse(res);
      if (msg) return { success: false, error: msg };
      const body = await res.json().catch(() => ({}));
      return { success: false, error: extractErrorDetail(body.detail, `Failed to update profile (${res.status})`) };
    }

    revalidatePath('/[orgSlug]/profile', 'page');
    revalidatePath('/', 'layout');
    return { success: true };
  } catch (error) {
    console.error('Error updating profile:', error);
    return { success: false, error: 'Network error' };
  }
}

/** Upload a new avatar for the signed-in user. */
export async function uploadMyAvatar(formData: FormData): Promise<ActionResult & { avatar_url?: string }> {
  const headers = await getSessionHeaders();
  if (!headers.Authorization) return { success: false, error: 'Unauthorized' };

  // Multipart body — the JSON content-type from getSessionHeaders() must be
  // dropped so fetch can set its own boundary. Leaving it on makes FastAPI
  // fail to parse the upload and return a 422 (see team/actions.ts for the
  // reproduction of this exact bug).
  const { 'Content-Type': _jsonContentType, ...uploadHeaders } = headers as Record<string, string>;

  try {
    const res = await fetch(`${API_BASE_URL}/users/me/avatar`, {
      method: 'POST',
      headers: uploadHeaders,
      body: formData,
    });

    if (!res.ok) {
      if (await handleUnauthorizedResponse(res)) return { success: false, error: 'Session expired' };
      const msg = await handleForbiddenResponse(res);
      if (msg) return { success: false, error: msg };
      const body = await res.json().catch(() => ({}));
      return { success: false, error: extractErrorDetail(body.detail, `Failed to upload avatar (${res.status})`) };
    }

    const updated = await res.json().catch(() => null);
    revalidatePath('/[orgSlug]/profile', 'page');
    revalidatePath('/', 'layout');
    return { success: true, avatar_url: updated?.avatar_url };
  } catch (error) {
    console.error('Error uploading avatar:', error);
    return { success: false, error: 'Network error' };
  }
}
