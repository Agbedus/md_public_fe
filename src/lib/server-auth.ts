import { auth, signOut } from '@/auth';
import { cookies } from 'next/headers';

export type SessionHeaders = Record<string, string>;

export async function getSessionHeaders(): Promise<SessionHeaders> {
  const session = await auth();
  const token = session?.user?.accessToken;
  if (!token) return {};

  let orgId: string | null | undefined;

  try {
    const cookieStore = await cookies();
    orgId = cookieStore.get('current_organization_id')?.value ||
            cookieStore.get('X-Organization-ID')?.value ||
            cookieStore.get('org_id')?.value ||
            cookieStore.get('organization_id')?.value;
  } catch {}

  if (!orgId) {
    orgId = session?.user?.currentOrganizationId;
  }

  const headers: SessionHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };

  if (orgId) {
    headers['X-Organization-ID'] = orgId;
  }

  return headers;
}

const BASE_URL = process.env.BASE_URL_LOCAL || process.env.BASE_URL_PRODUCTION || 'http://127.0.0.1:8000';

export interface FreshUserProfile {
  avatar_url: string | null;
  full_name: string | null;
  job_title: string | null;
  phone: string | null;
}

/**
 * The signed-in user's own profile fields, read fresh from the backend.
 *
 * `session.user` is a snapshot taken at login time and baked into the JWT —
 * there is no client-side `SessionProvider` in this app to refresh it, so it
 * goes stale the moment the profile changes (e.g. from the Team page's edit
 * modal, or this page's own edit form). Server components that render the
 * signed-in user's own profile (sidebar, topnav, profile page) should call
 * this instead of trusting `session.user` directly.
 */
export async function getFreshUserProfile(): Promise<FreshUserProfile | null> {
  const session = await auth();
  const token = session?.user?.accessToken;
  if (!token) return null;

  try {
    const res = await fetch(`${BASE_URL}/api/v1/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const me = await res.json();
    return {
      avatar_url: me?.avatar_url || me?.image || null,
      full_name: me?.full_name ?? null,
      job_title: me?.job_title ?? null,
      phone: me?.phone ?? null,
    };
  } catch {
    return null;
  }
}

/** @deprecated Use `getFreshUserProfile` and read `.avatar_url` — same request, more fields. */
export async function getFreshAvatarUrl(): Promise<string | null> {
  const profile = await getFreshUserProfile();
  return profile?.avatar_url ?? null;
}

export async function handleUnauthorizedResponse(response: Response): Promise<boolean> {
  if (response.status === 401) {
    try {
      await signOut({ redirect: false });
    } catch {}
    return true;
  }
  return false;
}

export async function handleForbiddenResponse(response: Response): Promise<string | null> {
  if (response.status === 403) {
    try {
      const body = await response.json();
      return body?.detail || 'Access denied.';
    } catch {
      return 'Access denied.';
    }
  }
  return null;
}
