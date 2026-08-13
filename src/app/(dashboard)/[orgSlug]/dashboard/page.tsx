import { Suspense } from 'react';
import { auth } from '@/auth';
import { 
  SummaryStatsSection,
  ProductivitySection, 
  StatsOverviewSection, 
  WorkloadSection, 
  TimeAllocationSection, 
  ProjectProgressSection,
  KeyTasksSection, 
  RecentNotesSection, 
  PrioritiesSection, 
  UnitLoadSection,
  PriorityMatrixSection,
  TemporalBurnRateSection,
  CriticalBottlenecksSection,
  OperationVelocitySection,
  AttendanceStatusSection,
  UserStatSection,
} from '@/components/dashboard/sections';
import { ChartSkeleton, ListSkeleton, CardSkeleton, SummarySkeleton } from '@/components/dashboard/skeletons';
import WorkspaceOnboarding from '@/components/dashboard/workspace-onboarding';
import { getOrganizations, getWorkspaceOnboardingStatus } from '@/lib/org-actions';

export default async function Home({ searchParams, params }: { searchParams: Promise<{ range?: string }>; params: Promise<{ orgSlug: string }> }) {
  const rangeParams = await searchParams;
  const route = await params;
  const session = await auth();
  
  if (!session?.user?.id) {
    return (
      <div className="px-4 py-8 max-w-[1600px] mx-auto">
        <div className="bg-card p-6 rounded-2xl text-center border border-card-border">
          <h2 className="text-xl font-bold text-foreground mb-2">Please log in</h2>
          <p className="text-text-muted">You need to be logged in to view the dashboard.</p>
        </div>
      </div>
    );
  }

  // Greet by first name only — "Good morning, Yaw" reads like a colleague,
  // "Good morning, Yaw Donkor Mensah" reads like a form letter.
  const firstName = (session.user.name || '').trim().split(/\s+/)[0] || 'there';
  const organizations = await getOrganizations();
  const currentOrganization = organizations.find(org => org.slug === route.orgSlug);
  const onboardingStatus = currentOrganization
    ? await getWorkspaceOnboardingStatus(currentOrganization.id)
    : { workspace: true, invite: false, office: false, attendance_policy: false, first_work: false };
  
  // Determine greeting based on time
  const hour = new Date().getHours();
  let greeting = 'Good morning';
  if (hour >= 12 && hour < 18) greeting = 'Good afternoon';
  else if (hour >= 18) greeting = 'Good evening';

  return (
    <div className="px-4 py-8 max-w-[1600px] mx-auto">
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-foreground mb-2 tracking-tight">{greeting}, {firstName}</h1>
        <p className="text-text-muted text-sm lg:text-base">Here&apos;s what&apos;s happening across your organization today.</p>
      </div>

      {currentOrganization?.slug && (
        <WorkspaceOnboarding
          organizationId={currentOrganization.id}
          orgSlug={currentOrganization.slug}
          role={currentOrganization.role}
          initialMemberCount={currentOrganization.member_count || 1}
          inviteDismissed={!!currentOrganization.onboarding_invite_dismissed_at}
          checklistDismissed={!!currentOrganization.onboarding_checklist_dismissed_at}
          status={onboardingStatus}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Summary Stats */}
        <Suspense fallback={<SummarySkeleton />}>
            <SummaryStatsSection />
        </Suspense>

        {/* Row 1 */}
        <Suspense fallback={<div className="col-span-1 lg:col-span-6 h-96"><ChartSkeleton /></div>}>
            <ProductivitySection range={rangeParams.range} />
        </Suspense>

        <Suspense fallback={<div className="col-span-1 lg:col-span-3 h-96"><CardSkeleton /></div>}>
            <StatsOverviewSection />
        </Suspense>

        <Suspense fallback={<div className="col-span-1 lg:col-span-3 h-96"><ChartSkeleton /></div>}>
            <WorkloadSection />
        </Suspense>

        {/* Row 2 */}
        <Suspense fallback={<div className="col-span-1 lg:col-span-5 h-96"><ChartSkeleton /></div>}>
            <ProjectProgressSection />
        </Suspense>

        <Suspense fallback={<div className="col-span-1 lg:col-span-4 h-96"><ChartSkeleton /></div>}>
            <TimeAllocationSection />
        </Suspense>

        <Suspense fallback={<div className="col-span-1 lg:col-span-3 h-96"><ListSkeleton /></div>}>
            <KeyTasksSection />
        </Suspense>

        {/* Row 3 */}
        <Suspense fallback={<div className="col-span-1 lg:col-span-6 h-96"><ListSkeleton /></div>}>
            <RecentNotesSection />
        </Suspense>

        <Suspense fallback={<div className="col-span-1 lg:col-span-3 h-96"><CardSkeleton /></div>}>
             <PrioritiesSection />
        </Suspense>

        <Suspense fallback={<div className="col-span-1 lg:col-span-3 h-96"><CardSkeleton /></div>}>
            <AttendanceStatusSection />
        </Suspense>

        <Suspense fallback={<div className="col-span-1 lg:col-span-4 h-96"><CardSkeleton /></div>}>
            <UserStatSection />
        </Suspense>

        {/* Row 4 — Tactical Insights */}
        <Suspense fallback={<div className="col-span-1 lg:col-span-4 h-96"><ListSkeleton /></div>}>
            <UnitLoadSection />
        </Suspense>

        <Suspense fallback={<div className="col-span-1 lg:col-span-4 h-96"><ChartSkeleton /></div>}>
            <PriorityMatrixSection />
        </Suspense>

        <Suspense fallback={<div className="col-span-1 lg:col-span-4 h-96"><CardSkeleton /></div>}>
            <TemporalBurnRateSection />
        </Suspense>

        {/* Row 5 — Operations Intel */}
        <Suspense fallback={<div className="col-span-1 lg:col-span-4 h-96"><ListSkeleton /></div>}>
            <CriticalBottlenecksSection />
        </Suspense>

        <Suspense fallback={<div className="col-span-1 lg:col-span-4 h-96"><ChartSkeleton /></div>}>
            <OperationVelocitySection />
        </Suspense>

      </div>
    </div>
  );
}
