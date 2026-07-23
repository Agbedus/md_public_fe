import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getOrgMembers, getCurrentUserOrgRole } from './actions';
import { getOrganizations } from '@/lib/org-actions';
import TeamPageClient from '@/components/ui/team/team-page-client';

export default async function TeamPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const [members, currentOrgRole, orgs] = await Promise.all([
    getOrgMembers(),
    getCurrentUserOrgRole(),
    getOrganizations(),
  ]);

  const currentOrg = orgs.find(o => o.id === session.user.currentOrganizationId);
  const inviteCode = currentOrg?.invite_code ?? null;
  const isSuperAdmin = !!(session.user as any).roles?.includes('super_admin');

  return (
    <div className="px-4 py-8 max-w-[1600px] mx-auto min-h-screen">
      <TeamPageClient
        members={members}
        currentUserId={session.user.id}
        currentOrgRole={currentOrgRole}
        inviteCode={inviteCode}
        isSuperAdmin={isSuperAdmin}
      />
    </div>
  );
}
