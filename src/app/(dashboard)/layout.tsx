import Sidebar from "@/components/ui/sidebar";
import TopNav from "@/components/ui/topnav";
import DashboardLayout from "@/components/ui/dashboard-layout";
import { auth, signOut } from "@/auth";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getOrganizations } from "@/lib/org-actions";
import type { OrgBrief } from "@/types/organization";

const BASE_URL = process.env.BASE_URL_LOCAL || process.env.BASE_URL_PRODUCTION || "http://127.0.0.1:8000";

export default async function DashboardRouteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  if (!session.user.currentOrganizationId) {
    redirect("/no-organization");
  }

  const token = session?.user?.accessToken;
  if (token) {
    try {
      const res = await fetch(`${BASE_URL}/api/v1/users/me`, {
        headers: { 'Authorization': `Bearer ${token}` },
        cache: 'no-store',
      });
      if (!res.ok) {
        await signOut({ redirectTo: '/login' });
      }
    } catch {
      await signOut({ redirectTo: '/login' });
    }
  }

  let organizations: OrgBrief[] = [];
  try {
    organizations = await getOrganizations();
  } catch {
    // Silently fail — the sidebar will render without org switcher
  }

  const orgSlug = session.user.orgSlug;
  if (orgSlug) {
    try {
      const cookieStore = await cookies();
      cookieStore.set('org_slug', orgSlug, {
        path: '/',
        maxAge: 60 * 60 * 24 * 365,
        sameSite: 'lax',
      });
    } catch {}
  }

  return (
    <DashboardLayout 
      sidebar={<Sidebar user={session.user} organizations={organizations} currentOrgId={session.user.currentOrganizationId} orgSlug={orgSlug} />}
      topnav={<TopNav user={session.user} orgSlug={orgSlug} organizations={organizations} currentOrgId={session.user.currentOrganizationId} />}
      user={session.user}
      orgSlug={orgSlug}
    >
      {children}
    </DashboardLayout>
  );
}
