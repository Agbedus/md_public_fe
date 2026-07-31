import ClientsPageClient from '@/components/ui/clients/clients-page-client';
import { getPermissionSubject } from '@/lib/permission-subject';
import { canCreate } from '@/lib/org-permissions';
import { orgRoleAtLeast } from '@/lib/org-permissions';

export default async function ClientsPage() {
  const subject = await getPermissionSubject();

  // Creating a client is a MANAGER-tier action on the backend
  // (`get_current_org_manager`), unlike most resources where MEMBER can create.
  // Members can still read the list.
  const canCreateClient =
    canCreate(subject) && orgRoleAtLeast(subject?.orgRole, 'manager');

  return (
    <div className="px-4 py-8 max-w-[1600px] mx-auto min-h-screen">
      <ClientsPageClient subject={subject} canCreateClient={canCreateClient} />
    </div>
  );
}
