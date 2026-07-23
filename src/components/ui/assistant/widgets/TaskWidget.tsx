import type { Task } from "@/types/task";
import Link from "next/link";

interface TaskWidgetProps {
  task: Task;
}

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  IN_PROGRESS: { label: "In Progress", color: "text-blue-400",    bg: "bg-blue-400/10" },
  DONE:        { label: "Done",        color: "text-emerald-400", bg: "bg-emerald-400/10" },
  TODO:        { label: "To Do",       color: "text-yellow-400",  bg: "bg-yellow-400/10" },
  BACKLOG:     { label: "Backlog",     color: "text-zinc-400",    bg: "bg-zinc-400/10" },
};

const priorityConfig: Record<string, { label: string; color: string }> = {
  high:   { label: "High",   color: "text-red-400" },
  medium: { label: "Medium", color: "text-orange-400" },
  low:    { label: "Low",    color: "text-green-400" },
};

export default function TaskWidget({ task }: TaskWidgetProps) {
  const status = statusConfig[task.status] ?? { label: task.status, color: "text-zinc-400", bg: "bg-zinc-400/10" };
  const priority = priorityConfig[task.priority] ?? { label: task.priority, color: "text-zinc-400" };

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return "No due date";
    const date = new Date(dateStr);
    const diffDays = Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return `Overdue by ${Math.abs(diffDays)}d`;
    if (diffDays === 0) return "Due today";
    if (diffDays === 1) return "Due tomorrow";
    return `Due in ${diffDays}d`;
  };

  const isOverdue = task.dueDate && new Date(task.dueDate).getTime() < Date.now();

  return (
    <div className="bg-foreground/[0.03] border border-card-border rounded-xl hover:bg-foreground/[0.06] hover:border-indigo-500/20 transition-all px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Title */}
          <h4 className="font-bold text-[11px] uppercase tracking-wider text-foreground mb-2 truncate">
            {task.name}
          </h4>

          {task.description && (
            <p className="text-xs text-text-muted mb-3 line-clamp-2">{task.description}</p>
          )}

          {/* Badges */}
          <div className="flex flex-wrap gap-1.5">
            <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider ${status.bg} ${status.color}`}>
              {status.label}
            </span>
            <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-foreground/[0.03] border border-card-border ${priority.color}`}>
              {priority.label}
            </span>
            <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-foreground/[0.03] border border-card-border ${isOverdue ? "text-red-400" : "text-text-muted"}`}>
              {formatDate(task.dueDate)}
            </span>
          </div>
        </div>

        <Link
          href={`/tasks?id=${task.id}`}
          className="text-[11px] font-bold uppercase tracking-wider text-indigo-400 hover:text-indigo-300 whitespace-nowrap flex-shrink-0 transition-colors"
        >
          View →
        </Link>
      </div>
    </div>
  );
}
