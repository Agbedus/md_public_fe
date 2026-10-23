"use client";

import React from "react";
import { Project, priorityMapping, statusMapping } from "@/types/project";
import {
  FiCalendar,
  FiEdit2,
  FiTrash2,
  FiTag,
  FiCheckSquare,
} from "react-icons/fi";
import { format, isValid } from "date-fns";
import UserAvatarGroup from "@/components/ui/user-avatar-group";
import Link from "next/link";
import { useOrgSlug } from "@/hooks/use-org-slug";
import { User } from "@/types/user";
import { Spinner } from "@/components/ui/busy-icon";

interface ProjectCardProps {
  project: Project;
  users: User[];
  onEdit: (project: Project) => void;
  onDelete: (project: Project) => void | Promise<void>;
  /** False for a project the viewer can see but not change. */
  canModify?: boolean;
}

export function ProjectCard({
  project,
  users,
  onEdit,
  onDelete,
  canModify = true,
}: ProjectCardProps) {
  const slug = useOrgSlug();
  const path = `${slug ? `/${slug}` : ""}/projects/${project.id}`;
  const [isDeleting, setIsDeleting] = React.useState(false);
  const tasks = project.tasks ?? [];
  const completed = tasks.filter((task) => task.status === "DONE").length;
  const progress = tasks.length
    ? Math.round((completed / tasks.length) * 100)
    : 0;
  const memberIds = new Set([
    project.ownerId,
    ...(project.managers ?? []).map((manager) => manager.user.id),
  ]);
  tasks.forEach((task) => {
    (task.assigneeIds ?? []).forEach((id) => memberIds.add(id));
    (task.assignees ?? []).forEach(({ user }) => memberIds.add(user.id));
  });
  const team = users.filter((user) => memberIds.has(user.id));
  const due = project.endDate ? new Date(project.endDate) : null;
  const statusColors = {
    planning: "bg-accent/10 text-accent-text",
    in_progress: "bg-warning/10 text-warning-text",
    completed: "bg-success/10 text-success-text",
    on_hold: "bg-foreground/[0.04] text-text-muted",
  };
  const actionClass =
    "grid h-11 w-11 shrink-0 place-items-center rounded-full text-text-muted transition-colors duration-150 hover:bg-foreground/[0.06] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50";

  return (
    <article className="group flex min-w-0 flex-col rounded-[28px] border border-card-border bg-card p-5 transition-colors duration-150 hover:border-foreground/15 sm:p-6">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span
            className={`rounded-full px-3 py-1.5 text-xs font-medium ${statusColors[project.status]}`}
          >
            {statusMapping[project.status]}
          </span>
          {project.key && (
            <span className="truncate text-xs text-text-muted">
              {project.key}
            </span>
          )}
        </div>
        {canModify && (
          <div className="-mr-2 -mt-1 flex shrink-0 items-center lg:opacity-0 lg:transition-opacity lg:group-hover:opacity-100 lg:group-focus-within:opacity-100">
            <button
              type="button"
              onClick={() => onEdit(project)}
              className={actionClass}
              data-tooltip="Edit project"
              aria-label={`Edit ${project.name}`}
            >
              <FiEdit2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              disabled={isDeleting}
              aria-label={`Delete ${project.name}`}
              data-tooltip="Delete project"
              className={`${actionClass} hover:!bg-danger/10 hover:!text-danger-text disabled:opacity-50`}
              onClick={async () => {
                setIsDeleting(true);
                try {
                  await onDelete(project);
                } finally {
                  setIsDeleting(false);
                }
              }}
            >
              {isDeleting ? (
                <Spinner className="h-4 w-4" />
              ) : (
                <FiTrash2 className="h-4 w-4" />
              )}
            </button>
          </div>
        )}
      </div>
      <h3 className="text-xl font-semibold leading-snug tracking-tight text-foreground">
        <Link
          href={path}
          className="rounded-lg transition-colors hover:text-accent-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
        >
          {project.name}
        </Link>
      </h3>
      <p className="mt-2 line-clamp-2 min-h-10 text-sm leading-relaxed text-text-muted">
        {project.description || "Add a description to give your team context."}
      </p>

      {/* Tags */}
      {!!project.tags?.length && (
        <div className="mt-3 flex items-center gap-1.5 overflow-hidden text-xs text-text-muted">
          <FiTag className="h-3.5 w-3.5 shrink-0" />
          {project.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="truncate rounded-full bg-foreground/[0.03] px-2.5 py-1"
            >
              {tag}
            </span>
          ))}
          {project.tags.length > 3 && (
            <span className="shrink-0">+{project.tags.length - 3}</span>
          )}
        </div>
      )}
      <Link
        href={`${path}/tasks`}
        className="mt-6 block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
      >
        <div className="flex items-center justify-between gap-3 text-xs">
          <span className="flex items-center gap-1.5 text-text-muted">
            <FiCheckSquare />
            {completed} of {tasks.length} tasks
          </span>
          <span className="font-numbers font-medium text-foreground">
            {progress}%
          </span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-foreground/[0.06]">
          <div
            className="h-full origin-left rounded-full bg-accent transition-transform duration-200 ease-out motion-reduce:transition-none"
            style={{ transform: `scaleX(${progress / 100})` }}
          />
        </div>
      </Link>

      {/* Budget Info */}
      {(project.budget != null || project.spent != null) && (
        <p className="mt-3 flex justify-between gap-3 text-xs text-text-muted">
          <span>Budget used</span>
          <span className="font-numbers">
            {(project.spent ?? 0).toLocaleString()}
            {project.budget != null
              ? ` / ${project.budget.toLocaleString()}`
              : ""}{" "}
            {project.currency || "USD"}
          </span>
        </p>
      )}
      <div className="mt-auto pt-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-card-border pt-4 text-xs text-text-muted">
          {/* Owner */}
          {team.length ? (
            <UserAvatarGroup users={team} size="sm" limit={3} />
          ) : (
            <span>No team assigned</span>
          )}
          <div className="flex items-center gap-3">
            {due && isValid(due) && (
              <span className="inline-flex items-center gap-1.5">
                <FiCalendar className="h-3.5 w-3.5" />
                {format(due, "MMM d")}
              </span>
            )}
            <span
              className={project.priority === "high" ? "text-danger-text" : ""}
            >
              {priorityMapping[project.priority]} priority
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}
