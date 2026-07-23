'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Project, statusMapping, priorityMapping } from '@/types/project';
import { User } from '@/types/user';
import { Client } from '@/types/client';
import { FiEdit2, FiTrash2, FiClock, FiCheck, FiX, FiDollarSign } from 'react-icons/fi';
import { format } from 'date-fns';
import { CustomDatePicker } from '@/components/ui/inputs/custom-date-picker';
import { CustomNumberInput } from '@/components/ui/inputs/custom-number-input';
import { createProject, updateProject, deleteProject } from '@/app/(dashboard)/[orgSlug]/projects/actions';
import { updateTask, deleteTask, createTask } from '@/app/(dashboard)/[orgSlug]/tasks/actions';
import UserAvatarGroup from '@/components/ui/user-avatar-group';
import TaskCard from '@/components/ui/tasks/task-card';
import { FiChevronRight, FiChevronDown, FiPlus, FiPieChart } from 'react-icons/fi';
import { TaskDonutChart } from './task-donut-chart';
import { useRouter } from 'next/navigation';
import { toast } from '@/lib/toast';
import { useConfirm } from '@/providers/confirmation-provider';

interface ProjectTableProps {
  projects: Project[];
  users: User[];
  clients: Client[];
  onSelectProject?: (project: Project) => void;
}

export function ProjectTable({ projects, users, clients, onSelectProject }: ProjectTableProps) {
  const confirm = useConfirm();
  const router = useRouter();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValues, setEditValues] = useState<{
    startDate: Date | null;
    endDate: Date | null;
    budget: number | '';
  }>({ startDate: null, endDate: null, budget: '' });

  const [newProjectValues, setNewProjectValues] = useState<{
    startDate: Date | null;
    endDate: Date | null;
    budget: number | '';
  }>({ startDate: null, endDate: null, budget: '' });

  const [newTaskDueDate, setNewTaskDueDate] = useState<Date | null>(null);

  const [isAdding, setIsAdding] = useState(false);
  const [expandedIds, setExpandedIds] = useState<number[]>([]);
  const [addingTaskId, setAddingTaskId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Combobox state

  
  const newNameRef = useRef<HTMLInputElement | null>(null);

  const toggleExpand = (id: number) => {
    setExpandedIds(prev => 
      prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id]
    );
  };

  const startEditing = (project: Project) => {
    setEditingId(project.id);
    setEditValues({
      startDate: project.startDate ? new Date(project.startDate) : null,
      endDate: project.endDate ? new Date(project.endDate) : null,
      budget: project.budget ?? ''
    });
  };

  const cancelEditing = () => {
    setEditingId(null);
  };

  useEffect(() => {
    if (isAdding && newNameRef.current) {
      setTimeout(() => newNameRef.current?.focus(), 0);
    }
  }, [isAdding]);

  const handleUpdate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    
    try {
      const formData = new FormData(event.currentTarget);
      const name = formData.get('name') as string;
      
      if (!name || name.trim().length === 0) {
        throw new Error('Project name is required');
      }

      formData.set('id', editingId!.toString());
      const result = await updateProject(formData);
      if (!result.success) {
        throw new Error(result.error);
      }
      toast.success('Project updated successfully');
      setEditingId(null);
    } catch (err: any) {
      const msg = err.message || 'Failed to update project';
      toast.error(msg);
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const formData = new FormData(event.currentTarget);
      const name = formData.get('name') as string;
      
      if (!name || name.trim().length === 0) {
        throw new Error('Project name is required');
      }

      const result = await createProject(formData);
      if (!result.success) {
        throw new Error(result.error);
      }
      toast.success('Project created successfully');
      setIsAdding(false);
      setNewProjectValues({ startDate: null, endDate: null, budget: '' });
    } catch (err: any) {
      const msg = err.message || 'Failed to create project';
      toast.error(msg);
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (project: Project) => {
    const confirmed = await confirm({
      title: 'Delete Project',
      message: `Are you sure you want to delete "${project.name}"? This action will remove all linked tasks and data. This cannot be undone.`,
      confirmText: 'Delete Project',
      type: 'danger'
    });

    if (confirmed) {
      const formData = new FormData();
      formData.set('id', project.id.toString());
      await deleteProject(formData);
    }
  };

  const statusColors = {
    planning: "bg-foreground/[0.03] text-text-muted border-card-border",
    in_progress: "bg-[var(--pastel-blue)]/10 text-[var(--pastel-blue)] border-[var(--pastel-blue)]/20",
    completed: "bg-[var(--pastel-emerald)]/10 text-[var(--pastel-emerald)] border-[var(--pastel-emerald)]/20",
    on_hold: "bg-[var(--pastel-amber)]/10 text-[var(--pastel-amber)] border-[var(--pastel-amber)]/20",
  };

  const priorityColors = {
    low: "text-text-muted",
    medium: "text-amber-400",
    high: "text-rose-400",
  };

  const getTaskStats = (project: Project) => {
    const total = project.tasks?.length || 0;
    const done = project.tasks?.filter(t => t.status === 'DONE').length || 0;
    const inProgress = project.tasks?.filter(t => ['IN_PROGRESS', 'REVIEW', 'QA'].includes(t.status)).length || 0;
    const todo = total - done - inProgress;
    return { total, done, inProgress, todo };
  };


  return (
    <div className="w-full space-y-4">
      {error && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm animate-in fade-in slide-in-from-top-2">
          {error}
        </div>
      )}
      <div className="glass rounded-2xl overflow-hidden flex flex-col border border-card-border bg-card/30 backdrop-blur-md">
        <div className="overflow-x-auto">
      <table className="w-full text-left text-sm min-w-[1400px]">
        <thead className="bg-foreground/[0.03] border-b border-card-border">
          <tr>
            <th scope="col" className="px-6 py-4 text-[11px] font-bold text-text-muted uppercase tracking-wider whitespace-nowrap sticky left-0 z-20 bg-card/90 backdrop-blur-md border-r border-card-border">Project</th>
            <th scope="col" className="px-6 py-4 text-[11px] font-bold text-text-muted uppercase tracking-wider text-center whitespace-nowrap">Progress</th>
            <th scope="col" className="px-6 py-4 text-[11px] font-bold text-text-muted uppercase tracking-wider whitespace-nowrap">Key</th>
            <th scope="col" className="px-6 py-4 text-[11px] font-bold text-text-muted uppercase tracking-wider whitespace-nowrap">Status</th>
            <th scope="col" className="px-6 py-4 text-[11px] font-bold text-text-muted uppercase tracking-wider whitespace-nowrap">Priority</th>
            <th scope="col" className="px-6 py-4 text-[11px] font-bold text-text-muted uppercase tracking-wider whitespace-nowrap">Owner</th>
            <th scope="col" className="px-6 py-4 text-[11px] font-bold text-text-muted uppercase tracking-wider whitespace-nowrap">Client</th>
            <th scope="col" className="px-6 py-4 text-[11px] font-bold text-text-muted uppercase tracking-wider whitespace-nowrap">Timeline</th>
            <th scope="col" className="px-6 py-4 text-[11px] font-bold text-text-muted uppercase tracking-wider whitespace-nowrap">Budget</th>
            <th scope="col" className="px-6 py-4 text-[11px] font-bold text-text-muted uppercase tracking-wider whitespace-nowrap">Time Logged</th>
            <th scope="col" className="px-6 py-4 text-right text-[11px] font-bold text-text-muted uppercase tracking-wider whitespace-nowrap sticky right-0 z-20 bg-card/90 backdrop-blur-md border-l border-card-border">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {projects.map((project) => {
            const isEditing = editingId === project.id;
            const owner = users.find(u => u.id === project.ownerId);
            const client = clients.find(c => c.id === project.clientId);
            const totalHours = (project.tasks || []).reduce((sum, t) => sum + (t.totalHours ?? 0), 0);

            if (isEditing) {
              return (
                <React.Fragment key={project.id}>
                <tr className="bg-white/[0.02]">
                  <td colSpan={11} className="p-0">
                    <form onSubmit={handleUpdate} className="contents">
                      <table className="w-full">
                        <tbody>
                          <tr>
                            <td className="px-4 py-2 w-[200px]">
                              <input
                                type="text"
                                name="name"
                                defaultValue={project.name}
                                required
                                className="w-full bg-foreground/[0.03] border border-card-border rounded px-2 py-1 text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
                              />
                            </td>
                            <td className="px-4 py-2 w-[100px]">
                              <input
                                type="text"
                                name="key"
                                defaultValue={project.key || ''}
                                className="w-full bg-foreground/[0.03] border border-card-border rounded px-2 py-1 text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
                              />
                            </td>
                            <td className="px-4 py-2 w-[120px]">
                              <select
                                name="status"
                                defaultValue={project.status}
                                className="w-full bg-foreground/[0.03] border border-card-border rounded px-2 py-1 text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
                              >
                                <option value="planning">Planning</option>
                                <option value="in_progress">In Progress</option>
                                <option value="completed">Completed</option>
                                <option value="on_hold">On Hold</option>
                              </select>
                            </td>
                            <td className="px-4 py-2 w-[100px]">
                              <select
                                name="priority"
                                defaultValue={project.priority}
                                className="w-full bg-foreground/[0.03] border border-card-border rounded px-2 py-1 text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
                              >
                                <option value="low">Low</option>
                                <option value="medium">Medium</option>
                                <option value="high">High</option>
                              </select>
                            </td>
                            <td className="px-4 py-2 w-[120px]">
                              <select
                                name="ownerId"
                                defaultValue={project.ownerId || ''}
                                className="w-full bg-foreground/[0.03] border border-card-border rounded px-2 py-1 text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
                              >
                                <option value="">None</option>
                                {users.map(u => (
                                  <option key={u.id} value={u.id}>{u.fullName}</option>
                                ))}
                              </select>
                            </td>
                            <td className="px-4 py-2 w-[120px]">
                              <select
                                name="clientId"
                                defaultValue={project.clientId || ''}
                                className="w-full bg-foreground/[0.03] border border-card-border rounded px-2 py-1 text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
                              >
                                <option value="">None</option>
                                {clients.map(c => (
                                  <option key={c.id} value={c.id}>{c.companyName}</option>
                                ))}
                              </select>
                            </td>
                            <td className="px-4 py-2 w-[110px]">
                              <CustomDatePicker
                                value={editValues.startDate}
                                onChange={(date) => setEditValues(prev => ({ ...prev, startDate: date }))}
                                name="startDate"
                                className="w-full"
                                placeholder="Start"
                              />
                            </td>
                            <td className="px-4 py-2 w-[110px]">
                              <CustomDatePicker
                                value={editValues.endDate}
                                onChange={(date) => setEditValues(prev => ({ ...prev, endDate: date }))}
                                name="endDate"
                                className="w-full"
                                placeholder="End"
                                minDate={editValues.startDate || undefined}
                              />
                            </td>
                            <td className="px-4 py-2 w-[140px]">
                              <CustomNumberInput
                                value={editValues.budget}
                                onChange={(val) => setEditValues(prev => ({ ...prev, budget: val }))}
                                name="budget"
                                className="w-full"
                                placeholder="0"
                                min={0}
                              />
                            </td>
                            <td className="px-4 py-2 w-[80px]">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  type="submit"
                                  disabled={isSubmitting}
                                  className="p-1 rounded hover:bg-emerald-500/10 text-emerald-400 transition-colors disabled:opacity-50"
                                  title="Save"
                                >
                                  {isSubmitting ? (
                                    <div className="w-3.5 h-3.5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                                  ) : (
                                    <FiCheck className="w-4 h-4" />
                                  )}
                                </button>
                                <button
                                  type="button"
                                  onClick={cancelEditing}
                                  className="p-1 rounded hover:bg-rose-500/10 text-rose-400 transition-colors"
                                  title="Cancel"
                                >
                                  <FiX className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </form>
                  </td>
                </tr>
                </React.Fragment>
              );
            }

            return (
              <React.Fragment key={project.id}>
              <tr 
                className={`group hover:bg-foreground/[0.03] transition-colors items-center cursor-pointer ${expandedIds.includes(project.id) ? 'bg-foreground/[0.03]' : ''}`}
                onClick={() => router.push(`/projects/${project.id}`)}
              >
                <td className="px-6 py-3 sticky left-0 z-10 bg-card/90 backdrop-blur-md border-r border-card-border">
                  <div className="flex items-center gap-3">
                    <div className={`w-1.5 h-1.5 rounded-full ${statusColors[project.status].split(' ')[1].replace('text-', 'bg-')}`} />
                    <div className="font-bold text-foreground text-xs tracking-tight truncate group-hover:text-indigo-500 transition-colors uppercase">{project.name}</div>
                  </div>
                </td>
                <td className="px-6 py-3 text-center">
                    <TaskDonutChart {...getTaskStats(project)} size={40} />
                </td>
                <td className="px-6 py-3 whitespace-nowrap">
                  {project.key && (
                    <div className="px-2 py-0.5 rounded-md text-[10px] font-bold font-mono text-text-muted bg-foreground/[0.03] border border-card-border uppercase tracking-wider inline-block">
                      {project.key}
                    </div>
                  )}
                </td>
                <td className="px-6 py-3 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium uppercase tracking-wider border whitespace-nowrap ${statusColors[project.status]}`}>
                    {statusMapping[project.status]}
                  </span>
                </td>
                <td className="px-6 py-3 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium uppercase tracking-wider border whitespace-nowrap ${
                    project.priority === 'high' ? 'bg-[var(--pastel-rose)]/10 text-[var(--pastel-rose)] border-[var(--pastel-rose)]/20 shadow-[0_0_15px_rgba(244,63,94,0.1)]' :
                    project.priority === 'medium' ? 'bg-[var(--pastel-amber)]/10 text-[var(--pastel-amber)] border-[var(--pastel-amber)]/20' :
                    'bg-[var(--pastel-emerald)]/10 text-[var(--pastel-emerald)] border-[var(--pastel-emerald)]/20'
                  }`}>
                    {priorityMapping[project.priority]}
                  </span>
                </td>
                <td className="px-6 py-3 whitespace-nowrap">
                  {owner ? (
                    <div className="flex items-center gap-2">
                      <UserAvatarGroup users={[owner]} size="sm" limit={1} />
                      <span className="text-[10px] font-bold text-text-muted group-hover:text-foreground transition-colors uppercase tracking-tight">{owner.fullName}</span>
                    </div>
                  ) : '-'}
                </td>
                <td className="px-6 py-3 whitespace-nowrap">
                  <span className="text-[10px] font-bold text-text-muted uppercase tracking-tight group-hover:text-foreground transition-colors">
                    {client ? client.companyName : <span className="text-text-muted/30 italic">No Client</span>}
                  </span>
                </td>
                <td className="px-6 py-3 whitespace-nowrap">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] font-bold text-foreground/80 uppercase tracking-tight">
                      {project.startDate ? format(new Date(project.startDate), "MMM dd") : '-'}
                    </span>
                    <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider opacity-50">
                      {project.endDate ? `UNTIL ${format(new Date(project.endDate), "MMM dd, yyyy")}` : '-'}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-3 whitespace-nowrap">
                  {project.budget ? (
                    <div className="flex flex-col">
                      <span className="text-[11px] font-bold text-foreground tracking-tight uppercase">
                        ${project.budget.toLocaleString()}
                      </span>
                      <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
                        {project.currency}
                      </span>
                    </div>
                  ) : <span className="text-text-muted/30 italic text-[10px]">-</span>}
                </td>
                {/* Time Logged */}
                <td className="px-6 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-1.5">
                    <FiClock className="w-3 h-3 text-text-muted flex-shrink-0" />
                    <span className="text-xs font-bold text-foreground tabular-nums">
                      {totalHours > 0 ? `${totalHours.toFixed(1)}h` : <span className="text-text-muted/30 italic text-[10px]">-</span>}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-3 text-right sticky right-0 z-10 bg-card/90 backdrop-blur-md border-l border-card-border">
                  <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300">
                    <button
                      onClick={(e) => { e.stopPropagation(); startEditing(project); }}
                      className="p-1.5 rounded-xl bg-foreground/[0.03] hover:bg-foreground/[0.06] text-text-muted hover:text-foreground border border-card-border transition-all"
                      title="Edit"
                    >
                      <FiEdit2 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(project); }}
                      className="p-2 rounded-xl bg-red-500/5 hover:bg-red-500/10 text-text-muted hover:text-red-400 border border-card-border hover:border-red-500/20 transition-all"
                      title="Delete"
                    >
                      <FiTrash2 className="w-3 h-3" />
                    </button>
                    <div className="p-1.5 rounded-xl bg-foreground/[0.03] border border-card-border text-text-muted">
                      <FiChevronRight className={`w-3.5 h-3.5 transition-transform duration-300 ${expandedIds.includes(project.id) ? 'rotate-90 text-indigo-500' : ''}`} />
                    </div>
                  </div>
                </td>
              </tr>
              {expandedIds.includes(project.id) && (
                <tr className="bg-foreground/[0.02]">
                  <td colSpan={11} className="p-0 border-none">
                    <div className="sticky left-0 p-6 pl-12 bg-card/50 backdrop-blur-sm border-y border-card-border w-full">
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider">Tasks ({project.tasks?.length || 0})</h4>
                        <button 
                          onClick={() => setAddingTaskId(addingTaskId === project.id ? null : project.id)}
                          className="flex items-center gap-1 text-[11px] font-bold text-text-muted hover:text-foreground transition-all px-2 py-1 rounded bg-foreground/[0.03] hover:bg-foreground/[0.06] border border-card-border uppercase tracking-wider"
                        >
                          <FiPlus className="w-3 h-3" />
                          <span>Add Task</span>
                        </button>
                      </div>

                      {addingTaskId === project.id && (
                        <div className="mb-4 p-4 rounded-xl bg-foreground/[0.03] border border-indigo-500/20 animate-in fade-in slide-in-from-top-2">
                           <form onSubmit={async (e) => {
                             // ... rest same ...
                           }}
                           className="space-y-4"
                           >
                             <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                               <div className="md:col-span-2">
                                 <input 
                                   type="text" 
                                   name="name" 
                                   placeholder="Task Name *" 
                                   required 
                                   className="w-full bg-background/50 border border-card-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
                                 />
                               </div>
                               <div>
                                 <select 
                                   name="priority" 
                                   defaultValue="medium"
                                   className="w-full bg-background/50 border border-card-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500/50 appearance-none cursor-pointer"
                                 >
                                   <option value="low">Low Priority</option>
                                   <option value="medium">Medium Priority</option>
                                   <option value="high">High Priority</option>
                                 </select>
                               </div>
                               <div>
                                 <CustomDatePicker
                                   value={newTaskDueDate}
                                   onChange={setNewTaskDueDate}
                                   name="dueDate"
                                   placeholder="Due Date"
                                   className="w-full"
                                 />
                               </div>
                             </div>
                             <div className="flex items-center gap-4">
                               <div className="flex-1">
                                 <textarea 
                                   name="description" 
                                   placeholder="Add a description..." 
                                   rows={1}
                                   className="w-full bg-background/50 border border-card-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500/50 resize-none"
                                 />
                               </div>
                               <div className="flex gap-2">
                                 <button 
                                   type="submit" 
                                   disabled={isSubmitting}
                                   className="px-4 py-2 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-all font-medium text-sm flex items-center gap-2 border border-emerald-500/20 disabled:opacity-50"
                                 >
                                   {isSubmitting ? (
                                     <div className="h-3.5 w-3.5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin"></div>
                                   ) : (
                                     <FiCheck className="w-4 h-4" />
                                   )}
                                   <span>{isSubmitting ? 'Creating...' : 'Create'}</span>
                                 </button>
                                 <button type="button" onClick={() => setAddingTaskId(null)} className="px-3 py-2 rounded-lg bg-foreground/[0.03] text-text-muted hover:text-foreground transition-all text-sm border border-card-border">
                                   <FiX className="w-4 h-4" />
                                 </button>
                               </div>
                             </div>
                           </form>
                        </div>
                      )}

                      {project.tasks && project.tasks.length > 0 ? (
                        <div className="overflow-x-auto rounded-xl border border-card-border bg-background/50">
                            <table className="w-full text-left text-sm min-w-[1000px]">
                                <thead className="bg-foreground/[0.03] text-text-muted font-bold text-[11px] uppercase tracking-wider">
                                    <tr>
                                        <th className="px-4 py-2">Name</th>
                                        <th className="px-4 py-2">Description</th>
                                        <th className="px-4 py-2">Due Date</th>
                                        <th className="px-4 py-2">Priority</th>
                                        <th className="px-4 py-2">Assignee</th>
                                        {/* Project hidden */}
                                        <th className="px-4 py-2">Status</th>
                                        <th className="px-4 py-2 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {project.tasks?.map(task => (
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
                        !addingTaskId && <div className="text-sm text-text-muted italic py-2">No tasks found for this project.</div>
                      )}
                    </div>
                  </td>
                </tr>
              )}
              </React.Fragment>
            );
          })}

          {/* Add New Row */}
          {isAdding && (
            <tr className="bg-white/[0.02]">
              <td colSpan={11} className="p-0">
                <form onSubmit={handleCreate} className="contents">
                  <table className="w-full">
                    <tbody>
                      <tr>
                        <td className="px-4 py-2 w-[200px]">
                          <input
                            ref={newNameRef}
                            type="text"
                            name="name"
                            required
                            placeholder="Project name"
                            className="w-full bg-foreground/[0.03] border border-card-border rounded px-2 py-1 text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500/50 placeholder:text-text-muted/30"
                          />
                        </td>
                        <td className="px-4 py-2 w-[100px]">
                          <input
                            type="text"
                            name="key"
                            placeholder="PROJ-123"
                            className="w-full bg-foreground/[0.03] border border-card-border rounded px-2 py-1 text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500/50 placeholder:text-text-muted/30"
                          />
                        </td>
                        <td className="px-4 py-2 w-[120px]">
                          <select
                            name="status"
                            defaultValue="planning"
                            className="w-full bg-foreground/[0.03] border border-card-border rounded px-2 py-1 text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
                          >
                            <option value="planning">Planning</option>
                            <option value="in_progress">In Progress</option>
                            <option value="completed">Completed</option>
                            <option value="on_hold">On Hold</option>
                          </select>
                        </td>
                        <td className="px-4 py-2 w-[100px]">
                          <select
                            name="priority"
                            defaultValue="medium"
                            className="w-full bg-foreground/[0.03] border border-card-border rounded px-2 py-1 text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
                          >
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                          </select>
                        </td>
                        <td className="px-4 py-2 w-[120px]">
                          <select
                            name="ownerId"
                            className="w-full bg-foreground/[0.03] border border-card-border rounded px-2 py-1 text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
                          >
                            <option value="">None</option>
                            {users.map(u => (
                              <option key={u.id} value={u.id}>{u.fullName}</option>
                            ))}
                          </select>
                        </td>

                        <td className="px-4 py-2 w-[120px]">
                          <select
                            name="clientId"
                            className="w-full bg-foreground/[0.03] border border-card-border rounded px-2 py-1 text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
                          >
                            <option value="">None</option>
                            {clients.map(c => (
                              <option key={c.id} value={c.id}>{c.companyName}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-2 w-[110px]">
                          <CustomDatePicker
                            value={newProjectValues.startDate}
                            onChange={(date) => setNewProjectValues(prev => ({ ...prev, startDate: date }))}
                            name="startDate"
                            className="w-full"
                            placeholder="Start"
                          />
                        </td>
                        <td className="px-4 py-2 w-[110px]">
                          <CustomDatePicker
                            value={newProjectValues.endDate}
                            onChange={(date) => setNewProjectValues(prev => ({ ...prev, endDate: date }))}
                            name="endDate"
                            className="w-full"
                            placeholder="End"
                            minDate={newProjectValues.startDate || undefined}
                          />
                        </td>
                        <td className="px-4 py-2 w-[140px]">
                          <CustomNumberInput
                            value={newProjectValues.budget}
                            onChange={(val) => setNewProjectValues(prev => ({ ...prev, budget: val }))}
                            name="budget"
                            className="w-full"
                            placeholder="0"
                            min={0}
                          />
                        </td>
                        <td className="px-4 py-2 w-[80px]">
                          <div className="flex items-center justify-end gap-1">
                            <button
                               type="submit"
                               disabled={isSubmitting}
                               className="p-1 rounded hover:bg-emerald-500/10 text-emerald-400 transition-colors disabled:opacity-50"
                               title="Save"
                             >
                               {isSubmitting ? (
                                 <div className="w-3.5 h-3.5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                               ) : (
                                 <FiCheck className="w-4 h-4" />
                               )}
                             </button>
                            <button
                              type="button"
                              onClick={() => setIsAdding(false)}
                              className="p-1 rounded hover:bg-rose-500/10 text-rose-400 transition-colors"
                              title="Cancel"
                            >
                              <FiX className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </form>
              </td>
            </tr>
          )}

            <tr className="sticky bottom-0 z-10">
              <td colSpan={10} className="px-4 py-3 sticky left-0">
                <button
                  onClick={() => setIsAdding(true)}
                  className="flex items-center gap-2 p-1.5 rounded-xl bg-foreground/[0.03] hover:bg-foreground/[0.06] border border-card-border hover:border-foreground/10 text-sm text-text-muted hover:text-foreground transition-all duration-200 group w-fit"
                >
                  <div className="p-1 rounded-lg bg-foreground/[0.03] group-hover:bg-foreground/[0.06] transition-colors border border-card-border">
                    <FiPlus className="w-4 h-4" />
                  </div>
                  <span className="pr-2 font-bold uppercase tracking-wider text-[11px]">Initialize mission</span>
                </button>
              </td>
            </tr>

          {projects.length === 0 && !isAdding && (
            <tr>
              <td colSpan={11} className="px-6 py-12 text-center text-text-muted">
                No projects found. Click &quot;Initialize mission&quot; to create one.
              </td>
            </tr>
          )}
        </tbody>
      </table>
        </div>
      </div>
    </div>
  );
}
