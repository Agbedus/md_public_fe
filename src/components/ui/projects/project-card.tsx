import React from 'react';
import { Project, priorityMapping, statusMapping } from '@/types/project';
import { FiCalendar, FiClock, FiEdit2, FiTrash2, FiDollarSign, FiTag, FiPieChart } from 'react-icons/fi';
import { format } from 'date-fns';
import UserAvatarGroup from '@/components/ui/user-avatar-group';
import Link from 'next/link';
import { FiCheckSquare } from 'react-icons/fi';
import { TaskDonutChart } from './task-donut-chart';
import { useConfirm } from '@/providers/confirmation-provider';

import { User } from '@/types/user';

interface ProjectCardProps {
  project: Project;
  users: User[];
  onEdit: (project: Project) => void;
  onDelete: (project: Project) => void;
}


export function ProjectCard({ project, users, onEdit, onDelete }: ProjectCardProps) {
  const confirm = useConfirm();
  const [isDeleting, setIsDeleting] = React.useState(false);
  const statusColors = {
    planning: "bg-[var(--pastel-blue)]/10 text-[var(--pastel-blue)] border-[var(--pastel-blue)]/20",
    in_progress: "bg-[var(--pastel-amber)]/10 text-[var(--pastel-amber)] border-[var(--pastel-amber)]/20",
    completed: "bg-[var(--pastel-emerald)]/10 text-[var(--pastel-emerald)] border-[var(--pastel-emerald)]/20",
    on_hold: "bg-foreground/[0.03] text-text-muted border-card-border",
  };

  const priorityColors = {
    low: "text-text-muted",
    medium: "text-[var(--pastel-amber)]",
    high: "text-[var(--pastel-rose)]",
  };

  return (
    <div className="group relative bg-card hover:bg-card border border-card-border rounded-xl lg:rounded-2xl p-4 lg:p-5 transition-all duration-300 hover:border-foreground/10">
      <div className="flex justify-between items-start mb-2 lg:mb-3">
        <div className="flex items-center gap-2">
          <div className={`px-2 py-0.5 lg:px-2.5 lg:py-1 rounded-lg text-[11px] lg:text-xs font-medium border whitespace-nowrap ${statusColors[project.status]}`}>
            {statusMapping[project.status]}
          </div>
          {project.key && (
            <div className="px-1.5 py-0.5 lg:px-2 lg:py-1 rounded-lg text-[11px] lg:text-xs font-mono text-(--text-muted) bg-background/50 border border-card-border whitespace-nowrap">
              {project.key}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 lg:gap-3">
          {(() => {
            const total = project.tasks?.length || 0;
            const done = project.tasks?.filter(t => t.status === 'DONE').length || 0;
            const inProgress = project.tasks?.filter(t => ['IN_PROGRESS', 'REVIEW', 'QA'].includes(t.status)).length || 0;
            const todo = total - done - inProgress;
            return <TaskDonutChart total={total} done={done} inProgress={inProgress} todo={todo} size={32} />;
          })()}
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onEdit(project)}
            className="p-1.5 rounded-lg hover:bg-foreground/[0.06] text-text-muted hover:text-foreground transition-colors border border-transparent hover:border-card-border"
            title="Edit project"
          >
            <FiEdit2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={async () => {
              const confirmed = await confirm({
                title: 'Delete Project',
                message: `Are you sure you want to delete "${project.name}"? This action will remove all linked tasks and data. This cannot be undone.`,
                confirmText: 'Delete Project',
                type: 'danger'
              });

              if (confirmed) {
                 setIsDeleting(true);
                 try {
                   await onDelete(project);
                 } finally {
                   setIsDeleting(false);
                 }
              }
            }}
            disabled={isDeleting}
            className="p-1.5 rounded-lg hover:bg-rose-500/10 text-text-muted hover:text-rose-400 transition-colors disabled:opacity-50 border border-transparent hover:border-rose-500/20"
            title="Delete project"
          >
            {isDeleting ? <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-rose-400"></div> : <FiTrash2 className="w-3.5 h-3.5" />}
          </button>
          <Link
            href={`/projects/${project.id}`}
            className="p-1.5 rounded-lg hover:bg-indigo-500/10 text-text-muted hover:text-indigo-400 transition-colors border border-transparent hover:border-indigo-500/20"
            title="Project Dashboard"
          >
            <FiPieChart className="w-3.5 h-3.5" />
          </Link>
          <Link
            href={`/projects/${project.id}/tasks`}
            className="p-1.5 rounded-lg hover:bg-emerald-500/10 text-text-muted hover:text-emerald-400 transition-colors border border-transparent hover:border-emerald-500/20"
            title="View project tasks"
          >
            <FiCheckSquare className="w-3.5 h-3.5" />
          </Link>
        </div>
        </div>
      </div>

      <h3 className="text-base lg:text-lg font-bold text-foreground mb-1 lg:mb-2 line-clamp-1">{project.name}</h3>
      
      <p className="text-text-muted text-xs lg:text-sm font-medium mb-3 line-clamp-2 min-h-[2rem] lg:min-h-[2.5rem]">
        {project.description || "No description provided."}
      </p>

      {/* Tags */}
      {project.tags && (
        <div className="flex items-center gap-1.5 mb-3 flex-wrap">
          <FiTag className="w-3 h-3 text-text-muted" />
          {(() => {
            if (!project.tags || !Array.isArray(project.tags)) return null;
            
            return project.tags.slice(0, 3).map((tag: string, idx: number) => (
              <span key={idx} className="px-1.5 py-0.5 rounded-md text-[11px] lg:text-[11px] bg-background/50 text-text-muted border border-card-border whitespace-nowrap">
                {tag}
              </span>
            ));
          })()}
        </div>
      )}

      {/* Budget Info */}
      {(project.budget || project.spent) && (
        <div className="mb-3 p-2 rounded-lg bg-foreground/[0.03] border border-card-border">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-text-muted">
              <FiDollarSign className="w-3 h-3" />
              <span>Budget</span>
            </div>
            <div className="text-foreground font-bold font-numbers">
              {project.spent || 0} / {project.budget || 0} {project.currency || 'USD'}
            </div>
          </div>
          {project.budget && project.budget > 0 && (
            <div className="mt-1.5 h-1 bg-background rounded-full overflow-hidden border border-card-border">
              <div 
                className="h-full bg-indigo-500 rounded-full transition-all"
                style={{ width: `${Math.min(((project.spent || 0) / project.budget) * 100, 100)}%` }}
              />
            </div>
          )}
        </div>
      )}




      <div className="flex items-center justify-between text-xs text-text-muted pt-3 border-t border-card-border">
        <div className="flex items-center gap-3">
          {/* Owner */}
          {(() => {
            const owner = users.find(u => u.id === project.ownerId);
            if (!owner) return null;
            return (
              <div className="flex items-center gap-2 mr-2">
                <UserAvatarGroup users={[owner]} size="sm" />
                <span className="text-text-muted font-bold tracking-tight">{owner.fullName || owner.email}</span>
              </div>
            );
          })()}

          {project.endDate && (
            <div className="flex items-center gap-1.5">
              <FiCalendar className="w-3.5 h-3.5" />
              <span>{format(new Date(project.endDate), "MMM d")}</span>
            </div>
          )}
          <div className={`flex items-center gap-1.5 whitespace-nowrap ${priorityColors[project.priority]}`}>
            <FiClock className="w-3.5 h-3.5" />
            <span className="capitalize">{priorityMapping[project.priority]}</span>
          </div>
        </div>
        
        <div className="text-text-muted/50 font-bold uppercase tracking-widest text-[10px]">
            {project.updatedAt && `Updated ${format(new Date(project.updatedAt), "MMM d")}`}
        </div>
      </div>
    </div>
  );
}
