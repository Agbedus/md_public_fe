'use server';

import { auth } from '@/auth';
import { getSessionHeaders, handleUnauthorizedResponse, handleForbiddenResponse } from '@/lib/server-auth';
import type { OrganizationMembershipWithUser } from '@/types/organization';
import { isPrivilegedOrgRole } from '@/types/organization';
import { revalidatePath } from 'next/cache';
import type { ActionResult } from '@/types/api';

const BASE_URL = process.env.BASE_URL_LOCAL || process.env.BASE_URL_PRODUCTION || "http://127.0.0.1:8000";
const API_BASE_URL = `${BASE_URL}/api/v1`;

function isSuperAdmin(session: any): boolean {
  return !!(session?.user as any)?.roles?.includes('super_admin');
}

function canManage(currentRole: string | null, session: any): boolean {
  return isPrivilegedOrgRole(currentRole) || isSuperAdmin(session);
}

export async function getOrgMembers(): Promise<OrganizationMembershipWithUser[]> {
  const session = await auth();
  const orgId = session?.user?.currentOrganizationId;
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
  const orgId = session?.user?.currentOrganizationId;
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
  const orgId = session?.user?.currentOrganizationId;
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
  const orgId = session?.user?.currentOrganizationId;
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
  const orgId = session?.user?.currentOrganizationId;
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
  const orgId = session?.user?.currentOrganizationId;
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

interface InviteResult {
  success: boolean;
  error?: string;
  results: { email: string; success: boolean; error?: string }[];
}

export async function sendInvitation(emails: string[]): Promise<InviteResult> {
  const session = await auth();
  const orgId = session?.user?.currentOrganizationId;
  if (!orgId) return { success: false, error: 'No organization selected', results: [] };

  const headers = await getSessionHeaders();
  if (!headers) return { success: false, error: 'Unauthorized', results: [] };

  const results = await Promise.all(
    emails.map(async (email) => {
      try {
        const res = await fetch(`${API_BASE_URL}/invitations/send`, {
          method: 'POST',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, organization_id: orgId }),
        });

        if (!res.ok) {
          if (res.status === 403) {
            return { email, success: false, error: 'Only owners and admins can send invitations' };
          }
          const body = await res.json().catch(() => ({}));
          return { email, success: false, error: body.detail || 'Failed to send invitation' };
        }

        return { email, success: true };
      } catch {
        return { email, success: false, error: 'Network error' };
      }
    })
  );

  const allOk = results.every(r => r.success);
  return {
    success: allOk,
    error: allOk ? undefined : 'Some invitations failed',
    results,
  };
}
