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
