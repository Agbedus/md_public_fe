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

export default async function AttendancePage() {
    const session = await auth();
    if (!session?.user?.id) redirect('/login');

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

    const [myToday, myHistory, users] = await Promise.all([
        getMyAttendanceToday(),
        getMyAttendanceHistory(),
        getUsersSafe(),
    ]);

    // Conditionally fetch manager/admin data
    const teamToday = isManager ? await getTeamAttendanceToday() : [];
    const teamHistory = canReadRawRecords ? await getTeamAttendanceHistory() : [];
    const officeLocations = isManager ? await getOfficeLocations() : [];

    return (
        <div className="px-4 py-8 max-w-[1600px] mx-auto min-h-screen">
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
            />
        </div>
    );
}
