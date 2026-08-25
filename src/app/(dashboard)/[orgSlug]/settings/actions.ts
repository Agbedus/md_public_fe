'use server';

import { getSessionHeaders, handleUnauthorizedResponse, handleForbiddenResponse } from '@/lib/server-auth';
import { revalidatePath } from 'next/cache';
import type { ActionResult } from '@/types/api';

const BASE_URL = process.env.BASE_URL_LOCAL || process.env.BASE_URL_PRODUCTION || "http://127.0.0.1:8000";
const API_BASE_URL = `${BASE_URL}/api/v1`;

/**
 * Personal SMS opt-in. This only ever *enables the possibility* — whether a
 * text actually goes out also depends on the organization's own
 * `sms_notifications_enabled` switch (Organization tab, OWNER/ADMIN only),
 * which the backend checks independently of this one.
 */
export async function updateMySmsPreference(enabled: boolean): Promise<ActionResult> {
  const headers = await getSessionHeaders();
  if (!headers.Authorization) return { success: false, error: 'Unauthorized' };

  try {
    const res = await fetch(`${API_BASE_URL}/users/me`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ sms_notifications_enabled: enabled }),
    });

    if (!res.ok) {
      if (await handleUnauthorizedResponse(res)) return { success: false, error: 'Session expired' };
      const msg = await handleForbiddenResponse(res);
      if (msg) return { success: false, error: msg };
      const body = await res.json().catch(() => ({}));
      return { success: false, error: body.detail || 'Could not update your notification preferences.' };
    }

    revalidatePath('/[orgSlug]/settings', 'page');
    return { success: true };
  } catch {
    return { success: false, error: 'Could not connect to the server.' };
  }
}

/** Same coercion as profile/actions.ts — FastAPI's 422 `detail` is an array of
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

/** Upload a new logo for the organization. OWNER/ADMIN only — enforced server-side. */
export async function uploadOrganizationLogo(orgId: string, formData: FormData): Promise<ActionResult & { logo_url?: string }> {
  const headers = await getSessionHeaders();
  if (!headers.Authorization) return { success: false, error: 'Unauthorized' };

  // Multipart body — the JSON content-type from getSessionHeaders() must be
  // dropped so fetch can set its own boundary, or FastAPI fails to parse the
  // upload and returns a 422.
  const { 'Content-Type': _jsonContentType, ...uploadHeaders } = headers as Record<string, string>;

  try {
    const res = await fetch(`${API_BASE_URL}/organizations/${orgId}/logo`, {
      method: 'POST',
      headers: uploadHeaders,
      body: formData,
    });

    if (!res.ok) {
      if (await handleUnauthorizedResponse(res)) return { success: false, error: 'Session expired' };
      const msg = await handleForbiddenResponse(res);
      if (msg) return { success: false, error: msg };
      const body = await res.json().catch(() => ({}));
      return { success: false, error: extractErrorDetail(body.detail, `Failed to upload logo (${res.status})`) };
    }

    const updated = await res.json().catch(() => null);
    revalidatePath('/[orgSlug]/settings', 'page');
    revalidatePath('/', 'layout');
    return { success: true, logo_url: updated?.logo_url };
  } catch {
    return { success: false, error: 'Could not connect to the server.' };
  }
}
