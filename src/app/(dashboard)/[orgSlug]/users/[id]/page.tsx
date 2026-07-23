import { notFound } from 'next/navigation';
import { getUsersSafe, getUserTimeLogs } from '@/app/(dashboard)/[orgSlug]/users/actions';
import { getTasks } from '@/app/(dashboard)/[orgSlug]/tasks/actions';
import { getTimeOffRequests } from '@/app/(dashboard)/[orgSlug]/time-off/actions';
import { getActivityData } from '@/app/lib/dashboard-actions';
import { auth } from '@/auth';
import UserDetailClient from '@/components/ui/users/user-detail-client';

interface UserDetailPageProps {
    params: Promise<{ id: string }>;
}

export default async function UserDetailPage({ params }: UserDetailPageProps) {
    const { id } = await params;

    const [allUsers, allTasks, timeLogs, timeOffRequests, activityData, session] = await Promise.all([
        getUsersSafe(),
        getTasks(),
        getUserTimeLogs(id),
        getTimeOffRequests(),
        getActivityData(id),
        auth(),
    ]);

    const user = allUsers.find((u: any) => u.id === id);
    if (!user) return notFound();

    const assignedTasks = allTasks.filter((t: any) =>
        t.assigneeIds?.includes(id) || t.userId === id
    );

    // Filter time-off for this user
    const userTimeOff = timeOffRequests.filter(r => r.user_id === id);

    const currentUserRoles = session?.user?.roles || [];
    const isSuperAdmin = currentUserRoles.includes('super_admin');

    return (
        <div className="px-4 py-8 max-w-[1600px] mx-auto min-h-screen">
            <UserDetailClient
                user={user}
                tasks={assignedTasks}
                timeLogs={timeLogs}
                timeOffRequests={userTimeOff}
                activityData={activityData}
                isSuperAdmin={isSuperAdmin}
            />
        </div>
    );
}
