'use client';

import { StatTile } from '@/components/ui/stat-tile';
import type { IconType } from 'react-icons';
import React, { useState, useEffect, useCallback } from 'react';
import { Project, statusMapping, priorityMapping } from '@/types/project';
import { Task } from '@/types/task';
import { Note } from '@/types/note';
import { User } from '@/types/user';
import { Client } from '@/types/client';
import { useOrgSlug } from '@/hooks/use-org-slug';
import { 
    FiCheckSquare, FiFileText, FiCalendar, FiDollarSign, 
    FiUsers, FiClock, FiPlus, FiSettings, FiActivity,
    FiLayout, FiPieChart, FiArrowLeft, FiMoreHorizontal,
    FiTrendingUp, FiAlertCircle, FiChevronRight, FiEdit2, FiTrash2, FiClipboard
} from 'react-icons/fi';
import { EmptyState } from '@/components/ui/empty-state';
import { format } from 'date-fns';
import Link from 'next/link';
import UserAvatarGroup from '@/components/ui/user-avatar-group';
import TaskCard from '@/components/ui/tasks/task-card';
import NoteCard from '@/components/ui/notes/note-card';
import { updateTask, deleteTask } from '@/app/(dashboard)/[orgSlug]/tasks/actions';
import { updateNote, deleteNote } from '@/app/(dashboard)/[orgSlug]/notes/actions';
import { updateOptimisticTask, updateOptimisticNote } from '@/lib/optimistic-utils';
import { toast } from '@/lib/toast';
import { useConfirm } from '@/providers/confirmation-provider';
import { formatStatus } from '@/lib/format-status';

import { TabPill } from '@/components/ui/tab-pill';
interface ProjectDashboardClientProps {
    project: Project;
    tasks: Task[];
    notes: Note[];
    users: User[];
    clients: Client[];
    allProjects: Project[];
}

export default function ProjectDashboardClient({
    project,
    tasks: initialTasks,
    notes: initialNotes,
    users,
    clients,
    allProjects
}: ProjectDashboardClientProps) {
    const confirm = useConfirm();
    const orgSlug = useOrgSlug();
    const orgPath = (path: string) => orgSlug ? `/${orgSlug}${path}` : path;
    const [activeView, setActiveView] = useState<'overview' | 'tasks' | 'notes' | 'settings'>('overview');

    // This view renders tasks and notes from server props. Holding them in local
    // state lets edits and deletes show instantly; without it, the raw actions
    // were called but nothing re-rendered until a full page refresh. Re-sync when
    // the server props change (e.g. after a navigation).
    const [tasks, setTasks] = useState<Task[]>(initialTasks);
    const [notes, setNotes] = useState<Note[]>(initialNotes);
    useEffect(() => {
        const frame = window.requestAnimationFrame(() => setTasks(initialTasks));
        return () => window.cancelAnimationFrame(frame);
    }, [initialTasks]);
    useEffect(() => {
        const frame = window.requestAnimationFrame(() => setNotes(initialNotes));
        return () => window.cancelAnimationFrame(frame);
    }, [initialNotes]);

    // Optimistic wrappers: apply the change to local state immediately, persist in
    // the background, and roll back with an error toast only if the write fails.
    const handleTaskUpdate = useCallback(async (formData: FormData) => {
        const id = Number(formData.get('id'));
        const previous = tasks;
        const existing = tasks.find(t => t.id === id);
        if (existing) {
            setTasks(list => list.map(t => (t.id === id ? updateOptimisticTask(existing, formData, users) : t)));
        }
        const result = await updateTask(formData);
        if (!result?.success) {
            setTasks(previous);
        }
        return result;
    }, [tasks, users]);

    const handleTaskDelete = useCallback(async (formData: FormData) => {
        const id = Number(formData.get('id'));
        const previous = tasks;
        setTasks(list => list.filter(t => t.id !== id));
        const result = await deleteTask(formData);
        if (!result?.success) {
            setTasks(previous);
        }
        return result;
    }, [tasks]);

    const handleNoteUpdate = useCallback(async (formData: FormData) => {
        const id = Number(formData.get('id'));
        const previous = notes;
        const existing = notes.find(n => n.id === id);
        if (existing) {
            setNotes(list => list.map(n => (n.id === id ? updateOptimisticNote(existing, formData) : n)));
        }
        const result = await updateNote(formData);
        if (!result?.success) {
            setNotes(previous);
            toast.error(result?.error || 'Failed to update note');
        } else {
            toast.success(`Note updated${existing?.title ? ` — ${existing.title}` : ''}`);
        }
        return result;
    }, [notes]);

    const handleNoteDelete = useCallback(async (formData: FormData) => {
        const id = Number(formData.get('id'));
        const note = notes.find(item => item.id === id);
        const confirmed = await confirm({
            title: 'Delete note',
            message: `Delete “${note?.title || 'this note'}”? This cannot be undone.`,
            confirmText: 'Delete note',
            type: 'danger',
        });
        if (!confirmed) return { success: false, error: 'Cancelled' };
        const previous = notes;
        setNotes(list => list.filter(n => n.id !== id));
        const result = await deleteNote(formData);
        if (!result?.success) {
            setNotes(previous);
            toast.error(result?.error || 'Failed to delete note');
        } else {
            toast.success('Note deleted');
        }
        return result;
    }, [confirm, notes]);

    const client = clients.find(c => c.id === project.clientId);
    const owner = users.find(u => u.id === project.ownerId);

    const completedTasks = tasks.filter(t => t.status === 'DONE').length;
    const taskProgress = tasks.length > 0 ? (completedTasks / tasks.length) * 100 : 0;
    
    const budgetProgress = project.budget && project.budget > 0 
        ? ((project.spent || 0) / project.budget) * 100 
        : 0;

    const totalHoursLogged = tasks.reduce((sum, t) => sum + (t.totalHours ?? 0), 0);

    return (
        <div className="flex min-h-[calc(100dvh-8rem)] flex-col bg-background md:min-h-screen">
            {/* Top Command Bar */}
            <div className="sticky top-0 z-50 flex h-16 items-center justify-between border-b border-card-border bg-background/85 px-3 backdrop-blur-md sm:px-4 md:px-6">
                <div className="flex min-w-0 items-center gap-3 md:gap-6">
                    <Link href={orgPath('/projects')} aria-label="Back to projects" className="flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-card-border bg-foreground/[0.03] text-text-muted transition-all hover:bg-foreground/[0.06] hover:text-foreground">
                        <FiArrowLeft className="w-5 h-5" />
                    </Link>
                    <div className="flex min-w-0 flex-col">
                        <div className="flex items-center gap-2 text-[11px] font-medium text-text-muted">
                            <span>Project</span>
                            <FiChevronRight className="w-3 h-3" />
                            <span className="text-text-muted opacity-80">{project.key}</span>
                        </div>
                        <h1 className="truncate text-sm font-medium capitalize leading-none tracking-tight text-foreground sm:text-lg">{project.name}</h1>
                    </div>
                </div>

                <div className="ml-2 flex items-center gap-2 md:gap-3">
                    <div className="flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-xl border border-card-border bg-foreground/[0.03] px-2 md:px-3">
                        <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                        <span className="hidden text-[11px] font-medium text-foreground sm:inline">Active</span>
                    </div>
                    <button onClick={() => setActiveView('settings')} aria-label="Project settings" className="flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-xl border border-card-border bg-foreground/[0.03] px-3 text-[11px] font-medium text-text-muted transition-all hover:bg-foreground/[0.06] hover:text-foreground md:px-4">
                        <FiSettings className="w-4 h-4" />
                        <span className="hidden md:inline">Settings</span>
                    </button>
                    <div className="mx-2 hidden h-6 w-px bg-foreground/[0.06] md:block" />
                    <div className="hidden md:block">{owner && <UserAvatarGroup users={[owner]} size="sm" limit={1} />}</div>
                </div>
            </div>

            <div className="sticky top-16 z-40 flex gap-1 overflow-x-auto border-b border-card-border bg-background/95 px-3 py-2 backdrop-blur-md lg:hidden">
                {([
                    ['overview', FiPieChart, 'Overview'],
                    ['tasks', FiLayout, 'Tasks'],
                    ['notes', FiFileText, 'Notes'],
                    ['settings', FiActivity, 'History'],
                ] as const).map(([view, Icon, label]) => (
                    <button
                        key={view}
                        onClick={() => setActiveView(view)}
                        className={`relative isolate flex min-h-10 shrink-0 items-center gap-2 rounded-full px-3.5 text-sm transition-colors ${activeView === view ? 'font-medium text-on-ink' : 'text-text-muted hover:bg-foreground/[0.04] hover:text-foreground'}`}
                    >
                        {activeView === view && <TabPill id="project-view" />}
                        <Icon className="h-4 w-4" />
                        {label}
                    </button>
                ))}
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* Secondary Sidebar Nav */}
                <div className="w-64 border-r border-card-border bg-foreground/[0.02] p-5 flex flex-col gap-6 hidden lg:flex">
                    <div className="space-y-1">
                        <p className="px-4 text-[11px] font-bold text-text-muted/60 mb-3">Navigation</p>
                        <NavButton active={activeView === 'overview'} onClick={() => setActiveView('overview')} icon={FiPieChart} label="Overview" />
                        <NavButton active={activeView === 'tasks'} onClick={() => setActiveView('tasks')} icon={FiLayout} label="Task Force" />
                        <NavButton active={activeView === 'notes'} onClick={() => setActiveView('notes')} icon={FiFileText} label="Intelligence" />
                        <NavButton active={activeView === 'settings'} onClick={() => setActiveView('settings')} icon={FiActivity} label="Logs & History" />
                    </div>

                    <div className="space-y-1">
                        <p className="px-4 text-[11px] font-bold text-text-muted/60 mb-3">Status</p>
                        <div className="px-4 py-3 rounded-2xl bg-foreground/[0.03] border border-card-border space-y-3 shadow-sm">
                            <div className="flex items-center justify-between">
                                <span className="text-[11px] font-bold text-text-muted tracking-tight">Project health</span>
                                <span className={`text-[11px] font-medium capitalize ${
 taskProgress > 75 ? 'text-success-text' : taskProgress > 40 ? 'text-accent-text' : 'text-warning-text'
 }`}>
                                    {taskProgress > 75 ? 'Optimal' : taskProgress > 40 ? 'Stable' : 'In Review'}
                                </span>
                            </div>
                            <div className="w-full h-1 bg-foreground/[0.06] rounded-full overflow-hidden">
                                <div 
                                    className={`h-full transition-all duration-1000 ${
 taskProgress > 75 ? 'bg-success' : 
 taskProgress > 40 ? 'bg-accent' : 'bg-warning'
 }`} 
                                    style={{ width: `${taskProgress}%` }} 
                                />
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-[11px] font-bold text-text-muted tracking-tight">Resources</span>
                                <span className={`text-[11px] font-medium capitalize ${
 budgetProgress < 80 ? 'text-success-text' : 'text-danger-text'
 }`}>
                                    {budgetProgress < 80 ? 'Efficient' : 'Critical'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <div className="mx-auto max-w-[1600px] space-y-4 px-3 py-4 sm:px-4 md:space-y-8 md:px-6 md:py-8">
                        {activeView === 'overview' && (
                            <>
                                {/* Impact Stats Grid */}
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                                    <StatCard icon={FiCheckSquare} color="indigo" label="Tasks completed" value={`${completedTasks}/${tasks.length}`} subValue={`${Math.round(taskProgress)}% done`} />
                                    <StatCard icon={FiDollarSign} color="emerald" label="Budget spent" value={`$${(project.spent || 0).toLocaleString()}`} subValue={`of $${(project.budget || 0).toLocaleString()} budget`} />
                                    <StatCard icon={FiClock} color="amber" label="Due date" value={project.endDate ? format(new Date(project.endDate), 'MMM dd') : 'N/A'} subValue="Target completion" />
                                    <StatCard icon={FiTrendingUp} color="rose" label="Hours logged" value={totalHoursLogged > 0 ? `${totalHoursLogged.toFixed(1)}h` : '0h'} subValue="Across all tasks" />
                                </div>

                                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                                    {/* Main Operational Column */}
                                    <div className="xl:col-span-2 space-y-6">
                                        {/* Row 1: Milestones & Risk */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="rounded-2xl p-6 border border-card-border bg-card flex flex-col gap-6">
                                                <h3 className="text-[11px] font-medium text-foreground flex items-center gap-3">
                                                    <FiActivity className="text-accent-text" />
                                                    Strategic Milestones
                                                </h3>
                                                <div className="flex items-center gap-6">
                                                    <div className="relative w-20 h-20 flex-shrink-0">
                                                        <svg className="w-full h-full transform -rotate-90">
                                                            <circle cx="40" cy="40" r="36" stroke="currentColor" strokeWidth="6" fill="transparent" className="text-foreground/5" />
                                                            <circle cx="40" cy="40" r="36" stroke="currentColor" strokeWidth="6" fill="transparent" strokeDasharray={226} strokeDashoffset={226 - (taskProgress / 100) * 226} className="text-accent-text transition-all duration-1000" strokeLinecap="round" />
                                                        </svg>
                                                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                                                            <span className="text-sm font-medium text-foreground leading-none">{Math.round(taskProgress)}%</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex-1 space-y-4">
                                                        <div>
                                                            <p className="text-[11px] font-medium text-text-muted mb-2">Overview</p>
                                                            <p className="text-xs text-text-secondary line-clamp-2 italic leading-relaxed">
                                                                {project.description || "Operational intelligence for this theater of operations remains classified. Update mission briefing in settings."}
                                                            </p>
                                                        </div>
                                                        <div className="flex gap-4">
                                                            <MilestoneItem label="Architecture" status="completed" date="Oct 12" />
                                                            <MilestoneItem label="Integration" status="active" date="Nov 05" />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="rounded-2xl p-6 border border-card-border bg-card flex flex-col gap-6">
                                                <h3 className="text-[11px] font-medium text-foreground flex items-center gap-3">
                                                    <FiActivity className="text-warning-text" />
                                                    System Telemetry
                                                </h3>
                                                <div className="space-y-4">
                                                    <TelemetryItem label="Risk Protocol" value="Low" color="emerald" percentage={15} />
                                                    <TelemetryItem label="Data Density" value="High" color="amber" percentage={78} />
                                                    <TelemetryItem label="Network Health" value="Optimal" color="indigo" percentage={92} />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Row 2: Active Operations (Full Width of Column) */}
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between">
                                                <h3 className="text-[11px] font-medium text-foreground flex items-center gap-3">
                                                    <FiLayout className="text-success-text" />
                                                    Active Operations
                                                </h3>
                                                <button onClick={() => setActiveView('tasks')} className="text-[11px] font-medium text-text-muted hover:text-foreground transition-colors flex items-center gap-2">
                                                    View All <FiChevronRight />
                                                </button>
                                            </div>
                                            
                                            <div className="rounded-2xl overflow-hidden border border-card-border bg-card">
                                                <div className="overflow-x-auto">
                                                    <table className="w-full text-left">
                                                        <thead>
                                                            <tr className="border-b border-card-border bg-foreground/[0.02]">
                                                                <th className="px-6 py-3 text-[11px] font-medium text-text-muted">Name</th>
                                                                <th className="px-6 py-3 text-[11px] font-medium text-text-muted">Assignee</th>
                                                                <th className="px-6 py-3 text-[11px] font-medium text-text-muted">Status</th>
                                                            </tr>
                                                        </thead>
                                                         <tbody className="divide-y divide-card-border">
                                                            {tasks.length === 0 ? (
                                                                <tr>
                                                                    <td colSpan={3} className="px-6 py-16 text-center">
                                                                        <EmptyState icon={FiClipboard} title="No tasks yet" description="Task briefings will appear here." />
                                                                    </td>
                                                                </tr>
                                                            ) : tasks.slice(0, 5).map(task => (
                                                                 <tr key={task.id} className="hover:bg-foreground/[0.03] transition-colors">
                                                                     <td className="px-6 py-3">
                                                                         <p className="text-xs font-bold text-foreground capitalize tracking-tight truncate max-w-[250px]">{task.name}</p>
                                                                     </td>
                                                                     <td className="px-6 py-3">
                                                                         {task.assignees && task.assignees.length > 0 ? (
                                                                             <UserAvatarGroup users={task.assignees.map(a => a.user)} size="sm" limit={2} />
                                                                         ) : (
                                                                             <span className="text-[11px] font-bold text-text-muted/40">Unassigned</span>
                                                                         )}
                                                                     </td>
                                                                     <td className="px-6 py-3">
                                                                         <span className={`px-2 py-0.5 rounded-md text-[11px] font-medium capitalize border ${
 task.status === 'DONE' 
 ? 'bg-success/10 text-success-text dark:text-success-text border-success/20' 
 : task.status === 'IN_PROGRESS'
 ? 'bg-accent/10 text-accent-text dark:text-accent-text border-accent/20'
 : 'bg-foreground/[0.05] text-text-muted border-card-border'
 }`}>
                                                                             {formatStatus(task.status)}
                                                                         </span>
                                                                     </td>
                                                                 </tr>
                                                             ))}
                                                         </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Row 3: Project Intelligence */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="rounded-2xl p-6 border border-card-border bg-card flex flex-col gap-4">
                                                <h3 className="text-[11px] font-medium text-foreground flex items-center gap-3">
                                                    <FiActivity className="text-danger-text" />
                                                    Recent activity
                                                </h3>
                                                <div className="space-y-4">
                                                    {tasks.filter(t => t.status === 'DONE').slice(0, 3).map(t => (
                                                        <ActivityItem key={t.id} user={users[0]} action="completed task" target={t.name} time="2h ago" />
                                                    ))}
                                                    <ActivityItem user={users[1] || users[0]} action="posted briefing" target="Alpha Protocol Update" time="4h ago" />
                                                </div>
                                            </div>
                                            <div className="rounded-2xl p-6 border border-card-border bg-card flex flex-col gap-4">
                                                <h3 className="text-[11px] font-medium text-foreground flex items-center gap-3">
                                                    <FiDollarSign className="text-success-text" />
                                                    Financial Telemetry
                                                </h3>
                                                <div className="space-y-4">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-[11px] font-bold text-text-muted">Budget</span>
                                                        <span className="text-[11px] font-medium text-foreground">${(project.budget || 0).toLocaleString()}</span>
                                                    </div>
                                                    <div className="w-full h-8 bg-foreground/[0.03] rounded-xl border border-card-border relative overflow-hidden flex">
                                                        <div className="h-full bg-success/40" style={{ width: `${Math.min(budgetProgress, 100)}%` }} />
                                                        <div className="absolute inset-0 flex items-center justify-center">
                                                            <span className="text-[11px] font-medium text-foreground capitalize">{Math.round(budgetProgress)}% used</span>
                                                        </div>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="p-3 rounded-xl bg-foreground/[0.03] border border-card-border">
                                                            <p className="text-[11px] font-bold text-text-muted mb-1">Spent</p>
                                                            <p className="text-xs font-medium text-foreground">${(project.spent || 0).toLocaleString()}</p>
                                                        </div>
                                                        <div className="p-3 rounded-xl bg-foreground/[0.03] border border-card-border">
                                                            <p className="text-[11px] font-bold text-text-muted mb-1">Remaining</p>
                                                            <p className="text-xs font-medium text-success-text dark:text-success-text">${((project.budget || 0) - (project.spent || 0)).toLocaleString()}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Sidebar Intel Column */}
                                    <div className="space-y-6">
                                        {/* Client */}
                                        <div className="rounded-2xl p-6 border border-card-border bg-card space-y-4">
                                            <h3 className="text-[11px] font-medium text-foreground flex items-center gap-3">
                                                <FiUsers className="text-accent-text" />
                                                Client
                                            </h3>
                                            <div className="p-4 rounded-xl bg-foreground/[0.03] border border-card-border space-y-3">
                                                <div>
                                                    <p className="text-[11px] font-medium text-text-muted mb-1">Client</p>
                                                    <p className="text-sm font-medium text-foreground capitalize tracking-tight">{client ? client.companyName : 'Internal Asset'}</p>
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <p className="text-[11px] font-medium text-text-muted/60 mb-1">Client</p>
                                                        <p className="text-[11px] font-medium text-text-secondary capitalize">{client?.companyName || 'No client'}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-[11px] font-medium text-text-muted/60 mb-1">Contact</p>
                                                        <p className="text-[11px] font-medium text-text-secondary capitalize">{client?.contactPersonName || 'Unassigned'}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Team */}
                                        <div className="rounded-2xl p-6 border border-card-border bg-card space-y-6">
                                            <h3 className="text-[11px] font-medium text-foreground flex items-center gap-3">
                                                <FiUsers className="text-danger-text" />
                                                Team
                                            </h3>
                                            <div className="flex flex-wrap gap-2.5">
                                                {users.slice(0, 12).map((u, i) => (
                                                    <div key={i} className="group/avatar relative hover:scale-110 transition-all duration-300">
                                                        <UserAvatarGroup users={[u]} size="md" limit={1} />
                                                        <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-success border-2 border-background" />
                                                    </div>
                                                ))}
                                                <button className="w-10 h-10 rounded-full border border-card-border border-dashed flex items-center justify-center text-text-muted hover:text-foreground hover:border-foreground hover:bg-foreground/[0.03] transition-all">
                                                    <FiPlus className="w-4 h-4" />
                                                </button>
                                            </div>
                                            <div className="pt-2 border-t border-card-border">
                                                <p className="text-[11px] font-bold text-text-muted text-center">Authorized Personnel: {users.length}</p>
                                            </div>
                                        </div>

                                        {/* System Logs */}
                                        <div className="rounded-2xl p-6 border border-card-border bg-card space-y-4">
                                            <h3 className="text-[11px] font-medium text-foreground flex items-center gap-3">
                                                <FiActivity className="text-text-muted" />
                                                System Logs
                                            </h3>
                                            <div className="space-y-3">
                                                <div className="flex items-center justify-between text-[11px] font-medium">
                                                    <span className="text-text-muted">Start date</span>
                                                    <span className="text-text-secondary">{project.createdAt ? format(new Date(project.createdAt), 'MMM dd, yyyy') : '-'}</span>
                                                </div>
                                                <div className="flex items-center justify-between text-[11px] font-medium">
                                                    <span className="text-text-muted">Timeline</span>
                                                    <span className="text-text-secondary">{project.startDate ? format(new Date(project.startDate), 'MMM dd') : 'TBD'} - {project.endDate ? format(new Date(project.endDate), 'MMM dd') : 'TBD'}</span>
                                                </div>
                                                <div className="flex items-center justify-between text-[11px] font-medium">
                                                    <span className="text-text-muted">Last updated</span>
                                                    <span className="text-success-text dark:text-success-text">Encrypted</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}

                        {activeView === 'tasks' && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                    <div>
                                        <h2 className="text-2xl font-medium text-foreground tracking-tight leading-none">Operation Center</h2>
                                        <p className="text-[11px] font-medium text-text-muted capitalize mt-2">{tasks.length} tasks in this project</p>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="flex bg-foreground/[0.03] p-1 rounded-2xl border border-card-border">
                                            <button className="h-10 px-6 rounded-xl bg-card text-foreground border border-card-border text-[11px] font-medium transition-all">Table</button>
                                            <button className="h-10 px-6 rounded-xl text-text-muted hover:text-foreground text-[11px] font-medium transition-all">Kanban</button>
                                        </div>
                                        <button className="flex items-center gap-2 h-12 px-8 rounded-2xl bg-foreground/[0.03] hover:bg-foreground/[0.06] border border-card-border text-foreground text-[11px] font-medium transition-all">
                                            <FiPlus className="w-4 h-4" />
                                            <span>Initialize</span>
                                        </button>
                                    </div>
                                </div>
                                <div className="rounded-2xl border border-card-border bg-card overflow-x-auto custom-scrollbar shadow-none">
                                    <table className="w-full text-left min-w-[1000px]">
                                        <tbody className="divide-y divide-card-border">
                                            {tasks.length === 0 ? (
                                                <tr>
                                                    <td colSpan={8} className="px-6 py-24 text-center">
                                                        <EmptyState icon={FiClipboard} title="No tasks yet" description="Tasks for this project will appear here." />
                                                    </td>
                                                </tr>
                                            ) : tasks.map(task => (
                                                <TaskCard 
                                                    key={task.id}
                                                    task={task}
                                                    users={users}
                                                    projects={allProjects}
                                                    updateTask={handleTaskUpdate}
                                                    deleteTask={handleTaskDelete}
                                                    hideProject={true}
                                                />
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {activeView === 'notes' && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                    <div>
                                        <h2 className="text-2xl font-medium text-foreground tracking-tight leading-none">Notes</h2>
                                        <p className="text-[11px] font-medium text-text-muted mt-2">Notes and documents for this project</p>
                                    </div>
                                    <button className="flex items-center gap-2 h-12 px-8 rounded-2xl bg-foreground/[0.03] hover:bg-foreground/[0.06] border border-card-border text-foreground text-[11px] font-medium transition-all">
                                        <FiPlus className="w-4 h-4" />
                                        <span>New note</span>
                                    </button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {notes.map(note => (
                                        <div key={note.id} className="h-[300px]">
                                            <NoteCard 
                                                note={note}
                                                onNoteUpdate={handleNoteUpdate}
                                                onNoteDelete={handleNoteDelete}
                                                viewMode="grid"
                                                availableUsers={users.map(u => ({ id: u.id, name: u.fullName, email: u.email, image: '' }))}
                                            />
                                        </div>
                                    ))}
                                    {notes.length === 0 && (
                                        <div className="col-span-full py-32 flex flex-col items-center gap-6 text-text-muted border border-card-border border-dashed rounded-2xl">
                                            <FiFileText className="w-16 h-16 opacity-10" />
                                            <p className="text-xs font-medium">No notes yet</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function MilestoneItem({ label, status, date }: { label: string, status: 'completed' | 'active' | 'pending', date: string }) {
    const statusColors = {
        completed: 'bg-success',
        active: 'bg-accent animate-pulse',
        pending: 'bg-foreground/10'
    };

    return (
        <div className="flex flex-col gap-2 group">
            <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${statusColors[status]}`} />
                <span className={`text-[11px] font-medium capitalize ${status === 'pending' ? 'text-text-muted/40' : 'text-text-muted'}`}>{date}</span>
            </div>
            <p className={`text-sm font-medium capitalize tracking-tight transition-colors ${status === 'pending' ? 'text-text-muted/60' : 'text-foreground group-hover:text-accent-text'}`}>{label}</p>
        </div>
    );
}

function TelemetryItem({ label, value, color, percentage }: { label: string, value: string, color: 'indigo' | 'emerald' | 'amber' | 'rose', percentage: number }) {
    const colors = {
        indigo: 'bg-accent',
        emerald: 'bg-success',
        amber: 'bg-warning',
        rose: 'bg-danger',
    };

    return (
        <div className="space-y-2.5">
            <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-text-muted capitalize">{label}</span>
                <span className={`text-[11px] font-medium capitalize ${percentage < 30 ? 'text-success-text' : percentage > 70 ? 'text-warning-text' : 'text-accent-text'}`}>{value}</span>
            </div>
            <div className="w-full h-1 bg-foreground/[0.06] rounded-full overflow-hidden">
                <div 
                    className={`h-full ${colors[color]} transition-all duration-1000 ease-out`} 
                    style={{ width: `${percentage}%` }} 
                />
            </div>
        </div>
    );
}

function NavButton({ active, onClick, icon: Icon, label }: { active: boolean, onClick: () => void, icon: any, label: string }) {
    return (
        <button 
            onClick={onClick}
            className={`w-full flex items-center gap-4 px-4 py-2.5 rounded-xl text-[11px] font-bold capitalize transition-all ${
 active 
 ? 'bg-card text-foreground border border-card-border' 
 : 'text-text-muted hover:text-foreground hover:bg-foreground/[0.03] border border-transparent blur-[0.3px] hover:blur-none'
 }`}
        >
            <Icon className={`w-4 h-4 ${active ? 'text-accent-text' : 'text-text-muted'}`} />
            <span>{label}</span>
            {active && <div className="ml-auto w-1 h-1 rounded-full bg-accent" />}
        </button>
    );
}

function ActivityItem({ user, action, target, time }: { user: User, action: string, target: string, time: string }) {
    return (
        <div className="flex items-center gap-3 group">
            <UserAvatarGroup users={[user]} size="sm" limit={1} />
            <div className="flex-1 min-w-0">
                <p className="text-[11px] font-medium text-foreground capitalize tracking-tight truncate">
                    <span className="text-text-muted font-bold">{(user.fullName || 'User').split(' ')[0]}</span> {action} <span className="text-accent-text">{target}</span>
                </p>
                <p className="text-[11px] font-bold text-text-muted/40 capitalize mt-0.5">{time}</p>
            </div>
        </div>
    );
}

function StatCard({ icon, color, label, value, subValue }: { icon: IconType, color: 'indigo' | 'emerald' | 'amber' | 'rose', label: string, value: string, subValue: string }) {
    const tones = { indigo: 'var(--accent)', emerald: 'var(--success)', amber: 'var(--warning)', rose: 'var(--status-qa)' };
    return <StatTile icon={icon} label={label} value={value} hint={subValue} tone={tones[color]} />;
}
