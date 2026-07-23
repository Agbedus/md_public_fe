import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getTimeOffRequests } from '@/app/(dashboard)/[orgSlug]/time-off/actions';
import { getUsersSafe } from '@/app/(dashboard)/[orgSlug]/users/actions';
import TimeOffAdminClient from '@/components/ui/time-off/time-off-admin-client';

export default async function TimeOffPage() {
    const session = await auth();
    const roles = session?.user?.roles || [];

    if (!roles.includes('super_admin')) {
        redirect('/');
    }

    const [timeOffRequests, users] = await Promise.all([
        getTimeOffRequests(),
        getUsersSafe(),
    ]);

    return (
        <div className="px-4 py-8 max-w-[1600px] mx-auto min-h-screen">
            <TimeOffAdminClient
                initialRequests={timeOffRequests}
                users={users}
            />
        </div>
    );
}
