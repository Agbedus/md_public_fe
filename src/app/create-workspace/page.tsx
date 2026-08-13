import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import CreateWorkspaceForm from '@/components/ui/create-workspace-form';

export default async function CreateWorkspacePage() {
  if (!(await auth())) redirect('/login?callbackUrl=/create-workspace');
  return <CreateWorkspaceForm />;
}
