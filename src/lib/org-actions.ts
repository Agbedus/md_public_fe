'use server';

import { auth } from '@/auth';
import { getSessionHeaders } from '@/lib/server-auth';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

const BASE_URL = process.env.BASE_URL_LOCAL || process.env.BASE_URL_PRODUCTION || "http://127.0.0.1:8000";
const API_BASE_URL = `${BASE_URL}/api/v1`;

import type {
  OrgBrief,
  OrgMember,
  CurrentOrgContext,
} from '@/types/organization';
import { normalizeRoleValue } from '@/types/organization';
import type { ActionResult } from '@/types/api';

export async function getOrganizations(): Promise<OrgBrief[]> {
  const session = await auth();
  if (!session?.user?.accessToken) return [];

  try {
    const response = await fetch(`${API_BASE_URL}/organizations`, {
      method: 'GET',
      headers: { ...(await getSessionHeaders()) },
      next: { tags: ['organizations'], revalidate: 60 },
    });

    if (!response.ok) return [];

    const data = await response.json();
    const orgList = Array.isArray(data) ? data : (data.items || data.data || data.organizations || []);
    return orgList.map((org: Record<string, unknown>) => {
      const membership = org.membership as Record<string, unknown> | undefined;
      const memberCount = (org.member_count ?? org.members_count) as number | undefined;
      const description = (org.description as string | undefined) ?? null;
      const joinedAt = (org.joined_at ?? membership?.joined_at) as string | undefined;
      return {
        id: String(org.id || org.organization_id || org._id || ''),
        name: String(org.name || org.organization_name || 'Unnamed'),
        slug: org.slug as string | undefined,
        logo_url: (org.logo_url || org.logo) as string | null | undefined,
        description,
        role: membership?.role as string | undefined,
        membershipStatus: membership?.status as string | undefined,
        joined_at: joinedAt,
        member_count: typeof memberCount === 'number' ? memberCount : undefined,
        invite_code: (org.invite_code as string) ?? null,
      };
    });
  } catch (error) {
    console.error("Error fetching organizations:", error);
    return [];
  }
}

export async function getOrganizationMembers(orgId: string): Promise<OrgMember[]> {
  const session = await auth();
  if (!session?.user?.accessToken) return [];

  try {
    const response = await fetch(`${API_BASE_URL}/organizations/${orgId}/members`, {
      method: 'GET',
      headers: { ...(await getSessionHeaders()) },
      next: { tags: [`org-members-${orgId}`], revalidate: 60 },
    });

    if (!response.ok) return [];

    const data = await response.json();
    const list = Array.isArray(data) ? data : (data.items || data.members || []);
    return list.map((m: Record<string, unknown>) => {
      const u = (m.user || {}) as Record<string, unknown>;
      return {
        id: String(m.id || ''),
        userId: String(m.user_id || ''),
        organizationId: String(m.organization_id || ''),
        role: String(m.role || ''),
        status: String(m.status || ''),
        joinedAt: String(m.joined_at || ''),
        user: {
          id: String(u.id || ''),
          email: String(u.email || ''),
          fullName: (u.full_name as string) || null,
          avatarUrl: (u.avatar_url as string) || null,
        },
      };
    });
  } catch (error) {
    console.error("Error fetching organization members:", error);
    return [];
  }
}

export async function switchOrganization(orgId: string): Promise<{ success: boolean; error?: string; slug?: string }> {
  const session = await auth();
  if (!session?.user?.accessToken) {
    return { success: false, error: 'Unauthorized' };
  }

  const headers = await getSessionHeaders();

  try {
    // Tell the backend — this updates user.current_organization_id on the server
    const resp = await fetch(`${API_BASE_URL}/organizations/switch`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ organization_id: orgId }),
      cache: 'no-store',
    });

    if (!resp.ok) {
      const err = await resp.text();
      console.error('Backend organization switch failed:', resp.status, err);
    }

    // Pull the slug — first try the local orgs cache, then hit the backend
    let slug: string | undefined;
    const orgs = await getOrganizations();
    const local = orgs.find((o) => o.id === orgId);
    if (local?.slug) slug = local.slug;

    if (!slug) {
      try {
        const orgResp = await fetch(`${API_BASE_URL}/organizations/${orgId}`, {
          method: 'GET',
          headers,
          cache: 'no-store',
        });
        if (orgResp.ok) {
          const data = await orgResp.json();
          slug = (data?.slug as string | undefined) ?? undefined;
        }
      } catch {}
    }

    const cookieStore = await cookies();
    cookieStore.set('current_organization_id', orgId, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'lax',
    });
    if (slug) {
      cookieStore.set('org_slug', slug, {
        path: '/',
        maxAge: 60 * 60 * 24 * 365,
        sameSite: 'lax',
      });
    }

    revalidatePath('/', 'layout');
    return { success: true, slug };
  } catch (error) {
    console.error('Error switching organization:', error);
    return { success: false, error: 'Failed to switch organization' };
  }
}

/**
 * Resolve the user's current org into a single typed context object.
 *
 * 1. First reads the cached `current_organization` embedded in
 *    `GET /users/me` (parsed by `auth.ts` on login).
 * 2. Falls back to `GET /organizations` and filters to whichever row
 *    matches the user's `current_organization_id`.
 *
 * Returns `null` when nothing is resolvable — caller decides what to do.
 */
export async function getCurrentOrgContext(): Promise<CurrentOrgContext | null> {
  const session = await auth();
  if (!session?.user?.accessToken) return null;

  // Fast path: pull from /users/me which already embeds current_organization
  try {
    const meResp = await fetch(`${API_BASE_URL}/users/me`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${session.user.accessToken}` },
      cache: 'no-store',
    });
    if (meResp.ok) {
      const me = await meResp.json();
      const co = me?.current_organization;
      if (co && co.id && co.slug) {
        const role = normalizeRoleValue(co.role) ?? 'MEMBER';
        return {
          id: String(co.id),
          name: String(co.name ?? ''),
          slug: String(co.slug),
          logo_url: co.logo_url ?? null,
          role,
          status: (co.status as CurrentOrgContext['status']) ?? 'active',
          joined_at: null,
        };
      }
    }
  } catch (e) {
    // continue to fallback
  }

  // Fallback: list orgs the user belongs to and pick the active one
  const orgs = await getOrganizations();
  const activeId =
    session.user.currentOrganizationId ??
    (typeof cookies === 'function' ? (await cookies()).get('current_organization_id')?.value ?? null : null);
  if (!activeId) {
    // No active org — if user has exactly one, default to it
    if (orgs.length === 1 && orgs[0].slug) {
      const only = orgs[0];
      return {
        id: only.id,
        name: only.name,
        slug: only.slug as string,
        logo_url: only.logo_url ?? null,
        description: only.description ?? null,
        role: normalizeRoleValue(only.role) ?? 'MEMBER',
        status: (only.membershipStatus as CurrentOrgContext['status']) ?? 'active',
        joined_at: only.joined_at ?? null,
        member_count: only.member_count,
      };
    }
    return null;
  }

  const match = orgs.find((o) => o.id === activeId);
  if (!match || !match.slug) return null;

  return {
    id: match.id,
    name: match.name,
    slug: match.slug,
    logo_url: match.logo_url ?? null,
    description: match.description ?? null,
    role: normalizeRoleValue(match.role) ?? 'MEMBER',
    status: (match.membershipStatus as CurrentOrgContext['status']) ?? 'active',
    joined_at: match.joined_at ?? null,
    member_count: match.member_count,
  };
}

/**
 * Live member count for a given org — used by the Profile avatar/list
 * to show "X members". 0 if the backend hides it from this user.
 */
export async function getOrgMembersCount(orgId: string): Promise<number> {
  const session = await auth();
  if (!session?.user?.accessToken || !orgId) return 0;

  try {
    const resp = await fetch(`${API_BASE_URL}/organizations/${orgId}/members`, {
      method: 'GET',
      headers: await getSessionHeaders(),
      next: { tags: [`org-members-${orgId}`], revalidate: 30 },
    });
    if (!resp.ok) return 0;
    const data = await resp.json();
    const list = Array.isArray(data) ? data : (data.items || data.members || []);
    return Array.isArray(list) ? list.length : 0;
  } catch {
    return 0;
  }
}

/**
 * Join an organization via invite code.
 * Only works for users who already have an account (are logged in).
 */
export async function joinOrganizationByInvite(inviteCode: string): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.accessToken) {
    return { success: false, error: 'You must be logged in to join an organization.' };
  }

  const headers = await getSessionHeaders();

  try {
    const res = await fetch(`${API_BASE_URL}/organizations/join/${encodeURIComponent(inviteCode)}`, {
      method: 'POST',
      headers,
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { success: false, error: body.detail || 'Failed to join organization' };
    }

    revalidatePath('/', 'layout');
    return { success: true };
  } catch {
    return { success: false, error: 'Network error' };
  }
}
