import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getOrgMembers, getCurrentUserOrgRole } from './actions';
import { getOrganizations } from '@/lib/org-actions';
import { isOrgAdmin } from '@/lib/org-permissions';
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
  // Administering the roster — inviting, approving, changing roles — is
  // OWNER/ADMIN. A MANAGER can still *view* this page; the client hides every
  // mutating control when this is false.
  const canManageTeam = isOrgAdmin({
    roles: session.user.roles,
    orgRole: currentOrgRole ?? session.user.orgRole,
  });

  return (
    <div className="px-4 py-8 max-w-[1600px] mx-auto min-h-screen">
      <TeamPageClient
        members={members}
        currentUserId={session.user.id}
        currentOrgRole={currentOrgRole}
        currentUserRoles={session.user.roles}
        inviteCode={inviteCode}
        isSuperAdmin={canManageTeam}
      />
    </div>
  );
}
