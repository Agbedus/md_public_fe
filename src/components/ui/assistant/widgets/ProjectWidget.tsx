import type { Project } from "@/types/project";
import Link from "next/link";

interface ProjectWidgetProps {
  project: Project;
  taskCount?: number;
}

export default function ProjectWidget({ project, taskCount }: ProjectWidgetProps) {
  // Status styling
  let statusColor = "text-zinc-400";
  let statusBg = "bg-zinc-400/10";
  
  if (project.status === "in_progress") {
    statusColor = "text-blue-400";
    statusBg = "bg-blue-400/10";
  } else if (project.status === "completed") {
    statusColor = "text-emerald-400";
    statusBg = "bg-emerald-400/10";
  } else if (project.status === "on_hold") {
    statusColor = "text-orange-400";
    statusBg = "bg-orange-400/10";
  } else if (project.status === "planning") {
    statusColor = "text-purple-400";
    statusBg = "bg-purple-400/10";
  }

  return (
    <div className="bg-card p-4 rounded-xl border border-card-border hover:bg-foreground/[0.02] transition-all">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-foreground mb-2 truncate">{project.name}</h4>
          
          {project.description && (
            <p className="text-sm text-text-muted mb-3 line-clamp-2">{project.description}</p>
          )}
          
          <div className="flex flex-wrap gap-2 text-xs">
            <span className={`px-2 py-1 rounded-lg ${statusBg} ${statusColor} font-medium`}>
              {project.status.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase())}
            </span>
            
            {taskCount !== undefined && (
              <span className="px-2 py-1 rounded-lg bg-foreground/[0.03] text-text-muted">
                {taskCount} task{taskCount !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
        
        <Link 
          href={`/projects/${project.id}/tasks`}
          className="text-blue-400 hover:text-blue-300 text-sm font-medium whitespace-nowrap"
        >
          View →
        </Link>
      </div>
    </div>
  );
}
