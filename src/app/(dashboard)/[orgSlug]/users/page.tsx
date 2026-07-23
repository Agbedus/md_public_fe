import UsersPageClient from '@/components/ui/users/users-page-client';
import { auth } from '@/auth';
import { getUsers } from './actions';
import { getTimeOffRequests } from '@/app/(dashboard)/[orgSlug]/time-off/actions';

export default async function UsersPage() {
  const [session, allUsers, timeOffRequests] = await Promise.all([
    auth(),
    getUsers(),
    getTimeOffRequests(),
  ]);
  
  return (
    <div className="px-4 py-8 max-w-[1600px] mx-auto min-h-screen">
      <UsersPageClient initialUsers={allUsers} currentUser={session?.user} timeOffRequests={timeOffRequests} />
    </div>
  );
}
