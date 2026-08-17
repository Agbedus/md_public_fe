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
    <div className="mx-auto min-h-[calc(100dvh-8rem)] max-w-[1600px] px-3 py-4 sm:px-4 md:min-h-screen md:py-8">
      <UsersPageClient initialUsers={allUsers} currentUser={session?.user} timeOffRequests={timeOffRequests} />
    </div>
  );
}
