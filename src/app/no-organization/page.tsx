import { auth, signOut } from '@/auth';
import { redirect } from 'next/navigation';
import { getOrganizations } from '@/lib/org-actions';
import NoOrgPageClient from './no-org-page-client';

export default async function NoOrganizationPage() {
  const session = await auth();
  if (!session) {
    redirect('/login');
  }

  if (session.user.currentOrganizationId) {
    redirect('/dashboard');
  }

  const organizations = await getOrganizations();

  if (organizations.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="max-w-md text-center space-y-6 px-6">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-foreground/[0.05] flex items-center justify-center">
            <svg className="w-8 h-8 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-foreground">No Organization Found</h1>
          <p className="text-text-muted leading-relaxed">
            You are not a member of any organization yet. Contact your admin to get invited, or check back later.
          </p>
          <form action={async () => {
            'use server';
            await signOut({ redirectTo: '/login' });
          }}>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-foreground text-background font-medium hover:opacity-90 transition-opacity"
            >
              Sign Out
            </button>
          </form>
        </div>
      </div>
    );
  }

  return <NoOrgPageClient organizations={organizations} />;
}
