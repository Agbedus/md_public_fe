'use client';

import React, { useState } from 'react';
import { Project, statusMapping, priorityMapping } from '@/types/project';
import { Task } from '@/types/task';
import { Note } from '@/types/note';
import { User } from '@/types/user';
import { Client } from '@/types/client';
import { FiX, FiCheckSquare, FiFileText, FiCalendar, FiDollarSign, FiUsers, FiClock, FiPlus, FiMaximize2 } from 'react-icons/fi';
import { format } from 'date-fns';
import Link from 'next/link';
import UserAvatarGroup from '@/components/ui/user-avatar-group';
import TaskCard from '@/components/ui/tasks/task-card';
import NoteCard from '@/components/ui/notes/note-card';
import { updateTask, deleteTask } from '@/app/(dashboard)/[orgSlug]/tasks/actions';
import { updateNote, deleteNote } from '@/app/(dashboard)/[orgSlug]/notes/actions';

interface ProjectDetailsProps {
    project: Project;
    users: User[];
    clients: Client[];
    notes: Note[];
    projects: Project[];
    onClose: () => void;
}

export function ProjectDetails({ project, users, clients, notes, projects, onClose }: ProjectDetailsProps) {
    const [activeTab, setActiveTab] = useState<'tasks' | 'notes'>('tasks');

    const projectTasks = project.tasks || [];
    const projectNotes = notes.filter(n => projectTasks.some(t => t.id === n.task_id));

    const client = clients.find(c => c.id === project.clientId);
    const owner = users.find(u => u.id === project.ownerId);

    const totalBudget = project.budget || 0;
    const spent = project.spent || 0;
    const budgetProgress = totalBudget > 0 ? (spent / totalBudget) * 100 : 0;

    const completedTasks = projectTasks.filter(t => t.status === 'DONE').length;
    const taskProgress = projectTasks.length > 0 ? (completedTasks / projectTasks.length) * 100 : 0;

    return (
        <div className="fixed inset-y-0 right-0 w-full max-w-2xl z-[100] animate-in slide-in-from-right duration-500 shadow-2xl">
            <div className="h-full bg-background border-l border-card-border flex flex-col">
                {/* Header */}
                <div className="p-8 border-b border-card-border relative overflow-hidden bg-foreground/[0.02]">
                    <div className="absolute top-0 right-0 p-8 flex items-center gap-2">
                        <Link 
                            href={`/projects/${project.id}`}
                            className="flex items-center gap-2 h-10 px-4 rounded-xl bg-foreground/[0.03] hover:bg-foreground/[0.06] border border-card-border text-[10px] font-black text-text-muted hover:text-foreground uppercase tracking-widest transition-all"
                        >
                            <FiMaximize2 className="w-3.5 h-3.5" />
                            <span>Command Center</span>
                        </Link>
                        <button onClick={onClose} className="p-2.5 rounded-xl bg-foreground/[0.03] hover:bg-foreground/[0.06] text-text-muted hover:text-foreground transition-all border border-card-border">
                            <FiX className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="flex items-center gap-3 mb-6">
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${
                            project.status === 'completed' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-500 border-emerald-500/20' :
                            project.status === 'in_progress' ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20' :
                            'bg-foreground/[0.03] text-text-muted border-card-border'
                        }`}>
                            {statusMapping[project.status]}
                        </span>
                        <div className="px-2.5 py-1 rounded-lg text-[10px] font-black font-numbers text-text-muted bg-foreground/[0.03] border border-card-border uppercase tracking-widest leading-none">
                            {project.key}
                        </div>
                    </div>

                    <h2 className="text-4xl font-black text-foreground tracking-tightest leading-none mb-8 uppercase italic">
                        {project.name}
                    </h2>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        <div className="flex flex-col gap-1.5">
                            <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">Client Partner</span>
                            <span className="text-xs font-bold text-foreground uppercase tracking-tight truncate">
                                {client ? client.companyName : 'Internal Asset'}
                            </span>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">Mission Lead</span>
                            <div className="flex items-center gap-2">
                                {owner ? (
                                    <>
                                        <UserAvatarGroup users={[owner]} size="sm" limit={1} />
                                        <span className="text-xs font-bold text-foreground uppercase tracking-tight truncate">{owner.fullName}</span>
                                    </>
                                ) : <span className="text-xs font-bold text-text-muted italic">Unassigned</span>}
                            </div>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">Capital Intel</span>
                            <div className="flex flex-col">
                                <span className="text-xs font-bold text-foreground uppercase tracking-tight">${spent.toLocaleString()} / ${totalBudget.toLocaleString()}</span>
                                <div className="w-full h-1 bg-foreground/[0.05] rounded-full mt-2 overflow-hidden">
                                    <div 
                                        className="h-full bg-gradient-to-r from-emerald-500 to-indigo-500"
                                        style={{ width: `${Math.min(budgetProgress, 100)}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">Timeline</span>
                            <div className="flex items-center gap-1.5 text-xs font-bold text-foreground uppercase tracking-tight">
                                <FiCalendar className="w-3.5 h-3.5 text-indigo-500" />
                                <span>{project.endDate ? format(new Date(project.endDate), 'MMM dd, yyyy') : 'TBD'}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex px-8 border-b border-card-border bg-background">
                    <button 
                        onClick={() => setActiveTab('tasks')}
                        className={`py-6 px-6 text-[10px] font-black uppercase tracking-[0.2em] border-b-2 transition-all ${activeTab === 'tasks' ? 'border-indigo-500 text-foreground' : 'border-transparent text-text-muted hover:text-foreground'}`}
                    >
                        Roadmap ({projectTasks.length})
                    </button>
                    <button 
                        onClick={() => setActiveTab('notes')}
                        className={`py-6 px-6 text-[10px] font-black uppercase tracking-[0.2em] border-b-2 transition-all ${activeTab === 'notes' ? 'border-indigo-500 text-foreground' : 'border-transparent text-text-muted hover:text-foreground'}`}
                    >
                        Intelligence ({projectNotes.length})
                    </button>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-background">
                    {activeTab === 'tasks' ? (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">Deployment Pipeline</h3>
                                <button className="flex items-center gap-2 h-9 px-4 rounded-xl bg-foreground/[0.03] hover:bg-foreground/[0.06] border border-card-border text-[9px] font-black uppercase tracking-widest text-text-muted hover:text-foreground transition-all">
                                    <FiPlus className="w-3.5 h-3.5" />
                                    <span>New Objective</span>
                                </button>
                            </div>
                            
                            {projectTasks.length > 0 ? (
                                <div className="rounded-2xl overflow-x-auto border border-card-border custom-scrollbar shadow-sm">
                                    <table className="w-full text-left text-sm min-w-[800px]">
                                        <tbody className="divide-y divide-card-border">
                                            {projectTasks.map(task => (
                                                <TaskCard 
                                                    key={task.id}
                                                    task={task}
                                                    users={users}
                                                    projects={projects}
                                                    updateTask={updateTask}
                                                    deleteTask={deleteTask}
                                                    hideProject={true}
                                                />
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="py-20 flex flex-col items-center gap-4 text-text-muted/30">
                                    <FiCheckSquare className="w-12 h-12" />
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">No Active Deployments</span>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-8">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">Strategic Context</h3>
                                <button className="flex items-center gap-2 h-9 px-4 rounded-xl bg-foreground/[0.03] hover:bg-foreground/[0.06] border border-card-border text-[9px] font-black uppercase tracking-widest text-text-muted hover:text-foreground transition-all">
                                    <FiPlus className="w-3.5 h-3.5" />
                                    <span>New Intel</span>
                                </button>
                            </div>

                            {projectNotes.length > 0 ? (
                                <div className="grid grid-cols-1 gap-6">
                                    {projectNotes.map(note => (
                                        <div key={note.id} className="h-[280px]">
                                            <NoteCard 
                                                note={note}
                                                onNoteUpdate={updateNote}
                                                onNoteDelete={deleteNote}
                                                viewMode="grid"
                                                availableUsers={users.map(u => ({ id: u.id, name: u.fullName, email: u.email, image: '' }))}
                                            />
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="py-20 flex flex-col items-center gap-4 text-text-muted/30">
                                    <FiFileText className="w-12 h-12" />
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">Zero Data Points</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>
                
                {/* Footer / Stats */}
                <div className="p-8 border-t border-card-border bg-foreground/[0.02]">
                    <div className="flex items-center justify-between">
                        <div className="flex flex-col gap-2">
                            <span className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">Operational Progress</span>
                            <div className="flex items-center gap-4">
                                <div className="w-48 h-1.5 bg-foreground/[0.05] rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]"
                                        style={{ width: `${taskProgress}%` }}
                                    />
                                </div>
                                <span className="text-xs font-black text-foreground tracking-widest uppercase">{Math.round(taskProgress)}%</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-8">
                            <div className="flex flex-col items-end gap-1">
                                <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">Created</span>
                                <span className="text-[10px] font-bold text-text-secondary uppercase tracking-tight">{project.createdAt ? format(new Date(project.createdAt), 'MMM dd, yyyy') : '-'}</span>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                                <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">Last Intel</span>
                                <span className="text-[10px] font-bold text-text-secondary uppercase tracking-tight">{project.updatedAt ? format(new Date(project.updatedAt), 'MMM dd, yyyy') : '-'}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
