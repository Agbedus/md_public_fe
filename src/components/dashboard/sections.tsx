import React from "react";
import Image from "next/image";
import {
  getProductivityData,
  getTasksOverviewData,
  getWorkloadData,
  getTimeAllocationData,
  getKeyTasks,
  getRecentNotes,
  getRecentDecisions,
  getProjectsOverviewData,
  getProjectProgressData,
  getAIPriorities,
  getSummaryStats,
  getUnitLoadDistribution,
  getPriorityMatrix,
  getTemporalBurnRate,
  getCriticalBottlenecks,
  getOperationVelocity,
} from "@/app/lib/dashboard-actions";
import { RangeFilter } from "./range-filter";
import { NoteStack } from "./note-stack";
import { AttendanceStack } from "./attendance-stack";
import {
  ProductivityChart,
  TasksChart,
  WorkloadChart,
  TimeAllocationChart,
  ProjectProgressChart,
  VelocityChart,
} from "@/components/ui/client-charts";
import { 
  presenceStateColors, 
  attendanceStateColors, 
  presenceStateLabels, 
  attendanceStateLabels 
} from "@/types/attendance";
import { Sparkline } from "@/components/ui/sparkline";
import {
  FiMoreHorizontal,
  FiZap,
  FiFileText,
  FiPlus,
  FiClock,
  FiCpu,
  FiArrowRight,
  FiArrowUp,
  FiArrowDown,
  FiCheckCircle,
  FiAlertCircle,
  FiCheckSquare,
  FiCalendar,
  FiActivity,
  FiUsers,
  FiMapPin,
  FiAlertTriangle,
  FiTrendingUp,
  FiTarget,
  FiShield,
  FiRadio,
} from "react-icons/fi";

const AvatarGroup = ({ users, total }: { users: any[], total: number }) => {
    return (
        <div className="flex -space-x-2 overflow-hidden">
            {users.map((user, i) => (
                <div key={i} className="inline-block h-8 w-8 rounded-full ring-2 ring-background bg-background/50 border border-card-border overflow-hidden relative">
                    {user.image ? (
                        <Image src={user.image} alt={user.name} fill className="object-cover" />
                    ) : (
                        <div className="h-full w-full flex items-center justify-center text-[11px] font-bold text-foreground bg-emerald-500/20">
                            {user.name?.[0]?.toUpperCase()}
                        </div>
                    )}
                </div>
            ))}
            {total > users.length && (
                <div className="flex items-center justify-center h-8 w-8 rounded-full ring-2 ring-background bg-background/50 border border-card-border text-[11px] font-bold text-foreground">
                    +{total - users.length}
                </div>
            )}
        </div>
    );
};

export async function SummaryStatsSection() {
    const stats = await getSummaryStats();
    
    const statCards = [
        { label: 'Total Users', value: stats.totalUsers, icon: FiUsers, color: 'text-[var(--pastel-blue)]', bg: 'bg-[var(--pastel-blue)]/10', users: stats.users, trend: stats.trends.users },
        { label: 'Total Tasks', value: stats.totalTasks, icon: FiCheckSquare, color: 'text-[var(--pastel-purple)]', bg: 'bg-[var(--pastel-purple)]/10', trend: stats.trends.tasks },
        { label: 'Completed', value: stats.completedTasks, icon: FiCheckCircle, color: 'text-[var(--pastel-emerald)]', bg: 'bg-[var(--pastel-emerald)]/10', trend: stats.trends.completions },
        { label: 'Team Active', value: stats.attendance.teamActiveCount, icon: FiActivity, color: 'text-[var(--pastel-teal)]', bg: 'bg-[var(--pastel-teal)]/10', trend: stats.trends.events },
        { label: 'Upcoming', value: stats.upcomingEvents, icon: FiCalendar, color: 'text-[var(--pastel-rose)]', bg: 'bg-[var(--pastel-rose)]/10', trend: stats.trends.events },
    ];

    return (
        <div className="col-span-1 lg:col-span-12 grid grid-cols-2 lg:grid-cols-5 gap-2 lg:gap-6 mb-6 lg:mb-10">
            {statCards.map((stat, i) => (
                <div 
                    key={i} 
                    className={`bg-card p-3 lg:p-6 rounded-2xl border border-card-border hover:border-foreground/10 transition-all duration-300 flex flex-col justify-between h-24 lg:h-40 group ${i === 0 ? 'col-span-2 lg:col-span-1' : 'col-span-1'}`}
                >
                    <div className="flex justify-between items-start">
                        <div className={`p-1.5 lg:p-3 rounded-xl ${stat.bg} ${stat.color} transition-colors group-hover:bg-background/80`}>
                            <stat.icon className="text-sm lg:text-xl" />
                        </div>
                        {stat.users ? (
                            <AvatarGroup users={stat.users} total={stat.value} />
                        ) : (
                            <div className="h-8 w-20 opacity-60 group-hover:opacity-100 transition-opacity">
                                <Sparkline 
                                    data={stat.trend || [0, 0, 0, 0, 0, 0, 0]} 
                                    color={stat.color.match(/\[(.*?)\]/)?.[1] || "#6366f1"}
                                    width={80}
                                    height={32}
                                />
                            </div>
                        )}
                    </div>
                    <div className="mt-2 lg:mt-4">
                        <p className="text-[11px] lg:text-[11px] text-(--text-muted) font-bold uppercase tracking-tight mb-0.5 lg:mb-1">{stat.label}</p>
                        <div className="flex items-baseline justify-between">
                            <p className="text-xl lg:text-3xl font-bold font-numbers text-foreground leading-none">{stat.value}</p>
                            {i !== 0 && (
                                <div className={`text-[11px] lg:text-[11px] font-bold font-numbers ${stat.color} bg-background/50 px-1.5 py-0.5 rounded-full`}>
                                   +{(i * 7 + 4) % 15}%
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

export async function AttendanceStatusSection() {
    const stats = await getSummaryStats();
    return (
        <div className="bg-card p-4 lg:p-6 rounded-2xl col-span-1 lg:col-span-3 border border-card-border hover:border-foreground/10 transition-all duration-300 flex flex-col h-80 lg:h-96">
            <AttendanceStack stats={stats.attendance} />
        </div>
    );
}

export async function UserStatSection() {
    const stats = await getSummaryStats();
    
    return (
        <div className="bg-card p-4 lg:p-6 rounded-2xl col-span-1 lg:col-span-4 border border-card-border hover:border-foreground/10 transition-all duration-300 flex flex-col h-80 lg:h-96 text-left">
            <div className="flex justify-between items-center mb-4 lg:mb-5 shrink-0">
                <div>
                    <h2 className="text-lg lg:text-xl font-bold text-foreground tracking-tight">User Intelligence</h2>
                    <p className="text-[11px] text-(--text-muted) uppercase tracking-tight font-bold mt-0.5">Tactical Output</p>
                </div>
                <div className="p-2 rounded-xl bg-[var(--pastel-purple)]/10">
                    <FiCpu className="text-sm text-[var(--pastel-purple)]" />
                </div>
            </div>
            
            <div className="flex-1 flex flex-col justify-center space-y-4">
                <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-2xl bg-background/50 border border-card-border">
                        <p className="text-[9px] text-(--text-muted) font-black uppercase tracking-widest mb-1">Total Notes</p>
                        <p className="text-2xl font-black font-numbers text-foreground">{stats.totalNotes}</p>
                    </div>
                    <div className="p-3 rounded-2xl bg-background/50 border border-card-border">
                        <p className="text-[9px] text-(--text-muted) font-black uppercase tracking-widest mb-1">Total Tasks</p>
                        <p className="text-2xl font-black font-numbers text-foreground">{stats.totalTasks}</p>
                    </div>
                </div>

                <div className="p-4 rounded-2xl bg-background/50 border border-card-border">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-[9px] text-(--text-muted) font-black uppercase tracking-widest">Completion Rate</p>
                        <span className="text-xs font-bold font-numbers text-emerald-400">
                            {stats.totalTasks > 0 ? Math.round((stats.completedTasks / stats.totalTasks) * 100) : 0}%
                        </span>
                    </div>
                    <div className="h-1.5 bg-background rounded-full overflow-hidden border border-card-border">
                        <div 
                            className="h-full bg-emerald-500 rounded-full" 
                            style={{ width: `${stats.totalTasks > 0 ? (stats.completedTasks / stats.totalTasks) * 100 : 0}%` }}
                        />
                    </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-2xl bg-[var(--pastel-blue)]/5 border border-[var(--pastel-blue)]/10">
                    <div className="flex items-center gap-2">
                        <FiTarget className="text-[var(--pastel-blue)]" />
                        <span className="text-[10px] text-foreground font-bold uppercase tracking-widest">Active Projects</span>
                    </div>
                    <span className="text-sm font-black font-numbers text-foreground">{stats.totalProjects}</span>
                </div>
            </div>
        </div>
    );
}


export async function ProductivitySection({ range }: { range?: string }) {
  const data = await getProductivityData(range);
  return (
    <div className="col-span-1 lg:col-span-6 h-80 lg:h-96 bg-card p-4 lg:p-6 rounded-2xl flex flex-col group overflow-hidden relative border border-card-border hover:border-foreground/10 transition-all duration-300">
      <div className="flex justify-between items-center mb-4 lg:mb-6 shrink-0">
        <h2 className="text-lg lg:text-xl font-bold text-foreground tracking-tight">
          Productivity Trend
        </h2>
        <RangeFilter />
      </div>
      <div className="flex-1 w-full min-h-0">
        <ProductivityChart data={data} />
      </div>
    </div>
  );
}

export async function StatsOverviewSection() {
  const [taskData, projectData] = await Promise.all([
    getTasksOverviewData(),
    getProjectsOverviewData(),
  ]);

  return (
    <div className="col-span-1 lg:col-span-3 h-80 lg:h-96 bg-card p-4 lg:p-6 rounded-2xl flex flex-col overflow-hidden relative border border-card-border hover:border-foreground/10 transition-all duration-300">
      <h2 className="text-lg lg:text-xl font-bold text-foreground mb-4 lg:mb-6 tracking-tight">
        Overview
      </h2>
      <div className="flex-1 min-h-0 space-y-6 overflow-y-auto pr-1 custom-scrollbar">
        <div>
          <h3 className="text-[10px] font-bold text-(--text-muted) uppercase tracking-tight mb-3">
            Tasks
          </h3>
          <div className="grid grid-cols-1 gap-2">
            {taskData.map(
              (
                stat: { name: string; value: number; trend?: number },
                i: number,
              ) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-2 rounded-xl bg-background/50 border border-card-border"
                >
                  <div className="flex flex-col">
                    <span className="text-sm text-(--text-muted)">{stat.name}</span>
                    {stat.trend !== undefined && stat.trend !== 0 && (
                      <div
                        className={`flex items-center gap-1 text-[11px] font-bold ${stat.trend > 0 ? "text-emerald-400" : "text-rose-400"}`}
                      >
                        {stat.trend > 0 ? <FiArrowUp /> : <FiArrowDown />}
                        {Math.abs(stat.trend)}%
                      </div>
                    )}
                  </div>
                  <span className="text-sm font-bold font-numbers text-foreground">
                    {stat.value}
                  </span>
                </div>
              ),
            )}
          </div>
        </div>

        <div>
          <h3 className="text-xs font-semibold text-(--text-muted) uppercase tracking-wider mb-3">
            Projects
          </h3>
          <div className="grid grid-cols-1 gap-2">
            {projectData.map(
              (stat: { name: string; value: number }, i: number) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-2 rounded-xl bg-background/50 border border-card-border"
                >
                  <span className="text-sm text-(--text-muted) font-medium">{stat.name}</span>
                  <span className="text-sm font-bold font-numbers text-foreground">
                    {stat.value}
                  </span>
                </div>
              ),
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export async function WorkloadSection() {
  const data = await getWorkloadData();
  return (
    <div className="bg-card p-4 lg:p-6 rounded-2xl col-span-1 lg:col-span-3 border border-card-border hover:border-foreground/10 transition-all duration-300 flex flex-col h-80 lg:h-96">
      <h2 className="text-lg lg:text-xl font-bold text-foreground tracking-tight mb-3 lg:mb-4 shrink-0">
        Workload
      </h2>
      <div className="flex-1 w-full min-h-0">
        <WorkloadChart data={data} />
      </div>
    </div>
  );
}

export async function TimeAllocationSection() {
  const data = await getTimeAllocationData();
  return (
    <div className="bg-card p-4 lg:p-6 rounded-2xl col-span-1 lg:col-span-4 border border-card-border hover:border-foreground/10 transition-all duration-300 flex flex-col h-80 lg:h-96">
      <h2 className="text-lg lg:text-xl font-bold text-foreground tracking-tight mb-3 lg:mb-4 shrink-0">
        Time Allocation
      </h2>
      <div className="flex-1 w-full min-h-0">
        <TimeAllocationChart data={data} />
      </div>
    </div>
  );
}

export async function KeyTasksSection() {
  const keyTasks = await getKeyTasks();

  return (
    <div className="bg-card p-4 lg:p-6 rounded-2xl col-span-1 lg:col-span-3 hover:border-foreground/10 transition-all duration-300 border border-card-border h-80 lg:h-96 flex flex-col">
      <div className="flex justify-between items-center mb-4 lg:mb-6">
        <h2 className="text-lg lg:text-xl font-bold text-foreground tracking-tight">
          Key Tasks
        </h2>
        <button className="text-(--text-muted) hover:text-foreground transition-colors hover-scale">
          <FiMoreHorizontal />
        </button>
      </div>
      <div className="flex-1 min-h-0 space-y-2 overflow-y-auto pr-1 custom-scrollbar">
        {keyTasks.length > 0 ? (
          keyTasks.map((task, i) => (
            <div
              key={i}
              className="flex items-start gap-2.5 p-2.5 rounded-xl bg-background/50 border border-card-border hover:bg-background/80 hover:border-foreground/10 transition-all cursor-pointer group"
            >
              <div className="shrink-0 w-2 h-2 mt-1.5 rounded-full bg-blue-400"></div>
              <div className="flex-1 min-w-0">
                <span className="text-sm text-(--text-muted) font-bold group-hover:text-foreground transition-colors block truncate">
                  {task.title}
                </span>
                <div className="flex items-center justify-between gap-2 mt-1.5">
                  <span className="inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded-md bg-blue-500/10 text-blue-400 font-bold uppercase tracking-tight">
                    <FiActivity className="text-[11px]" />
                    {task.status}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {task.priority && (
                      <span className={`inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-tight ${task.priority === 'high' ? 'bg-rose-500/10 text-rose-400' : task.priority === 'medium' ? 'bg-amber-500/10 text-amber-400' : 'bg-background/50 text-(--text-muted)'}`}>
                        <FiZap className="text-[11px]" />
                        {task.priority}
                      </span>
                    )}
                    {task.dueDate && (
                      <span className="inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded-md bg-background/50 text-(--text-muted) font-bold font-numbers">
                        <FiClock className="text-[11px]" />
                        {new Date(task.dueDate).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <p className="text-(--text-muted) text-center py-4 font-bold text-[11px] uppercase tracking-tight">
            No key tasks at the moment
          </p>
        )}
      </div>
      <button className="w-full mt-6 py-2.5 rounded-xl border border-card-border text-(--text-muted) text-xs font-bold uppercase tracking-tight hover:bg-background/80 hover:text-foreground transition-all hover-scale">
        View All Tasks
      </button>
    </div>
  );
}

export async function PrioritiesSection() {
  const priorities = await getAIPriorities();

  return (
    <div className="bg-card p-4 lg:p-6 rounded-2xl col-span-1 lg:col-span-3 border border-card-border hover:border-foreground/10 transition-all duration-300 flex flex-col h-80 lg:h-96">
      <div className="flex justify-between items-center mb-4 lg:mb-6 shrink-0">
        <h2 className="text-lg lg:text-xl font-bold text-foreground tracking-tight">
          Today&apos;s Priorities
        </h2>
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-background/50 border border-card-border">
          <FiCpu className="text-[11px] text-[var(--pastel-indigo)]" />
          <span className="text-[11px] font-bold text-[var(--pastel-indigo)] uppercase tracking-tight">
            AI
          </span>
        </div>
      </div>
      <div className="flex-1 min-h-0 space-y-3 overflow-y-auto pr-1 custom-scrollbar">
        {priorities.length > 0 ? (
          priorities.map((priority: any, i: number) => {
            const isHigh = priority.priority === "high";
            return (
              <div key={i} className="group flex items-start gap-3 p-3 rounded-xl bg-background/50 border border-card-border hover:border-foreground/10 transition-all hover:bg-background/80">
                <div className={`mt-0.5 shrink-0 ${isHigh ? 'text-[var(--pastel-rose)]' : 'text-(--text-muted)'}`}>
                  {isHigh ? (
                    <FiAlertCircle className="text-sm" />
                  ) : (
                    <div className="w-3.5 h-3.5 rounded-md border-2 border-zinc-600 group-hover:border-zinc-500 transition-colors" />
                  )}
                </div>
                <div className="flex-1 overflow-hidden">
                  <h3
                    className={`text-sm font-bold truncate transition-colors ${isHigh ? "text-foreground" : "text-(--text-muted) group-hover:text-foreground"}`}
                  >
                    {priority.action}
                  </h3>
                  <p className="text-[11px] text-(--text-muted) font-medium leading-tight mt-0.5 flex items-center gap-1">
                    <span className="font-bold">Why:</span> {priority.reason}
                  </p>
                </div>
              </div>
            );
          })
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center opacity-50">
          <FiCheckCircle className="text-2xl mb-2 text-emerald-500" />
            <p className="text-sm text-(--text-muted) font-bold uppercase tracking-tight">All caught up!</p>
          </div>
        )}
      </div>
      <button className="w-full mt-4 py-2 rounded-xl border border-card-border text-(--text-muted) text-[11px] font-bold uppercase tracking-tight hover:bg-background/80 hover:text-foreground transition-all hover-scale shrink-0">
        Refresh AI Analysis
      </button>
    </div>
  );
}

export async function RecentNotesSection() {
  const recentNotes = await getRecentNotes();

  return (
    <div className="bg-card p-4 lg:p-6 rounded-2xl col-span-1 lg:col-span-6 border border-card-border hover:border-foreground/10 transition-all duration-300 h-80 lg:h-96 flex flex-col">
      <div className="flex justify-between items-center mb-4 lg:mb-6 shrink-0">
        <h2 className="text-lg lg:text-xl font-bold text-foreground tracking-tight">
          Recent Notes
        </h2>
        <button className="p-2 rounded-lg bg-background/50 text-(--text-muted) hover:text-foreground hover:bg-background/80 border border-card-border transition-all hover-scale">
          <FiPlus />
        </button>
      </div>
      <div className="flex-1 min-h-0">
        <NoteStack notes={recentNotes} />
      </div>
    </div>
  );
}

export async function ProjectProgressSection() {
  const data = await getProjectProgressData();
  return (
    <div className="bg-card p-4 lg:p-6 rounded-2xl col-span-1 lg:col-span-5 border border-card-border hover:border-foreground/10 transition-all duration-300 flex flex-col h-80 lg:h-96">
      <h2 className="text-lg lg:text-xl font-bold text-foreground tracking-tight mb-3 lg:mb-4 shrink-0">
        Project Progress
      </h2>
      <div className="flex-1 w-full min-h-0">
        <ProjectProgressChart data={data} />
      </div>
    </div>
  );
}

// Static sections (no async data needed, but good to have as components)
export function FocusModeSection() {
  return (
    <div className="bg-card p-4 lg:p-6 rounded-2xl col-span-1 lg:col-span-3 border border-card-border hover:border-foreground/10 transition-all duration-300 flex flex-col justify-center items-center text-center relative overflow-hidden group h-80 lg:h-96">
      <div className="p-4 rounded-full bg-background/50 mb-4 border border-card-border relative z-10">
        <FiClock className="text-3xl text-[var(--pastel-indigo)]" />
      </div>
      <h2 className="text-lg lg:text-xl font-bold text-foreground mb-2 relative z-10">
        Focus Mode
      </h2>
      <p className="text-sm text-(--text-muted) font-bold uppercase tracking-tight mb-6 relative z-10">
        Block distractions and concentrate.
      </p>
      <button className="relative z-10 px-6 py-2.5 rounded-xl bg-background border border-card-border text-foreground font-bold uppercase tracking-tight hover:bg-background/80 transition-all duration-200 active:scale-95">
        Start Session
      </button>
    </div>
  );
}

// ── NEW TACTICAL INSIGHT SECTIONS ──────────────────────────────────

export async function UnitLoadSection() {
  const data = await getUnitLoadDistribution();
  const maxTasks = Math.max(...data.map(d => d.activeTasks), 1);

  return (
    <div className="bg-card p-4 lg:p-6 rounded-2xl col-span-1 lg:col-span-4 border border-card-border hover:border-foreground/10 transition-all duration-300 flex flex-col h-80 lg:h-96">
      <div className="flex justify-between items-center mb-4 lg:mb-5 shrink-0">
        <div>
          <h2 className="text-lg lg:text-xl font-bold text-foreground tracking-tight">Resource Saturation</h2>
          <p className="text-[11px] text-(--text-muted) uppercase tracking-tight font-bold mt-0.5">Unit Load Distribution</p>
        </div>
        <div className="p-2 rounded-xl bg-[var(--pastel-blue)]/10">
          <FiUsers className="text-sm text-[var(--pastel-blue)]" />
        </div>
      </div>
      <div className="flex-1 min-h-0 space-y-2.5 overflow-y-auto pr-1 custom-scrollbar">
        {data.length > 0 ? (
          data.map((user, i) => (
            <div key={i} className="flex items-center gap-3 group">
              <div className="shrink-0 h-7 w-7 rounded-full bg-background/50 border border-card-border overflow-hidden ring-1 ring-background relative">
                {user.avatar ? (
                  <Image src={user.avatar} alt={user.name} fill className="object-cover" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-[10px] font-bold text-foreground bg-[var(--pastel-purple)]/20">
                    {user.name?.[0]?.toUpperCase()}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-(--text-muted) font-bold truncate">{user.name}</span>
                  <span className="text-xs font-bold font-numbers text-foreground ml-2">{user.activeTasks}</span>
                </div>
                <div className="h-1.5 bg-background/50 rounded-full overflow-hidden border border-card-border">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${(user.activeTasks / maxTasks) * 100}%`,
                      background: user.activeTasks >= maxTasks * 0.8
                        ? 'var(--pastel-rose)' 
                        : user.activeTasks >= maxTasks * 0.5 
                          ? 'var(--pastel-amber)' 
                          : 'var(--pastel-emerald)'
                    }}
                  />
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center opacity-50">
            <FiUsers className="text-2xl mb-2 text-(--text-muted)" />
            <p className="text-sm text-(--text-muted) font-bold uppercase tracking-tight">No active assignments</p>
          </div>
        )}
      </div>
    </div>
  );
}

export async function PriorityMatrixSection() {
  const data = await getPriorityMatrix();

  const COLORS: Record<string, string> = {
    'Critical': 'var(--pastel-rose)',
    'Medium': 'var(--pastel-amber)',
    'Low': 'var(--pastel-emerald)',
  };

  return (
    <div className="bg-card p-4 lg:p-6 rounded-2xl col-span-1 lg:col-span-4 border border-card-border hover:border-foreground/10 transition-all duration-300 flex flex-col h-80 lg:h-96">
      <div className="flex justify-between items-center mb-4 lg:mb-5 shrink-0">
        <div>
          <h2 className="text-lg lg:text-xl font-bold text-foreground tracking-tight">Threat Level</h2>
          <p className="text-[11px] text-(--text-muted) uppercase tracking-tight font-bold mt-0.5">Priority Matrix</p>
        </div>
        {data.hasCritical && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/20">
            <FiAlertTriangle className="text-[11px] text-[var(--pastel-rose)]" />
            <span className="text-[11px] font-bold font-numbers text-[var(--pastel-rose)]">{data.criticalCount} CRITICAL</span>
          </div>
        )}
      </div>
      <div className="flex-1 min-h-0 flex flex-col items-center justify-center">
        {/* Segmented ring */}
        <div className="relative w-36 h-36 mb-5">
          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
            {(() => {
              let offset = 0;
              const total = data.segments.reduce((s, seg) => s + seg.value, 0);
              if (total === 0) return <circle cx="50" cy="50" r="40" fill="none" stroke="var(--chart-grid)" strokeWidth="10" />;
              return data.segments.map((seg, i) => {
                const pct = (seg.value / total) * 100;
                const dashArray = `${pct * 2.512} ${251.2 - pct * 2.512}`;
                const el = (
                  <circle
                    key={i}
                    cx="50" cy="50" r="40"
                    fill="none"
                    stroke={seg.color}
                    strokeWidth="10"
                    strokeDasharray={dashArray}
                    strokeDashoffset={-offset * 2.512}
                    strokeLinecap="round"
                    className="transition-all duration-700"
                  />
                );
                offset += pct;
                return el;
              });
            })()}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold font-numbers text-foreground">{data.total}</span>
            <span className="text-[10px] text-(--text-muted) font-bold uppercase tracking-tight">Active</span>
          </div>
        </div>
        {/* Legend */}
        <div className="flex gap-4">
          {data.segments.map((seg, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ background: COLORS[seg.name] || seg.color }} />
              <span className="text-[11px] text-(--text-muted) font-bold">{seg.name}</span>
              <span className="text-[11px] font-bold font-numbers text-foreground">{seg.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export async function TemporalBurnRateSection() {
  const data = await getTemporalBurnRate();

  const actualPct = Math.min(data.burnRatio, 150);

  const statusConfig = {
    over: { label: 'Over Budget', color: 'text-[var(--pastel-rose)]', bg: 'bg-rose-500/10', border: 'border-rose-500/20' },
    on_track: { label: 'On Track', color: 'text-[var(--pastel-emerald)]', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
    under: { label: 'Under Estimate', color: 'text-[var(--pastel-blue)]', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
  };
  const sc = statusConfig[data.status as keyof typeof statusConfig];

  return (
    <div className="bg-card p-4 lg:p-6 rounded-2xl col-span-1 lg:col-span-4 border border-card-border hover:border-foreground/10 transition-all duration-300 flex flex-col h-80 lg:h-96">
      <div className="flex justify-between items-center mb-4 lg:mb-5 shrink-0">
        <div>
          <h2 className="text-lg lg:text-xl font-bold text-foreground tracking-tight">Temporal Burn Rate</h2>
          <p className="text-[11px] text-(--text-muted) uppercase tracking-tight font-bold mt-0.5">Chronological Efficiency</p>
        </div>
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${sc.bg} border ${sc.border}`}>
          <FiTarget className={`text-[11px] ${sc.color}`} />
          <span className={`text-[11px] font-bold ${sc.color} uppercase tracking-tight`}>{sc.label}</span>
        </div>
      </div>
      <div className="flex-1 flex flex-col justify-center space-y-8">
        {/* Estimated Hours Bar */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-(--text-muted) font-bold">Estimated Hours</span>
            <span className="text-sm font-bold font-numbers text-foreground">{data.estimatedHours}h</span>
          </div>
          <div className="h-3 bg-background/50 rounded-full overflow-hidden border border-card-border">
            <div className="h-full rounded-full bg-[var(--pastel-indigo)]/60 transition-all duration-700" style={{ width: '100%' }} />
          </div>
        </div>

        {/* Actual Hours Bar */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-(--text-muted) font-bold">Actual Hours Logged</span>
            <span className="text-sm font-bold font-numbers text-foreground">{data.actualHours}h</span>
          </div>
          <div className="h-3 bg-background/50 rounded-full overflow-hidden border border-card-border">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${Math.min((actualPct / 150) * 100, 100)}%`,
                background: data.status === 'over' ? 'var(--pastel-rose)' : data.status === 'on_track' ? 'var(--pastel-emerald)' : 'var(--pastel-blue)'
              }}
            />
          </div>
        </div>

        {/* Stats footer */}
        <div className="flex items-center justify-between pt-2 border-t border-card-border">
          <div className="flex items-center gap-1.5">
            <FiActivity className="text-xs text-(--text-muted)" />
            <span className="text-[11px] text-(--text-muted) font-bold uppercase tracking-tight"><span className="font-numbers">{data.projectCount}</span> active projects</span>
          </div>
          <div className={`text-sm font-bold font-numbers ${sc.color}`}>
            {data.burnRatio}% burn
          </div>
        </div>
      </div>
    </div>
  );
}

export async function CriticalBottlenecksSection() {
  const bottlenecks = await getCriticalBottlenecks();

  return (
    <div className="bg-card p-4 lg:p-6 rounded-2xl col-span-1 lg:col-span-4 border border-card-border hover:border-foreground/10 transition-all duration-300 flex flex-col h-80 lg:h-96">
      <div className="flex justify-between items-center mb-4 lg:mb-5 shrink-0">
        <div>
          <h2 className="text-lg lg:text-xl font-bold text-foreground tracking-tight">Delayed Maneuvers</h2>
          <p className="text-[11px] text-(--text-muted) uppercase tracking-tight font-bold mt-0.5">Critical Bottlenecks</p>
        </div>
        <div className="p-2 rounded-xl bg-rose-500/10">
          <FiShield className="text-sm text-[var(--pastel-rose)]" />
        </div>
      </div>
      <div className="flex-1 min-h-0 space-y-2.5 overflow-y-auto pr-1 custom-scrollbar">
        {bottlenecks.length > 0 ? (
          bottlenecks.map((task, i) => (
            <div key={i} className="p-3 rounded-xl bg-background/50 border border-card-border hover:bg-background/80 hover:border-foreground/10 transition-all group">
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="text-sm text-(--text-muted) font-bold group-hover:text-foreground transition-colors truncate flex-1">
                  {task.title}
                </h3>
                <span className="shrink-0 inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-rose-500/15 text-[var(--pastel-rose)] font-bold border border-rose-500/20 font-numbers">
                  <FiClock className="text-[10px]" />
                  {task.daysOverdue}d overdue
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-tight ${
                  task.priority === 'high' ? 'bg-rose-500/10 text-rose-400'
                  : task.priority === 'medium' ? 'bg-amber-500/10 text-amber-400'
                  : 'bg-background/50 text-(--text-muted)'
                }`}>
                  <FiZap className="text-[10px]" />
                  {task.priority}
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md bg-blue-500/10 text-blue-400 font-bold uppercase tracking-tight">
                  <FiActivity className="text-[10px]" />
                  {task.status.replace('_', ' ')}
                </span>
                {task.projectName && (
                  <span className="text-[10px] text-(--text-muted) font-bold truncate">
                    {task.projectName}
                  </span>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center opacity-50">
            <FiCheckCircle className="text-2xl mb-2 text-emerald-500" />
            <p className="text-sm text-(--text-muted) font-bold uppercase tracking-tight">No overdue tasks!</p>
          </div>
        )}
      </div>
    </div>
  );
}

export async function OperationVelocitySection() {
  const data = await getOperationVelocity();
  const totalClosed = data.reduce((s, d) => s + d.count, 0);
  const avgPerDay = totalClosed > 0 ? (totalClosed / data.length).toFixed(1) : '0';

  return (
    <div className="bg-card p-4 lg:p-6 rounded-2xl col-span-1 lg:col-span-4 border border-card-border hover:border-foreground/10 transition-all duration-300 flex flex-col h-80 lg:h-96">
      <div className="flex justify-between items-center mb-4 lg:mb-5 shrink-0">
        <div>
          <h2 className="text-lg lg:text-xl font-bold text-foreground tracking-tight">Momentum Tracker</h2>
          <p className="text-[11px] text-(--text-muted) uppercase tracking-tight font-bold mt-0.5">Operation Velocity</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-bold font-numbers text-foreground">{totalClosed}</p>
            <p className="text-[10px] text-(--text-muted) font-bold uppercase tracking-tight"><span className="font-numbers">14</span>d total</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold font-numbers text-[var(--pastel-teal)]">{avgPerDay}</p>
            <p className="text-[10px] text-(--text-muted) font-bold uppercase tracking-tight">avg/day</p>
          </div>
        </div>
      </div>
      <div className="flex-1 w-full min-h-0">
        <VelocityChart data={data} />
      </div>
    </div>
  );
}
