import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import {
    getMyAttendanceToday,
    getMyAttendanceHistory,
    getTeamAttendanceToday,
    getTeamAttendanceHistory,
    getOfficeLocations,
} from '@/app/(dashboard)/[orgSlug]/attendance/actions';
import { getUsersSafe } from '@/app/(dashboard)/[orgSlug]/users/actions';
import AttendancePageClient from '@/components/ui/attendance/attendance-page-client';
import { canReadAll, isOrgAdmin, isPlatformAdmin } from '@/lib/org-permissions';
import { cookies } from 'next/headers';
import { getOrganizations } from '@/lib/org-actions';
import { getFreshAvatarUrl } from '@/lib/server-auth';
import type { OrgBrief } from '@/types/organization';

export default async function AttendancePage() {
    const session = await auth();
    if (!session?.user?.id) redirect('/login');

    const cartoApiLink = process.env.CARTO_API_LINK?.trim();

    const subject = { roles: session.user.roles, orgRole: session.user.orgRole };

    // Seeing the team's presence is a visibility concern, so it sits at the
    // read-all tier (MANAGER and above) — matching `get_current_org_manager` on
    // /attendance/team/today. Configuring office locations and policies is
    // administration, so it stays at OWNER/ADMIN.
    const isManager = canReadAll(subject);
    const isAdmin = isOrgAdmin(subject);

    // The raw-record history endpoint is /attendance/admin/all-records, which is
    // guarded by RoleChecker([SUPER_ADMIN]) — a platform surface, not an org
    // one. Gating it on org admin only produced 403s.
    const canReadRawRecords = isPlatformAdmin(session.user.roles);

    const cookieStore = await cookies();
    const currentOrgId = cookieStore.get('current_organization_id')?.value || session.user.currentOrganizationId;

    const [myToday, myHistory, users, organizations, avatarUrl] = await Promise.all([
        getMyAttendanceToday(),
        getMyAttendanceHistory(),
        getUsersSafe(),
        getOrganizations().catch(() => [] as OrgBrief[]),
        getFreshAvatarUrl(),
    ]);

    // Faces for the map markers: you, and the organization at the office.
    const currentOrg = organizations.find((org) => org.id === currentOrgId);
    const me = { name: session.user.name || session.user.email || 'You', imageUrl: avatarUrl ?? session.user.image ?? null };
    const organization = { name: currentOrg?.name || 'Office', imageUrl: currentOrg?.logo_url ?? null };

    // Conditionally fetch manager/admin data. Team *history* is a MANAGER-tier
    // read (matching get_current_org_manager on /attendance/{user_id}/history),
    // not a platform-SUPER_ADMIN-only one — canReadRawRecords only decides
    // whether getTeamAttendanceHistory() takes the fast /admin/all-records path
    // or the per-user fallback, it never gated *whether* to fetch at all.
    const teamToday = isManager ? await getTeamAttendanceToday() : [];
    const teamHistory = isManager ? await getTeamAttendanceHistory() : [];
    const officeLocations = isManager ? await getOfficeLocations() : [];

    return (
        <div className="mx-auto min-h-[calc(100dvh-8rem)] max-w-[1600px] px-3 py-4 sm:px-4 md:min-h-screen md:py-8">
            <AttendancePageClient
                myToday={myToday}
                myHistory={myHistory}
                teamToday={teamToday}
                teamHistory={teamHistory}
                officeLocations={officeLocations}
                users={users}
                isManager={isManager}
                isAdmin={isAdmin}
                canReadRawRecords={canReadRawRecords}
                currentUserId={session.user.id}
                cartoApiLink={cartoApiLink}
                me={me}
                organization={organization}
            />
        </div>
    );
}
