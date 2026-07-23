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

export default async function Home({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const params = await searchParams;
  const session = await auth();
  
  if (!session?.user?.id) {
    return (
      <div className="px-4 py-8 max-w-[1600px] mx-auto">
        <div className="glass p-6 rounded-2xl text-center">
          <h2 className="text-xl font-bold text-white mb-2">Please log in</h2>
          <p className="text-zinc-400">You need to be logged in to view the dashboard.</p>
        </div>
      </div>
    );
  }

  const userName = session.user.name || 'User';
  
  // Determine greeting based on time
  const hour = new Date().getHours();
  let greeting = 'Good morning';
  if (hour >= 12 && hour < 18) greeting = 'Good afternoon';
  else if (hour >= 18) greeting = 'Good evening';

  return (
    <div className="px-4 py-8 max-w-[1600px] mx-auto">
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-foreground mb-2 tracking-tight">{greeting}, {userName}</h1>
        <p className="text-(--text-muted) text-sm lg:text-lg font-bold uppercase tracking-tight">Operational intelligence dashboard</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Summary Stats */}
        <Suspense fallback={<SummarySkeleton />}>
            <SummaryStatsSection />
        </Suspense>

        {/* Row 1 */}
        <Suspense fallback={<div className="col-span-1 lg:col-span-6 h-96"><ChartSkeleton /></div>}>
            <ProductivitySection range={params.range} />
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