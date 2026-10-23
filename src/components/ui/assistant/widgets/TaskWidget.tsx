"use client";

import type { Task } from "@/types/task";
import Link from "next/link";
import { useOrgPath } from "@/hooks/use-org-slug";
import { useState } from "react";

interface TaskWidgetProps {
  task: Task;
}

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  IN_PROGRESS: { label: "In Progress", color: "text-accent-text",    bg: "bg-accent/10" },
  DONE:        { label: "Done",        color: "text-success-text", bg: "bg-success/10" },
  TODO:        { label: "To Do",       color: "text-warning-text",  bg: "bg-warning/10" },
  BACKLOG:     { label: "Backlog",     color: "text-text-muted",    bg: "bg-zinc-400/10" },
};

const priorityConfig: Record<string, { label: string; color: string }> = {
  high:   { label: "High",   color: "text-danger-text" },
  medium: { label: "Medium", color: "text-priority-high-text" },
  low:    { label: "Low",    color: "text-success-text" },
};

export default function TaskWidget({ task }: TaskWidgetProps) {
  const orgPath = useOrgPath();
  const [renderedAt] = useState(() => Date.now());
  const status = statusConfig[task.status] ?? { label: task.status, color: "text-text-muted", bg: "bg-zinc-400/10" };
  const priority = priorityConfig[task.priority] ?? { label: task.priority, color: "text-text-muted" };

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return "No due date";
    const date = new Date(dateStr);
    const diffDays = Math.ceil((date.getTime() - renderedAt) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return `Overdue by ${Math.abs(diffDays)}d`;
    if (diffDays === 0) return "Due today";
    if (diffDays === 1) return "Due tomorrow";
    return `Due in ${diffDays}d`;
  };

  const isOverdue = task.dueDate && new Date(task.dueDate).getTime() < renderedAt;

  return (
    <div className="bg-foreground/[0.03] border border-card-border rounded-2xl hover:bg-foreground/[0.06] hover:border-accent/20 transition-colors px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Title */}
          <h4 className="text-sm font-semibold text-foreground mb-2 truncate">
            {task.name}
          </h4>

          {task.description && (
            <p className="text-xs text-text-muted mb-3 line-clamp-2">{task.description}</p>
          )}

          {/* Badges */}
          <div className="flex flex-wrap gap-1.5">
            <span className={`px-2 py-0.5 rounded-lg text-[11px] font-medium ${status.bg} ${status.color}`}>
              {status.label}
            </span>
            <span className={`px-2 py-0.5 rounded-lg text-[11px] font-medium bg-foreground/[0.03] border border-card-border ${priority.color}`}>
              {priority.label}
            </span>
            <span className={`px-2 py-0.5 rounded-lg text-[11px] font-medium bg-foreground/[0.03] border border-card-border ${isOverdue ? "text-danger-text" : "text-text-muted"}`}>
              {formatDate(task.dueDate)}
            </span>
          </div>
        </div>

        <Link
          href={orgPath(`/tasks?id=${task.id}`)}
          className="inline-flex min-h-9 shrink-0 items-center rounded-full px-2 text-xs font-medium text-accent-text transition-colors hover:bg-accent/10"
        >
          View →
        </Link>
      </div>
    </div>
  );
}
