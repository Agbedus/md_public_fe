import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getTimeOffRequests } from '@/app/(dashboard)/[orgSlug]/time-off/actions';
import { getUsersSafe } from '@/app/(dashboard)/[orgSlug]/users/actions';
import { canManageOrg } from '@/lib/org-permissions';
import { orgPath } from '@/lib/org-path';
import TimeOffAdminClient from '@/components/ui/time-off/time-off-admin-client';

export default async function TimeOffPage({ params }: { params: Promise<{ orgSlug: string }> }) {
    const { orgSlug } = await params;
    const session = await auth();

    // Org OWNER/ADMIN administer time off for their own org, matching what the
    // sidebar offers and what the backend now allows. Previously this was
    // global super_admin only, so org owners saw the link and were bounced.
    if (!canManageOrg({ roles: session?.user?.roles, orgRole: session?.user?.orgRole })) {
        redirect(orgPath(orgSlug, 'dashboard'));
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
