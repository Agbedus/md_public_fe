import { auth } from '@/auth';
import { FiClock, FiFileText, FiActivity, FiZap, FiUsers, FiCheckCircle } from 'react-icons/fi';
import Link from 'next/link';
import { 
  getSummaryStats, 
  getProductivityData, 
  getTasksOverviewData, 
  getWorkloadData, 
  getKeyTasks, 
  getRecentNotes,
  getActivityData
} from '@/app/lib/dashboard-actions';
import { getOrganizations } from '@/lib/org-actions';
import { getFreshUserProfile } from '@/lib/server-auth';
import ProfileStats from '@/components/profile/profile-stats';
import ProfileCharts from '@/components/profile/profile-charts';
import { ProfileInfoCard } from '@/components/profile/profile-info-card';
import { ActivityHeatmap } from '@/components/ui/client-charts';
import { presentOrgRole, orgRoleToneClasses, membershipStatusToneClasses } from '@/types/organization';
import type { OrgBrief } from '@/types/organization';
import React from 'react';
import { ShareButton } from '@/components/ui/sharing/share-button';

export default async function ProfilePage() {
  const session = await auth();
  const user = session?.user;

  if (!user) {
    return <div className="p-8 text-foreground">Please log in to view your profile.</div>;
  }

  const orgRole = user.orgRole ? presentOrgRole(user.orgRole) : null;

  // session.user is a login-time JWT snapshot — read live so a profile change
  // made here or from the Team page's edit modal shows up immediately.
  const freshProfile = await getFreshUserProfile();
  const avatarUrl = freshProfile?.avatar_url ?? user.image ?? null;
  const fullName = freshProfile?.full_name ?? user.name ?? null;
  const jobTitle = freshProfile?.job_title ?? null;
  const phone = freshProfile?.phone ?? null;

  // Fetch all user-specific data in parallel
  const [
    stats,
    productivityData,
    tasksOverviewData,
    workloadData,
    keyTasks,
    recentNotes,
    activityData,
    organizations
  ] = await Promise.all([
    getSummaryStats(),
    getProductivityData('7d'),
    getTasksOverviewData(),
    getWorkloadData(),
    getKeyTasks(),
    getRecentNotes(),
    getActivityData(),
    getOrganizations()
  ]);

  const currentOrg = organizations.find(o => o.id === user.currentOrganizationId);
  const otherOrgs = organizations.filter(o => o.id !== user.currentOrganizationId);

  return (
    <div className="px-4 py-6 md:py-8 max-w-[1600px] mx-auto min-h-screen space-y-6 md:space-y-8 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-2">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2 tracking-tight">My Profile</h1>
          <p className="text-text-muted text-sm">Manage your account and view your performance.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ShareButton sourceSurface="user_profile" />
          <div className="text-sm text-text-muted bg-foreground/[0.03] px-4 py-2.5 rounded-lg border border-card-border">
            {currentOrg?.name || 'Workspace'} • {new Date().toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: User Info Card */}
        <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-8">
            <ProfileInfoCard
              email={user.email || ''}
              fullName={fullName}
              jobTitle={jobTitle}
              phone={phone}
              avatarUrl={avatarUrl}
              platformRoles={user.roles}
              orgRole={orgRole}
              currentOrg={currentOrg ? { name: currentOrg.name, joined_at: currentOrg.joined_at } : null}
            />

            {/* Organizations Membership Card */}
            {organizations.length > 0 && (
              <div className="glass p-6 rounded-3xl border border-foreground/5 bg-foreground/[0.03] space-y-4">
                <h4 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                  <FiUsers className="text-emerald-400" /> My Organizations
                  <span className="text-[10px] font-bold text-text-muted ml-auto">{organizations.length}</span>
                </h4>
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {organizations.map((org) => {
                    const oRole = org.role ? presentOrgRole(org.role) : null;
                    const isCurrent = org.id === user.currentOrganizationId;
                    return (
                      <div key={org.id} className={`flex items-center gap-3 p-3 rounded-xl border ${isCurrent ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-foreground/[0.03] border-foreground/5'}`}>
                        <div className="w-8 h-8 rounded-lg bg-foreground/[0.08] flex items-center justify-center text-xs font-black text-foreground flex-shrink-0">
                          {org.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-bold text-foreground truncate">{org.name}</p>
                            {isCurrent && <span className="text-[8px] font-black text-emerald-400 uppercase tracking-wider bg-emerald-500/10 px-1 py-0.5 rounded">Active</span>}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            {oRole && (
                              <span className={`text-[10px] font-black uppercase tracking-wider ${orgRoleToneClasses[oRole.tone] || 'text-text-muted'}`}>
                                {oRole.label}
                              </span>
                            )}
                            {org.membershipStatus && (
                              <span className={`text-[9px] font-bold uppercase tracking-wider ${membershipStatusToneClasses[org.membershipStatus] || ''}`}>
                                {org.membershipStatus}
                              </span>
                            )}
                          </div>
                        </div>
                        {isCurrent && <FiCheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />}
                      </div>
                    );
                  })}
                </div>
                {currentOrg && user.orgSlug && (
                  <Link 
                    href={`/${user.orgSlug}/settings`}
                    className="block w-full text-center py-2.5 rounded-xl border border-foreground/5 text-text-muted text-xs font-bold uppercase tracking-wider hover:bg-foreground/[0.03] transition-all"
                  >
                    Organization Settings
                  </Link>
                )}
              </div>
            )}

            {/* Activity Heatmap Card */}
            <div className="glass p-6 rounded-3xl border border-foreground/5 bg-foreground/[0.03] space-y-4 overflow-hidden">
                <div className="flex justify-between items-center mb-1">
                    <h4 className="text-[11px] font-medium text-emerald-400 uppercase tracking-wider bg-emerald-500/10 px-2 py-0.5 rounded">Activity Engine</h4>
                    <span className="text-[11px] text-text-muted font-bold uppercase tracking-wider">History</span>
                </div>
                <ActivityHeatmap data={activityData} variant="compact" />
            </div>
        </div>

        {/* Right Column: Metrics & Content */}
        <div className="lg:col-span-8 space-y-6 lg:space-y-8">
            {/* Personalized Statistics */}
            <section className="hidden lg:block space-y-4">
                <h3 className="text-lg lg:text-xl font-bold text-foreground px-2 flex items-center gap-2">
                    <FiActivity className="text-emerald-400" /> Performance Overview
                </h3>
                <ProfileStats stats={{
                    totalTasks: stats.totalTasks,
                    completedTasks: stats.completedTasks,
                    pendingTasks: stats.pendingTasks,
                    totalProjects: stats.totalProjects,
                    totalNotes: stats.totalNotes
                }} />
            </section>

            {/* Analytics & Charts */}
            <section className="hidden lg:block space-y-4">
                <h3 className="text-xl font-bold text-foreground px-2 flex items-center gap-2">
                    <FiZap className="text-amber-400" /> Productivity Metrics
                </h3>
                <ProfileCharts 
                    productivityData={productivityData}
                    tasksOverviewData={tasksOverviewData}
                    workloadData={workloadData}
                />
            </section>

            {/* Activity Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* High Priority Tasks */}
                <section className="space-y-3 lg:space-y-4">
                <div className="flex justify-between items-center px-2">
                    <h3 className="text-base lg:text-lg font-bold text-foreground">Critical Focus</h3>
                    <span className="text-[11px] lg:text-[11px] font-medium text-rose-400 uppercase tracking-wider bg-rose-500/10 px-2 py-0.5 rounded">High Priority</span>
                </div>
                <div className="glass p-4 lg:p-5 rounded-3xl border border-foreground/5 bg-foreground/[0.03] space-y-3">
                    {keyTasks.length > 0 ? (
                    keyTasks.map((task: any, i: number) => (
                        <div key={i} className="flex items-center gap-4 p-4 rounded-2xl bg-foreground/[0.03] border border-foreground/5 hover:bg-foreground/[0.08] transition-all group cursor-pointer border-l-4 border-l-rose-500/50">
                        <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 transition-colors group-hover:bg-rose-500/20">
                            <FiZap className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-foreground truncate group-hover:text-rose-300 transition-colors">{task.title}</p>
                            <div className="flex items-center gap-3 mt-1 text-[11px] text-text-muted">
                                <span className="flex items-center gap-1">
                                    <FiClock className="w-3 h-3" /> {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date'}
                                </span>
                                <span className="flex items-center gap-1">
                                    <FiActivity className="w-3 h-3" /> {task.status}
                                </span>
                            </div>
                        </div>
                        </div>
                    ))
                    ) : (
                        <div className="py-10 text-center text-text-muted text-sm">No critical focus tasks detected.</div>
                    )}
                    <button className="w-full py-3 rounded-2xl border border-foreground/5 text-text-muted text-xs font-bold uppercase tracking-wider hover:bg-foreground/[0.03] transition-all">View Task Board</button>
                </div>
                </section>

                {/* Recent Notes */}
                <section className="space-y-3 lg:space-y-4">
                <div className="flex justify-between items-center px-2">
                    <h3 className="text-base lg:text-lg font-bold text-foreground">Knowledge</h3>
                    <span className="text-[11px] lg:text-[11px] font-medium text-blue-400 uppercase tracking-wider bg-blue-500/10 px-2 py-0.5 rounded">Captures</span>
                </div>
                <div className="glass p-4 lg:p-5 rounded-3xl border border-foreground/5 bg-foreground/[0.03] space-y-3">
                    {recentNotes.length > 0 ? (
                    recentNotes.map((note: any, i: number) => (
                        <div key={i} className="flex items-center gap-4 p-4 rounded-2xl bg-foreground/[0.03] border border-foreground/5 hover:bg-foreground/[0.08] transition-all group cursor-pointer border-l-4 border-l-blue-500/50">
                        <div className={`p-2 rounded-xl bg-foreground/[0.03] ${note.color || 'text-text-muted'}`}>
                            <FiFileText className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-foreground truncate group-hover:text-blue-300 transition-colors">{note.title}</p>
                            <p className="text-[11px] text-text-muted mt-1 uppercase tracking-wider font-medium">{note.type} • {new Date(note.updatedAt).toLocaleDateString()}</p>
                        </div>
                        </div>
                    ))
                    ) : (
                        <div className="py-10 text-center text-text-muted text-sm">No recent notes found.</div>
                    )}
                    <button className="w-full py-3 rounded-2xl border border-foreground/5 text-text-muted text-xs font-bold uppercase tracking-wider hover:bg-foreground/[0.03] transition-all">Open Notebook</button>
                </div>
                </section>
            </div>
        </div>
      </div>
    </div>
  );
}
