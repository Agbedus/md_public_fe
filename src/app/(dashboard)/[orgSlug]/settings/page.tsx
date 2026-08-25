import { auth } from "@/auth";
import { getFreshUserProfile } from "@/lib/server-auth";
import { getOrganizationDetails } from "@/lib/org-actions";
import { isOrgAdmin } from "@/lib/org-permissions";
import SettingsTabs from "@/components/ui/settings-tabs";

export default async function SettingsPage() {
  const session = await auth();
  const user = session?.user;

  const canManageOrg = isOrgAdmin({ roles: user?.roles, orgRole: user?.orgRole });
  const orgId = user?.currentOrganizationId;

  const [profile, organization] = await Promise.all([
    getFreshUserProfile(),
    canManageOrg && orgId ? getOrganizationDetails(orgId) : Promise.resolve(null),
  ]);

  return (
    <SettingsTabs
      user={user}
      phone={profile?.phone ?? null}
      initialSmsEnabled={profile?.sms_notifications_enabled ?? false}
      canManageOrg={canManageOrg}
      organization={organization}
    />
  );
}
