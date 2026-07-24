'use client';

import React, { useState, useMemo } from 'react';
import { Project } from '@/types/project';
import { User } from '@/types/user';
import { Client } from '@/types/client';
import { Note } from '@/types/note';
import { FiPlus, FiGrid, FiList, FiSearch, FiFilter, FiX, FiCheck } from 'react-icons/fi';
import { ProjectCard } from './project-card';
import { ProjectTable } from './project-table';
import { ProjectDetails } from './project-details';
import { ProjectFormFields } from './project-form-fields';
import { FiTrendingUp, FiCheckSquare, FiDollarSign, FiActivity, FiPieChart as FiPie } from 'react-icons/fi';
import { createProject, updateProject, deleteProject } from '@/app/(dashboard)/[orgSlug]/projects/actions';
import { Sparkline } from "@/components/ui/sparkline";
import { subDays, isSameDay } from 'date-fns';
import { useProjects } from '@/hooks/use-projects';
import { createOptimisticProject, updateOptimisticProject } from '@/lib/optimistic-utils';
import { optimisticListRevalidate } from '@/lib/optimistic-swr';
import { toast } from '@/lib/toast';
import { useConfirm } from '@/providers/confirmation-provider';

import { useUsers } from '@/hooks/use-users';
import { useClients } from '@/hooks/use-clients';
import { useNotes } from '@/hooks/use-notes';
import { useTasks } from '@/hooks/use-tasks';
import { Task } from '@/types/task';
import ProjectsLoading from '@/app/(dashboard)/[orgSlug]/projects/loading';

interface ProjectsPageClientProps {
  initialProjects?: Project[];
  initialUsers?: User[];
  initialClients?: Client[];
  initialNotes?: Note[];
  initialTasks?: Task[];
}

export default function ProjectsPageClient({ 
  initialProjects = [], 
  initialUsers = [], 
  initialClients = [], 
  initialNotes = [],
  initialTasks = []
}: ProjectsPageClientProps) {
  const confirm = useConfirm();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // SWR Hooks for background sync
  const { projects: serverProjects, mutate, isLoading: projectsLoading } = useProjects({ initialProjects });
  const { users } = useUsers(initialUsers);
  const { clients } = useClients({ initialClients });
  const { notes } = useNotes({ initialNotes });
  // Use a high limit to ensure we get all tasks for progress calculation
  const { tasks: allTasks, isLoading: tasksLoading } = useTasks({ users, initialTasks, limit: 1000 });

  // Only show skeleton if we have no data and are loading
  const isLoading = projectsLoading && serverProjects.length === 0;

  // Optimistic UI is driven by SWR's `optimisticData` in the handlers below, so
  // the rendered list is simply whatever SWR currently holds.
  const optimisticProjects = serverProjects;

  // Combine projects with their tasks for accurate completion tracking
  const projectsWithTasks = useMemo(() => {
    return optimisticProjects.map(project => {
      // Find tasks for this project from the pool
      const linkedTasks = allTasks.filter(task => Number(task.projectId) === project.id);
      
      // If we found tasks in allTasks, use them. 
      // Otherwise, if allTasks is currently empty (e.g. during a re-fetch) 
      // but the project object itself has tasks (from initial server load), keep those.
      const tasksToUse = (linkedTasks.length === 0 && project.tasks && project.tasks.length > 0) 
        ? project.tasks 
        : linkedTasks;

      return {
        ...project,
        tasks: tasksToUse
      };
    });
  }, [optimisticProjects, allTasks]);

  // Calculate trends for Portfolio Intelligence
  const trends = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => subDays(new Date(), 6 - i));
    
    const getTrend = (items: Project[], status?: Project['status']) => {
      return last7Days.map(day => 
        items.filter(item => {
          const date = item.startDate ? new Date(item.startDate) : (item.createdAt ? new Date(item.createdAt) : null); 
          if (!date) return false;
          const matchesDate = isSameDay(date, day);
          const matchesStatus = status ? item.status === status : true;
          return matchesDate && matchesStatus;
        }).length
      );
    };

    return {
      active: getTrend(projectsWithTasks, 'in_progress'),
      completed: getTrend(projectsWithTasks, 'completed'),
      total: getTrend(projectsWithTasks),
    };
  }, [projectsWithTasks]);

  const filteredProjects = useMemo(() => {
    return projectsWithTasks.filter(project => {
      const matchesSearch = project.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            (project.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
      const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [projectsWithTasks, searchQuery, statusFilter]);

  const handleCreate = async (formData: FormData) => {
    const newProject = createOptimisticProject(formData);
    setIsCreating(true);
    setIsCreateModalOpen(false);

    try {
      await mutate(
        async () => {
          const result = await createProject(formData);
          if (!result?.success) throw new Error(result?.error || 'Failed to create project');
          return undefined;
        },
        optimisticListRevalidate<Project>(list => [newProject, ...list]),
      );
      toast.success('Project initiated successfully');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'An unexpected error occurred');
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdate = async (formData: FormData) => {
    if (!editingProject) return;
    const id = editingProject.id;
    formData.set('id', id.toString());

    const updatedProject = updateOptimisticProject(editingProject, formData);
    setIsUpdating(true);
    setEditingProject(null);

    try {
      await mutate(
        async () => {
          const result = await updateProject(formData);
          if (!result?.success) throw new Error(result?.error || 'Failed to update project');
          return undefined;
        },
        optimisticListRevalidate<Project>(list =>
          list.map(p => (p.id === id ? updatedProject : p)),
        ),
      );
      toast.success('Project updated');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update project');
    } finally {
      setIsUpdating(false);
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
      try {
        await mutate(
          async () => {
            const formData = new FormData();
            formData.set('id', project.id.toString());
            const result = await deleteProject(formData);
            // Previously the result was discarded, so a rejected delete still
            // reported success and the row silently came back on next fetch.
            if (!result?.success) throw new Error(result?.error || 'Failed to delete project');
            return undefined;
          },
          optimisticListRevalidate<Project>(list => list.filter(p => p.id !== project.id)),
        );
        toast.success('Project deleted');
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Failed to delete project');
      }
    }
  };

  if (isLoading) {
    return <ProjectsLoading />;
  }

  return (
    <div className="px-4 py-8 max-w-[1600px] mx-auto min-h-screen">
      {/* Header Section */}
      <div className="hidden lg:flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6 mb-10">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2 tracking-tight">Strategic portfolio</h1>
          <p className="text-text-muted text-sm font-bold uppercase tracking-wider">Global project coordination & intelligence hub.</p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 h-11 px-6 rounded-xl bg-foreground/[0.03] hover:bg-foreground/[0.06] border border-card-border hover:border-foreground/10 text-sm font-bold text-foreground transition-all duration-300 hover-scale"
          >
            <FiPlus className="w-4 h-4" />
            <span>Initialize Mission</span>
          </button>
        </div>
      </div>

      <div className="md:hidden flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Projects</h1>
           <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 h-9 px-4 rounded-xl bg-foreground/[0.03] hover:bg-foreground/[0.06] border border-card-border text-xs font-bold text-foreground transition-all"
          >
            <FiPlus className="w-3.5 h-3.5" />
            <span>New</span>
          </button>
      </div>

      {/* Portfolio Intelligence Grid */}
      <div className="flex overflow-x-auto pb-2 scrollbar-hide lg:grid lg:grid-cols-4 gap-3 lg:gap-6 mb-6 lg:mb-12">
          <PortfolioStatCard 
            icon={FiActivity} 
            label="Active Maneuvers" 
            value={projectsWithTasks.filter(p => p.status === 'in_progress').length.toString()} 
            subValue={`${projectsWithTasks.length} Total`}
            color="indigo"
            trend={trends.active}
          />
          <PortfolioStatCard 
            icon={FiDollarSign} 
            label="Resource Purity" 
            value={`$${projectsWithTasks.reduce((acc, p) => acc + (p.spent || 0), 0) > 1000000 
              ? (projectsWithTasks.reduce((acc, p) => acc + (p.spent || 0), 0) / 1000000).toFixed(1) + 'M'
              : projectsWithTasks.reduce((acc, p) => acc + (p.spent || 0), 0).toLocaleString()}`} 
            subValue={`of $${projectsWithTasks.reduce((acc, p) => acc + (p.budget || 0), 0) > 1000000
              ? (projectsWithTasks.reduce((acc, p) => acc + (p.budget || 0), 0) / 1000000).toFixed(1) + 'M'
              : projectsWithTasks.reduce((acc, p) => acc + (p.budget || 0), 0).toLocaleString()} Cap`}
            color="emerald"
            trend={trends.total}
          />
          <PortfolioStatCard 
            icon={FiCheckSquare} 
            label="Mission Success" 
            value={projectsWithTasks.filter(p => p.status === 'completed').length.toString()} 
            subValue="Completed"
            color="amber"
            trend={trends.completed}
          />
          <PortfolioStatCard 
            icon={FiTrendingUp} 
            label="Tactical Velocity" 
            value={`${(projectsWithTasks.filter(p => p.status === 'completed').length / (projectsWithTasks.length || 1) * 10).toFixed(1)}x`} 
            subValue="Output Index"
            color="rose"
            trend={trends.total}
          />
      </div>

      <div className="hidden lg:grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          <div className="lg:col-span-2 bg-card rounded-[32px] p-6 border border-card-border">
              <div className="flex items-center justify-between mb-6">
                  <h3 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-3">
                      <FiPie className="text-indigo-400" />
                      Status Intelligence
                  </h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {['planning', 'in_progress', 'completed', 'on_hold'].map((status) => {
                      const count = projectsWithTasks.filter(p => p.status === status).length;
                      const percentage = (count / (projectsWithTasks.length || 1)) * 100;
                      const colors = {
                          planning: 'bg-zinc-500',
                          in_progress: 'bg-indigo-500',
                          completed: 'bg-emerald-500',
                          on_hold: 'bg-amber-500'
                      };
                      return (
                          <div key={status} className="p-3 rounded-xl bg-foreground/[0.03] border border-card-border space-y-2 group/status">
                              <div className="flex items-center justify-between">
                                  <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider group-hover/status:text-foreground transition-colors">{status.replace('_', ' ')}</span>
                                  <span className="text-xs font-bold text-foreground">{count}</span>
                              </div>
                              <div className="w-full h-1 bg-foreground/[0.06] rounded-full overflow-hidden">
                                  <div className={`h-full ${colors[status as keyof typeof colors]} transition-all duration-1000 relative`} style={{ width: `${percentage}%` }}>
                                      <div className="absolute inset-0 bg-white/20 blur-[2px]" />
                                  </div>
                              </div>
                          </div>
                      );
                  })}
              </div>
          </div>

          <div className="bg-card rounded-[32px] p-6 border border-card-border">
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-3 mb-6">
                  <FiActivity className="text-rose-400" />
                  Tactical Priority
              </h3>
              <div className="space-y-4">
                  {projectsWithTasks.filter(p => p.priority === 'high').slice(0, 3).map(p => (
                      <div key={p.id} className="flex items-center justify-between p-3 rounded-xl bg-rose-500/5 border border-rose-500/10">
                          <div className="flex flex-col">
                              <span className="text-[11px] font-bold text-foreground uppercase tracking-tight truncate max-w-[120px]">{p.name}</span>
                              <span className="text-[11px] font-bold text-rose-400 uppercase tracking-wider">{p.key} critical</span>
                          </div>
                          <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider bg-foreground/[0.03] px-2 py-0.5 rounded border border-card-border">{p.status.replace('_', ' ')}</span>
                      </div>
                  ))}
                  {projectsWithTasks.filter(p => p.priority === 'high').length === 0 && (
                      <p className="text-[11px] font-bold text-text-muted/30 uppercase tracking-wider text-center py-4">No critical assets detected</p>
                  )}
              </div>
          </div>
      </div>

      <div className="flex items-center justify-between gap-4 mb-6 lg:mb-10 overflow-x-auto pb-2 scrollbar-hide">
        <div className="flex items-center gap-2 lg:gap-4 w-full lg:w-auto">
          <div className="relative flex-1 min-w-[140px] max-w-sm group">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-[var(--pastel-indigo)] transition-colors w-3.5 h-3.5"/>
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 lg:h-11 pl-8 pr-4 bg-foreground/[0.03] border border-card-border rounded-xl focus:outline-none focus:bg-foreground/[0.06] focus:border-card-border text-foreground placeholder:text-text-muted/50 transition-all text-xs lg:text-sm"
            />
          </div>
          
          <div className="relative group flex-shrink-0">
             <div className="h-9 lg:h-11 w-9 lg:w-44 bg-foreground/[0.03] border border-card-border rounded-xl flex items-center justify-center lg:justify-start lg:pl-3 relative overflow-hidden focus-within:bg-foreground/[0.06]">
                <FiFilter className="text-text-muted group-hover:text-[var(--pastel-indigo)] transition-colors w-3.5 h-3.5 lg:absolute lg:left-3.5 lg:top-1/2 lg:-translate-y-1/2 lg:z-10" />
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="absolute inset-0 opacity-0 lg:opacity-100 lg:static lg:bg-transparent lg:border-none lg:pl-10 lg:pr-4 lg:w-full lg:h-full text-text-muted cursor-pointer lg:text-[11px] lg:font-bold lg:uppercase lg:tracking-wider appearance-none focus:outline-none"
                >
                    <option value="all" className="bg-card">All Status</option>
                    <option value="planning" className="bg-card">Planning</option>
                    <option value="in_progress" className="bg-card">In Progress</option>
                    <option value="completed" className="bg-card">Completed</option>
                    <option value="on_hold" className="bg-card">On Hold</option>
                </select>
             </div>
          </div>
        </div>

        <div className="flex items-center space-x-1 bg-foreground/[0.03] p-1 rounded-xl border border-card-border h-9 lg:h-11 flex-shrink-0 ml-auto">
          <button
            onClick={() => setViewMode('list')}
            className={`p-1.5 lg:p-2 rounded-lg transition-all hover-scale ${viewMode === 'list' ? 'bg-card text-foreground border border-card-border' : 'text-text-muted hover:text-foreground'}`}
            title="Table view"
          >
            <FiList className="w-4 h-4 lg:w-5 lg:h-5"/>
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={`p-1.5 lg:p-2 rounded-lg transition-all hover-scale ${viewMode === 'grid' ? 'bg-card text-foreground border border-card-border' : 'text-text-muted hover:text-foreground'}`}
            title="Grid view"
          >
            <FiGrid className="w-4 h-4 lg:w-5 lg:h-5"/>
          </button>
        </div>
      </div>

      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              users={users}
              onEdit={setEditingProject}
              onDelete={handleDelete}
            />
          ))}
          {filteredProjects.length === 0 && (
            <div className="col-span-full text-center py-12 text-zinc-500">
              No projects found matching your criteria.
            </div>
          )}
        </div>
      ) : (
        <ProjectTable
          projects={filteredProjects}
          users={users}
          clients={clients}
          onSelectProject={setSelectedProject}
        />
      )}

      {selectedProject && (
        <div className="fixed inset-0 z-[90] flex justify-end">
          <div 
            className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-500"
            onClick={() => setSelectedProject(null)}
          />
          <ProjectDetails 
            project={selectedProject}
            users={users}
            clients={clients}
            notes={notes}
            projects={projectsWithTasks}
            onClose={() => setSelectedProject(null)}
          />
        </div>
      )}

      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-white/60 dark:bg-black/60 backdrop-blur-md transition-opacity"
            onClick={() => setIsCreateModalOpen(false)}
          />
          <div className="relative bg-background border border-card-border rounded-3xl w-full max-w-5xl overflow-hidden shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)]">
            <div className="p-6 border-b border-card-border flex justify-between items-center bg-foreground/[0.03]">
              <h2 className="text-xl font-black text-foreground uppercase tracking-tight italic">Initialize Mission</h2>
              <button 
                onClick={() => setIsCreateModalOpen(false)} 
                className="p-2 rounded-xl text-text-secondary hover:text-foreground hover:bg-foreground/[0.05] transition-all"
              >
                <FiX size={20} />
              </button>
            </div>
            <form action={handleCreate} className="p-8">
              <div className="max-h-[60vh] overflow-y-auto pr-4 custom-scrollbar">
                <ProjectFormFields users={users} clients={clients} />
              </div>
              <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-card-border">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-6 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest text-text-secondary hover:text-foreground bg-foreground/[0.03] hover:bg-foreground/[0.06] border border-card-border transition-all"
                >
                  Abort
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-8 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest text-white bg-emerald-600 hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 flex items-center gap-2"
                >
                  {isCreating ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> : <FiCheck className="w-4 h-4" />}
                  Confirm Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-white/60 dark:bg-black/60 backdrop-blur-md transition-opacity"
            onClick={() => setEditingProject(null)}
          />
          <div className="relative bg-background border border-card-border rounded-3xl w-full max-w-5xl overflow-hidden shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)]">
            <div className="p-6 border-b border-card-border flex justify-between items-center bg-foreground/[0.03]">
              <h2 className="text-xl font-black text-foreground uppercase tracking-tight italic">Refine Objective</h2>
              <button 
                onClick={() => setEditingProject(null)} 
                className="p-2 rounded-xl text-text-secondary hover:text-foreground hover:bg-foreground/[0.05] transition-all"
              >
                <FiX size={20} />
              </button>
            </div>
            <form action={handleUpdate} className="p-8">
              <div className="max-h-[60vh] overflow-y-auto pr-4 custom-scrollbar">
                <ProjectFormFields defaultValues={editingProject} users={users} clients={clients} />
              </div>
              <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-card-border">
                <button
                  type="button"
                  onClick={() => setEditingProject(null)}
                  className="px-6 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest text-text-secondary hover:text-foreground bg-foreground/[0.03] hover:bg-foreground/[0.06] border border-card-border transition-all"
                >
                  Discard
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="px-8 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest text-white bg-indigo-600 hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50 flex items-center gap-2"
                >
                  {isUpdating ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> : <FiCheck className="w-4 h-4" />}
                  Execute Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function PortfolioStatCard({ icon: Icon, color, label, value, subValue, trend }: { icon: any, color: 'indigo' | 'emerald' | 'amber' | 'rose', label: string, value: string, subValue: string, trend?: number[] }) {
    const colors = {
        indigo: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20 -indigo-500/10',
        emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20 -emerald-500/10',
        amber: 'text-amber-400 bg-amber-500/10 border-amber-500/20 -amber-500/10',
        rose: 'text-rose-400 bg-rose-500/10 border-rose-500/20 -rose-500/10',
    };

    const sparkColors = {
        indigo: '#818cf8',
        emerald: '#34d399',
        amber: '#fbbf24',
        rose: '#fb7185',
    };

    return (
        <div className="bg-card rounded-xl lg:rounded-[32px] p-3 lg:p-5 border border-card-border relative overflow-hidden group hover:scale-[1.02] hover:border-foreground/10 transition-all duration-500 flex-shrink-0 min-w-[140px] lg:min-w-0">
            <div className="flex flex-col gap-2 lg:gap-4 relative z-10 h-full justify-between">
                <div className="flex justify-between items-start">
                    <div className={`w-8 h-8 lg:w-10 lg:h-10 rounded-lg lg:rounded-xl flex items-center justify-center border transition-all duration-500 relative ${colors[color]}`}>
                        <div className="absolute inset-0 rounded-lg lg:rounded-xl bg-current opacity-10 blur-sm group-hover:opacity-20 transition-opacity" />
                        <Icon className="w-3.5 h-3.5 lg:w-4 lg:h-4 relative z-10" />
                    </div>
                    {trend && (
                        <div className="h-6 w-12 lg:h-8 lg:w-16 opacity-40 group-hover:opacity-100 transition-all duration-300">
                            <Sparkline 
                                data={trend} 
                                color={sparkColors[color]}
                                width={64}
                                height={32}
                            />
                        </div>
                    )}
                </div>
                <div>
                    <p className="text-[11px] lg:text-[11px] font-bold text-text-muted uppercase tracking-wider mb-0.5 lg:mb-1 truncate">{label}</p>
                    <div className="flex flex-col lg:flex-row lg:items-baseline gap-0.5 lg:gap-2">
                        <span className="text-lg lg:text-xl font-medium font-numbers text-foreground uppercase tracking-tight">{value}</span>
                        <span className="text-[11px] lg:text-[11px] font-bold text-text-muted/50 uppercase tracking-wider truncate">{subValue}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
