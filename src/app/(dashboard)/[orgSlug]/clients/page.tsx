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
    <div className="mx-auto min-h-[calc(100dvh-8rem)] max-w-[1600px] px-3 py-4 sm:px-4 md:min-h-screen md:py-8">
      <ClientsPageClient subject={subject} canCreateClient={canCreateClient} />
    </div>
  );
}
