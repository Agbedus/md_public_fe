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

export default async function AttendancePage() {
    const session = await auth();
    if (!session?.user?.id) redirect('/login');

    const roles = session.user.roles || [];
    const isManager = roles.some((r: string) => ['manager', 'super_admin'].includes(r));
    const isAdmin = roles.includes('super_admin');

    const [myToday, myHistory, users] = await Promise.all([
        getMyAttendanceToday(),
        getMyAttendanceHistory(),
        getUsersSafe(),
    ]);

    // Conditionally fetch manager/admin data
    const teamToday = isManager ? await getTeamAttendanceToday() : [];
    const teamHistory = isAdmin ? await getTeamAttendanceHistory() : [];
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
                currentUserId={session.user.id}
            />
        </div>
    );
}
