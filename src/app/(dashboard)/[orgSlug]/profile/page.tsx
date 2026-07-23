import { auth } from '@/auth';
import { FiUser, FiMail, FiShield, FiCalendar, FiClock, FiCheckSquare, FiFileText, FiActivity, FiZap, FiBriefcase, FiUsers, FiCheckCircle } from 'react-icons/fi';
import Image from 'next/image';
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
import ProfileStats from '@/components/profile/profile-stats';
import ProfileCharts from '@/components/profile/profile-charts';
import { ActivityHeatmap } from '@/components/ui/client-charts';
import { presentOrgRole, orgRoleToneClasses, membershipStatusToneClasses } from '@/types/organization';
import type { OrgBrief } from '@/types/organization';
import React from 'react';

export default async function ProfilePage() {
  const session = await auth();
  const user = session?.user;

  if (!user) {
    return <div className="p-8 text-white">Please log in to view your profile.</div>;
  }

  const orgRole = user.orgRole ? presentOrgRole(user.orgRole) : null;

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
          <h1 className="text-4xl font-bold text-white tracking-tight">My Profile</h1>
          <p className="text-zinc-400 mt-1">Manage your account and view your performance metrics.</p>
        </div>
        <div className="text-sm text-zinc-500 bg-white/[0.03] px-4 py-2 rounded-full border border-white/5">
          {currentOrg?.name || 'Workspace'} • {new Date().toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: User Info Card */}
        <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-8">
            <div className="glass p-5 lg:p-8 rounded-3xl border border-white/5 bg-zinc-900/50 backdrop-blur-xl flex flex-col items-center text-center">
                {/* Avatar Section */}
                <div className="relative mb-4 lg:mb-6">
                    {user.image ? (
                    <div className="relative w-32 h-32 lg:w-40 lg:h-40">
                        <Image 
                            src={user.image} 
                            alt={user.name || 'User'} 
                            fill
                            className="rounded-full object-cover border-4 border-white/5 "
                        />
                    </div>
                    ) : (
                    <div className="w-32 h-32 lg:w-40 lg:h-40 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white text-4xl lg:text-5xl font-bold  border-4 border-white/5">
                        {(user.name || user.email || '?').charAt(0).toUpperCase()}
                    </div>
                    )}
                    <div className="absolute bottom-2 right-2 p-2 rounded-full bg-emerald-500 border-4 border-zinc-900 " />
                </div>

                <h2 className="text-2xl lg:text-3xl font-bold text-white mb-1">{user.name || 'User'}</h2>
                <p className="text-zinc-400 text-sm font-medium mb-4 lg:mb-6 flex items-center gap-2">
                    <FiMail className="w-4 h-4" /> {user.email}
                </p>

                {/* Org Context — replaces generic "Roles" */}
                <div className="w-full space-y-3 lg:space-y-4 pt-4 lg:pt-6 border-t border-white/5">
                    {currentOrg && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-zinc-500 flex items-center gap-2"><FiBriefcase className="w-4 h-4" /> Organization</span>
                        <span className="text-white font-bold text-xs text-right truncate max-w-[140px]">
                          {currentOrg.name}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-zinc-500 flex items-center gap-2"><FiShield className="w-4 h-4" /> Org Role</span>
                        {orgRole ? (
                          <span className={`px-2 py-0.5 rounded text-[11px] font-black uppercase tracking-wider ${orgRoleToneClasses[orgRole.tone] || 'bg-zinc-700/50 text-zinc-400 border-white/5 border'}`}>
                            {orgRole.label}
                          </span>
                        ) : (
                          <span className="text-zinc-500 text-xs">—</span>
                        )}
                    </div>
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-zinc-500 flex items-center gap-2"><FiCheckCircle className="w-4 h-4" /> Platform Role</span>
                        <div className="flex gap-1 flex-wrap justify-end">
                            {user.roles?.map(role => (
                                <span key={role} className="text-zinc-400 font-bold uppercase tracking-wider text-[10px] bg-zinc-700/30 px-1.5 py-0.5 rounded">
                                    {role.replace('_', ' ')}
                                </span>
                            )) || <span className="text-zinc-600">None</span>}
                        </div>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-zinc-500 flex items-center gap-2"><FiCalendar className="w-4 h-4" /> Member Since</span>
                        <span className="text-white font-medium text-xs">
                          {currentOrg?.joined_at ? new Date(currentOrg.joined_at).toLocaleDateString(undefined, { month: 'long', year: 'numeric' }) : '—'}
                        </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-zinc-500 flex items-center gap-2"><FiCheckSquare className="w-4 h-4" /> Workspace</span>
                        <span className="text-white font-medium text-xs">{currentOrg?.name || 'Personal'}</span>
                    </div>
                </div>

                <button className="w-full mt-6 lg:mt-8 py-2.5 lg:py-3 rounded-2xl bg-white/[0.03] border border-white/5 text-white font-semibold hover:bg-white/[0.06] transition-all hover:scale-[1.02] active:scale-95 text-sm lg:text-base">
                    Edit Profile Details
                </button>
            </div>

            {/* Organizations Membership Card */}
            {organizations.length > 0 && (
              <div className="glass p-6 rounded-3xl border border-white/5 bg-white/[0.03] space-y-4">
                <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <FiUsers className="text-emerald-400" /> My Organizations
                  <span className="text-[10px] font-bold text-text-muted ml-auto">{organizations.length}</span>
                </h4>
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {organizations.map((org) => {
                    const oRole = org.role ? presentOrgRole(org.role) : null;
                    const isCurrent = org.id === user.currentOrganizationId;
                    return (
                      <div key={org.id} className={`flex items-center gap-3 p-3 rounded-xl border ${isCurrent ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-zinc-900/30 border-white/5'}`}>
                        <div className="w-8 h-8 rounded-lg bg-foreground/[0.08] flex items-center justify-center text-xs font-black text-foreground flex-shrink-0">
                          {org.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-bold text-white truncate">{org.name}</p>
                            {isCurrent && <span className="text-[8px] font-black text-emerald-400 uppercase tracking-wider bg-emerald-500/10 px-1 py-0.5 rounded">Active</span>}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            {oRole && (
                              <span className={`text-[10px] font-black uppercase tracking-wider ${orgRoleToneClasses[oRole.tone] || 'text-zinc-400'}`}>
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
                    className="block w-full text-center py-2.5 rounded-xl border border-white/5 text-zinc-400 text-xs font-bold uppercase tracking-wider hover:bg-white/[0.03] transition-all"
                  >
                    Organization Settings
                  </Link>
                )}
              </div>
            )}

            {/* Activity Heatmap Card */}
            <div className="glass p-6 rounded-3xl border border-white/5 bg-zinc-900/50 space-y-4 overflow-hidden">
                <div className="flex justify-between items-center mb-1">
                    <h4 className="text-[11px] font-medium text-emerald-400 uppercase tracking-wider bg-emerald-500/10 px-2 py-0.5 rounded">Activity Engine</h4>
                    <span className="text-[11px] text-zinc-500 font-bold uppercase tracking-wider">History</span>
                </div>
                <ActivityHeatmap data={activityData} variant="compact" />
            </div>
        </div>

        {/* Right Column: Metrics & Content */}
        <div className="lg:col-span-8 space-y-6 lg:space-y-8">
            {/* Personalized Statistics */}
            <section className="hidden lg:block space-y-4">
                <h3 className="text-lg lg:text-xl font-bold text-white px-2 flex items-center gap-2">
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
                <h3 className="text-xl font-bold text-white px-2 flex items-center gap-2">
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
                    <h3 className="text-base lg:text-lg font-bold text-white">Critical Focus</h3>
                    <span className="text-[11px] lg:text-[11px] font-medium text-rose-400 uppercase tracking-wider bg-rose-500/10 px-2 py-0.5 rounded">High Priority</span>
                </div>
                <div className="glass p-4 lg:p-5 rounded-3xl border border-white/5 bg-zinc-900/50 space-y-3">
                    {keyTasks.length > 0 ? (
                    keyTasks.map((task: any, i: number) => (
                        <div key={i} className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.08] transition-all group cursor-pointer border-l-4 border-l-rose-500/50">
                        <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 transition-colors group-hover:bg-rose-500/20">
                            <FiZap className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-white truncate group-hover:text-rose-300 transition-colors">{task.title}</p>
                            <div className="flex items-center gap-3 mt-1 text-[11px] text-zinc-500">
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
                        <div className="py-10 text-center text-zinc-500 text-sm">No critical focus tasks detected.</div>
                    )}
                    <button className="w-full py-3 rounded-2xl border border-white/5 text-zinc-400 text-xs font-bold uppercase tracking-wider hover:bg-white/[0.03] transition-all">View Task Board</button>
                </div>
                </section>

                {/* Recent Notes */}
                <section className="space-y-3 lg:space-y-4">
                <div className="flex justify-between items-center px-2">
                    <h3 className="text-base lg:text-lg font-bold text-white">Knowledge</h3>
                    <span className="text-[11px] lg:text-[11px] font-medium text-blue-400 uppercase tracking-wider bg-blue-500/10 px-2 py-0.5 rounded">Captures</span>
                </div>
                <div className="glass p-4 lg:p-5 rounded-3xl border border-white/5 bg-zinc-900/50 space-y-3">
                    {recentNotes.length > 0 ? (
                    recentNotes.map((note: any, i: number) => (
                        <div key={i} className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.08] transition-all group cursor-pointer border-l-4 border-l-blue-500/50">
                        <div className={`p-2 rounded-xl bg-white/[0.03] ${note.color || 'text-zinc-400'}`}>
                            <FiFileText className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-white truncate group-hover:text-blue-300 transition-colors">{note.title}</p>
                            <p className="text-[11px] text-zinc-500 mt-1 uppercase tracking-wider font-medium">{note.type} • {new Date(note.updatedAt).toLocaleDateString()}</p>
                        </div>
                        </div>
                    ))
                    ) : (
                        <div className="py-10 text-center text-zinc-500 text-sm">No recent notes found.</div>
                    )}
                    <button className="w-full py-3 rounded-2xl border border-white/5 text-zinc-400 text-xs font-bold uppercase tracking-wider hover:bg-white/[0.03] transition-all">Open Notebook</button>
                </div>
                </section>
            </div>
        </div>
      </div>
    </div>
  );
}
