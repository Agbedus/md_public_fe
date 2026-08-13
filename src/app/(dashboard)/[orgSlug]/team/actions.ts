'use server';

import { auth } from '@/auth';
import { getSessionHeaders, handleUnauthorizedResponse, handleForbiddenResponse } from '@/lib/server-auth';
import type { OrganizationMembershipWithUser } from '@/types/organization';
import { isPrivilegedOrgRole } from '@/types/organization';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import type { ActionResult } from '@/types/api';

const BASE_URL = process.env.BASE_URL_LOCAL || process.env.BASE_URL_PRODUCTION || "http://127.0.0.1:8000";
const API_BASE_URL = `${BASE_URL}/api/v1`;

async function selectedOrganizationId(session: { user?: { currentOrganizationId?: string | null } } | null): Promise<string | undefined> {
  return (await cookies()).get('current_organization_id')?.value || session?.user?.currentOrganizationId || undefined;
}

function isSuperAdmin(session: any): boolean {
  return !!(session?.user as any)?.roles?.includes('super_admin');
}

function canManage(currentRole: string | null, session: any): boolean {
  return isPrivilegedOrgRole(currentRole) || isSuperAdmin(session);
}

export async function getOrgMembers(): Promise<OrganizationMembershipWithUser[]> {
  const session = await auth();
  const orgId = await selectedOrganizationId(session);
  if (!orgId) return [];

  const headers = await getSessionHeaders();
  if (!headers) return [];

  const res = await fetch(`${API_BASE_URL}/organizations/${orgId}/members`, {
    headers: { ...headers },
  });

  if (!res.ok) {
    if (await handleUnauthorizedResponse(res)) return [];
    const forbiddenMsg = await handleForbiddenResponse(res);
    if (forbiddenMsg) { console.error(forbiddenMsg); return []; }
    return [];
  }
  return res.json();
}

export async function getCurrentUserOrgRole(): Promise<string | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  const members = await getOrgMembers();
  const my = members.find((m) => m.user_id === session.user!.id);
  return my?.role ?? null;
}

/** Approve a pending member — sets status to active. Backend expects user_id in URL. */
export async function approveMember(userId: string): Promise<ActionResult> {
  const session = await auth();
  const orgId = await selectedOrganizationId(session);
  const currentRole = await getCurrentUserOrgRole();
  if (!canManage(currentRole, session)) {
    return { success: false, error: 'Only owners, admins, and super admins can approve members' };
  }

  const headers = await getSessionHeaders();
  if (!headers) return { success: false, error: 'Unauthorized' };

  try {
    const res = await fetch(`${API_BASE_URL}/organizations/${orgId}/members/${userId}`, {
      method: 'PATCH',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'active' }),
    });

    if (!res.ok) {
      if (await handleUnauthorizedResponse(res)) return { success: false, error: 'Session expired' };
      const msg = await handleForbiddenResponse(res);
      return { success: false, error: msg || 'Failed to approve member' };
    }

    revalidatePath('/[orgSlug]/team', 'page');
    return { success: true };
  } catch (error) {
    console.error('Error approving member:', error);
    return { success: false, error: 'Network error' };
  }
}

/** Reject/remove a member. Backend expects user_id in URL. */
export async function rejectMember(userId: string): Promise<ActionResult> {
  const session = await auth();
  const orgId = await selectedOrganizationId(session);
  const currentRole = await getCurrentUserOrgRole();
  if (!canManage(currentRole, session)) {
    return { success: false, error: 'Only owners, admins, and super admins can reject members' };
  }

  const headers = await getSessionHeaders();
  if (!headers) return { success: false, error: 'Unauthorized' };

  try {
    const res = await fetch(`${API_BASE_URL}/organizations/${orgId}/members/${userId}`, {
      method: 'DELETE',
      headers: { ...headers },
    });

    if (!res.ok) {
      if (await handleUnauthorizedResponse(res)) return { success: false, error: 'Session expired' };
      const msg = await handleForbiddenResponse(res);
      return { success: false, error: msg || 'Failed to reject member' };
    }

    revalidatePath('/[orgSlug]/team', 'page');
    return { success: true };
  } catch (error) {
    console.error('Error rejecting member:', error);
    return { success: false, error: 'Network error' };
  }
}

/** Update a member's role. Backend expects user_id in URL. */
export async function updateMemberRole(userId: string, role: string): Promise<ActionResult> {
  const session = await auth();
  const orgId = await selectedOrganizationId(session);
  const currentRole = await getCurrentUserOrgRole();
  if (!canManage(currentRole, session)) {
    return { success: false, error: 'Only owners, admins, and super admins can update roles' };
  }

  const headers = await getSessionHeaders();
  if (!headers) return { success: false, error: 'Unauthorized' };

  try {
    const res = await fetch(`${API_BASE_URL}/organizations/${orgId}/members/${userId}`, {
      method: 'PATCH',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    });

    if (!res.ok) {
      if (await handleUnauthorizedResponse(res)) return { success: false, error: 'Session expired' };
      const msg = await handleForbiddenResponse(res);
      if (msg) return { success: false, error: msg };
      const body = await res.json().catch(() => ({}));
      return { success: false, error: body.detail || `Failed to update role (${res.status})` };
    }

    revalidatePath('/[orgSlug]/team', 'page');
    return { success: true };
  } catch (error) {
    console.error('Error updating member role:', error);
    return { success: false, error: 'Network error' };
  }
}

/** Suspend a member. Backend expects user_id in URL. */
export async function suspendMember(userId: string): Promise<ActionResult> {
  const session = await auth();
  const orgId = await selectedOrganizationId(session);
  const currentRole = await getCurrentUserOrgRole();
  if (!canManage(currentRole, session)) {
    return { success: false, error: 'Only owners, admins, and super admins can suspend members' };
  }

  const headers = await getSessionHeaders();
  if (!headers) return { success: false, error: 'Unauthorized' };

  try {
    const res = await fetch(`${API_BASE_URL}/organizations/${orgId}/members/${userId}`, {
      method: 'PATCH',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'suspended' }),
    });

    if (!res.ok) {
      if (await handleUnauthorizedResponse(res)) return { success: false, error: 'Session expired' };
      const msg = await handleForbiddenResponse(res);
      return { success: false, error: msg || 'Failed to suspend member' };
    }

    revalidatePath('/[orgSlug]/team', 'page');
    return { success: true };
  } catch (error) {
    console.error('Error suspending member:', error);
    return { success: false, error: 'Network error' };
  }
}

/** Remove a member from the org entirely. Backend expects user_id in URL. */
export async function removeMember(userId: string): Promise<ActionResult> {
  const session = await auth();
  const orgId = await selectedOrganizationId(session);
  const currentRole = await getCurrentUserOrgRole();
  if (!canManage(currentRole, session)) {
    return { success: false, error: 'Only owners, admins, and super admins can remove members' };
  }

  const headers = await getSessionHeaders();
  if (!headers) return { success: false, error: 'Unauthorized' };

  try {
    const res = await fetch(`${API_BASE_URL}/organizations/${orgId}/members/${userId}`, {
      method: 'DELETE',
      headers: { ...headers },
    });

    if (!res.ok) {
      if (await handleUnauthorizedResponse(res)) return { success: false, error: 'Session expired' };
      const msg = await handleForbiddenResponse(res);
      return { success: false, error: msg || 'Failed to remove member' };
    }

    revalidatePath('/[orgSlug]/team', 'page');
    return { success: true };
  } catch (error) {
    console.error('Error removing member:', error);
    return { success: false, error: 'Network error' };
  }
}

/**
 * FastAPI returns `detail` as a plain string for raised HTTPExceptions, but as
 * an *array* of `{type, loc, msg, input}` objects for 422 request-validation
 * failures. Passing that array straight into a toast renders an object as a
 * React child and crashes the tree, so always funnel it through here.
 */
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
 * Update a member's basic info (name, job title).
 *
 * The edit-down-the-chain rule is enforced on the backend
 * (`_require_can_edit_member`); the client gates the button with
 * `canEditMemberProfile` so the two stay in step. Password, phone, and email
 * are deliberately absent — those stay self-service.
 */
export async function updateMemberProfile(
  userId: string,
  data: { full_name?: string; job_title?: string },
): Promise<ActionResult> {
  const session = await auth();
  const orgId = await selectedOrganizationId(session);
  if (!orgId) return { success: false, error: 'No organization selected' };

  const headers = await getSessionHeaders();
  if (!headers) return { success: false, error: 'Unauthorized' };

  try {
    const res = await fetch(`${API_BASE_URL}/organizations/${orgId}/members/${userId}/profile`, {
      method: 'PATCH',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      if (await handleUnauthorizedResponse(res)) return { success: false, error: 'Session expired' };
      const msg = await handleForbiddenResponse(res);
      if (msg) return { success: false, error: msg };
      const body = await res.json().catch(() => ({}));
      return {
        success: false,
        error: extractErrorDetail(body.detail, `Failed to update profile (${res.status})`),
      };
    }

    revalidatePath('/[orgSlug]/team', 'page');
    return { success: true };
  } catch (error) {
    console.error('Error updating member profile:', error);
    return { success: false, error: 'Network error' };
  }
}

/** Upload a new avatar for a member. Same permission rule as updateMemberProfile. */
export async function uploadMemberAvatar(
  userId: string,
  formData: FormData,
): Promise<ActionResult & { avatar_url?: string }> {
  const session = await auth();
  const orgId = await selectedOrganizationId(session);
  if (!orgId) return { success: false, error: 'No organization selected' };

  const headers = await getSessionHeaders();
  if (!headers) return { success: false, error: 'Unauthorized' };

  // `getSessionHeaders()` sets `Content-Type: application/json` for the JSON
  // endpoints. It must be dropped here: this body is multipart, and leaving the
  // JSON content type on it makes FastAPI fail to parse the upload and reject
  // the request with a 422.
  const { 'Content-Type': _jsonContentType, ...uploadHeaders } = headers as Record<string, string>;

  try {
    const res = await fetch(`${API_BASE_URL}/organizations/${orgId}/members/${userId}/avatar`, {
      method: 'POST',
      headers: uploadHeaders,
      body: formData,
    });

    if (!res.ok) {
      if (await handleUnauthorizedResponse(res)) return { success: false, error: 'Session expired' };
      const msg = await handleForbiddenResponse(res);
      if (msg) return { success: false, error: msg };
      const body = await res.json().catch(() => ({}));
      return {
        success: false,
        error: extractErrorDetail(body.detail, `Failed to upload avatar (${res.status})`),
      };
    }

    const updated = await res.json().catch(() => null);
    revalidatePath('/[orgSlug]/team', 'page');
    return { success: true, avatar_url: updated?.user?.avatar_url };
  } catch (error) {
    console.error('Error uploading member avatar:', error);
    return { success: false, error: 'Network error' };
  }
}

interface InviteResult {
  success: boolean;
  error?: string;
  results: { email: string; success: boolean; error?: string }[];
}

export async function sendInvitation(
  emails: string[],
  options: { role?: string; personalMessage?: string } = {},
): Promise<InviteResult> {
  const session = await auth();
  const orgId = await selectedOrganizationId(session);
  if (!orgId) return { success: false, error: 'No organization selected', results: [] };

  const headers = await getSessionHeaders();
  if (!headers) return { success: false, error: 'Unauthorized', results: [] };

  try {
    const res = await fetch(`${API_BASE_URL}/invitations/bulk-send`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        emails,
        organization_id: orgId,
        role: options.role || 'member',
        personal_message: options.personalMessage?.trim() || null,
      }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) return { success: false, error: extractErrorDetail(body.detail, 'Failed to send invitations'), results: [] };
    revalidatePath('/[orgSlug]/team', 'page');
    return { success: !!body.success, error: body.success ? undefined : 'Some invitations need attention', results: body.results || [] };
  } catch {
    return { success: false, error: 'Network error', results: emails.map(email => ({ email, success: false, error: 'Network error' })) };
  }
}

export interface PendingInvitation {
  id: string; email: string; role: string; status: string;
  created_at: string; expires_at: string; sent_at?: string | null;
}

export interface InvitationStats {
  total: number; delivered: number; delivery_failed: number; pending: number;
  accepted: number; revoked: number; expired: number; acceptance_rate: number;
}

export async function getPendingInvitations(): Promise<PendingInvitation[]> {
  const session = await auth();
  const orgId = await selectedOrganizationId(session);
  if (!orgId) return [];
  try {
    const res = await fetch(`${API_BASE_URL}/invitations?organization_id=${encodeURIComponent(orgId)}`, {
      headers: await getSessionHeaders(), cache: 'no-store',
    });
    return res.ok ? await res.json() : [];
  } catch { return []; }
}

export async function getInvitationStats(): Promise<InvitationStats | null> {
  const session = await auth();
  const orgId = await selectedOrganizationId(session);
  if (!orgId) return null;
  try {
    const res = await fetch(`${API_BASE_URL}/invitations/stats?organization_id=${encodeURIComponent(orgId)}`, {
      headers: await getSessionHeaders(), cache: 'no-store',
    });
    return res.ok ? await res.json() : null;
  } catch { return null; }
}

export async function resendInvitation(id: string): Promise<ActionResult> {
  try {
    const res = await fetch(`${API_BASE_URL}/invitations/${id}/resend`, { method: 'POST', headers: await getSessionHeaders() });
    const body = await res.json().catch(() => ({}));
    revalidatePath('/[orgSlug]/team', 'page');
    return res.ok ? { success: true } : { success: false, error: body.detail || body.error || 'Could not resend invitation.' };
  } catch { return { success: false, error: 'Network error' }; }
}

export async function revokeInvitation(id: string): Promise<ActionResult> {
  try {
    const res = await fetch(`${API_BASE_URL}/invitations/${id}`, { method: 'DELETE', headers: await getSessionHeaders() });
    revalidatePath('/[orgSlug]/team', 'page');
    return res.ok ? { success: true } : { success: false, error: 'Could not revoke invitation.' };
  } catch { return { success: false, error: 'Network error' }; }
}
