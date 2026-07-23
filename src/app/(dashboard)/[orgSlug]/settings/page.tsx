import { auth } from "@/auth";
import SettingsForm from "@/components/ui/settings-form";

export default async function SettingsPage() {
  const session = await auth();
  return <SettingsForm user={session?.user} />;
}
