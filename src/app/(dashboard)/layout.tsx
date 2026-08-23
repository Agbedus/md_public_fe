import Sidebar from "@/components/ui/sidebar";
import TopNav from "@/components/ui/topnav";
import DashboardLayout from "@/components/ui/dashboard-layout";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getOrganizations, getWorkspaceOnboardingStatus } from "@/lib/org-actions";
import { getFreshAvatarUrl } from "@/lib/server-auth";
import type { OrgBrief } from "@/types/organization";
import type { Metadata } from "next";
import { privatePageMetadata } from "@/lib/seo";
import { LocationProvider } from '@/providers/location-provider';
import { getMyAttendanceToday } from '@/app/(dashboard)/[orgSlug]/attendance/actions';

const BASE_URL = process.env.BASE_URL_LOCAL || process.env.BASE_URL_PRODUCTION || "http://127.0.0.1:8000";

export const metadata: Metadata = {
  ...privatePageMetadata,
  title: "Workspace",
};

export default async function DashboardRouteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) {
    redirect('/logout');
  }

  const cookieStore = await cookies();
  const selectedOrganizationId = cookieStore.get('current_organization_id')?.value || session.user.currentOrganizationId;

  if (!selectedOrganizationId) {
    redirect("/no-organization");
  }

  const token = session?.user?.accessToken;
  if (token) {
    let isSessionValid = false;
    try {
      const res = await fetch(`${BASE_URL}/api/v1/users/me`, {
        headers: { 'Authorization': `Bearer ${token}` },
        cache: 'no-store',
      });
      isSessionValid = res.ok;
    } catch {}

    if (!isSessionValid) redirect('/logout');
  }

  // Fetch independent dashboard chrome data together. The attendance snapshot
  // now lives at the workspace boundary instead of the root application layout,
  // so public routes do not pay for it and a workspace change gets isolated state.
  const [organizations, freshAvatarUrl, initialAttendance] = await Promise.all([
    getOrganizations().catch(() => [] as OrgBrief[]),
    getFreshAvatarUrl(),
    getMyAttendanceToday(),
  ]);

  // session.user.image is a login-time snapshot baked into the JWT. Overlay the
  // live value so an avatar changed from the Team page (or Profile) shows up
  // without forcing a re-login.
  const chromeUser = { ...session.user, image: freshAvatarUrl ?? session.user.image };

  const selectedOrganization = organizations.find(org => org.id === selectedOrganizationId);
  const orgSlug = selectedOrganization?.slug || session.user.orgSlug;
  const normalizedRole = selectedOrganization?.role?.toLowerCase();
  const canInvite = normalizedRole === 'owner' || normalizedRole === 'admin';
  const onboardingStatus = selectedOrganization && canInvite && (selectedOrganization.member_count ?? 1) <= 1
    ? await getWorkspaceOnboardingStatus(selectedOrganization.id)
    : null;
  const isOnboardingTourBlocked = Boolean(onboardingStatus && !onboardingStatus.invite);

  return (
    <LocationProvider
      key={selectedOrganizationId}
      initialRecord={initialAttendance}
      workspaceScope={orgSlug || selectedOrganizationId}
    >
      <DashboardLayout
        sidebar={<Sidebar user={chromeUser} organizations={organizations} currentOrgId={selectedOrganizationId} orgSlug={orgSlug} />}
        topnav={<TopNav user={chromeUser} orgSlug={orgSlug} organizations={organizations} currentOrgId={selectedOrganizationId} />}
        user={chromeUser}
        orgSlug={orgSlug}
        workspaceId={selectedOrganizationId}
        isOnboardingTourBlocked={isOnboardingTourBlocked}
      >
        {children}
      </DashboardLayout>
    </LocationProvider>
  );
}
