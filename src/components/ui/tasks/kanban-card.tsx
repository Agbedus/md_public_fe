"use client";

import React, { useState } from "react";
import type { Task } from "@/types/task";
import { statusMapping } from "@/types/task";
import { User } from "@/types/user";
import { Project } from "@/types/project";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion, useReducedMotion } from "framer-motion";
import { FiCalendar, FiChevronRight, FiChevronLeft, FiClock, FiPlay, FiTrash2 } from "react-icons/fi";
import UserAvatarGroup from "@/components/ui/user-avatar-group";
import { useTaskTimer } from "@/providers/task-timer-provider";
import { canUserWorkOnTask, canDeleteTask } from "@/lib/task-auth";

type Status = keyof typeof statusMapping;

/** One colour per workflow stage (tokens in globals.css). */
export const STATUS_COLOR: Record<Status, string> = {
  TODO: "var(--status-todo)",
  IN_PROGRESS: "var(--status-in-progress)",
  QA: "var(--status-qa)",
  REVIEW: "var(--status-review)",
  DONE: "var(--status-done)",
};

const PRIORITY_TONE: Record<Task["priority"], { fill: string; text: string }> = {
  high: { fill: "var(--priority-high)", text: "var(--priority-high-text)" },
  medium: { fill: "var(--warning)", text: "var(--warning-text)" },
  low: { fill: "var(--success)", text: "var(--success-text)" },
};

/** The workflow neighbours of a task, honouring its QA / review flags. */
function neighbours(task: Task): { prev?: Status; next?: Status } {
  switch (task.status) {
    case "TODO": return { next: "IN_PROGRESS" };
    case "IN_PROGRESS": return { prev: "TODO", next: task.qa_required ? "QA" : task.review_required ? "REVIEW" : "DONE" };
    case "QA": return { prev: "IN_PROGRESS", next: task.review_required ? "REVIEW" : "DONE" };
    case "REVIEW": return { prev: task.qa_required ? "QA" : "IN_PROGRESS", next: "DONE" };
    case "DONE": return { prev: task.review_required ? "REVIEW" : task.qa_required ? "QA" : "IN_PROGRESS" };
    default: return {};
  }
}

interface BodyProps {
  task: Task;
  users: User[];
  projects: Project[];
  justMoved?: boolean;
  actions?: React.ReactNode;
  footerActions?: React.ReactNode;
}

/** The card's content, shared by the live card and the drag overlay. */
export function KanbanCardBody({ task, users, projects, justMoved = false, actions, footerActions }: BodyProps) {
  const reduceMotion = useReducedMotion();
  // Read once per mount: overdue only needs day precision.
  const [now] = useState(() => Date.now());
  const project = projects.find((p) => p.id === task.projectId);
  const color = STATUS_COLOR[task.status as Status] ?? STATUS_COLOR.TODO;
  const priority = PRIORITY_TONE[task.priority] ?? PRIORITY_TONE.low;
  const due = task.dueDate ? new Date(task.dueDate) : null;
  const overdue = due !== null && task.status !== "DONE" && due.getTime() < now - 86_400_000;

  return (
    <div className="rounded-[22px] bg-background p-4">
      <div className="mb-2 flex items-center gap-2">
        {/* The status dot pops whenever the card lands in a new lane. */}
        <motion.span
          key={task.status}
          initial={reduceMotion ? false : { scale: justMoved ? 0.4 : 1 }}
          animate={{ scale: justMoved && !reduceMotion ? [0.4, 1.5, 1] : 1 }}
          transition={{ duration: 0.45, ease: [0.23, 1, 0.32, 1] }}
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ backgroundColor: color, boxShadow: justMoved ? `0 0 0 4px color-mix(in oklab, ${color} 25%, transparent)` : undefined }}
          aria-hidden="true"
        />
        <span className="text-xs text-text-muted">{statusMapping[task.status as Status]}</span>
        <div className="ml-auto flex items-center gap-0.5">{actions}</div>
      </div>

      <h4 className={`text-[15px] font-semibold leading-snug text-foreground ${task.status === "DONE" ? "line-through opacity-50" : ""}`}>
        {task.name}
      </h4>
      {task.description && (
        <p className="mt-1.5 line-clamp-2 text-[13px] leading-relaxed text-text-muted">{task.description}</p>
      )}

      <div className="mt-3 flex flex-wrap gap-1.5">
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium capitalize"
          style={{ backgroundColor: `color-mix(in oklab, ${priority.fill} 16%, transparent)`, color: priority.text }}
        >
          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: priority.fill }} />
          {task.priority}
        </span>
        {project && (
          <span className="inline-flex max-w-[150px] items-center truncate rounded-full bg-foreground/[0.05] px-2.5 py-1 text-[11px] font-medium text-text-secondary">
            {project.name}
          </span>
        )}
        {task.qa_required && <span className="rounded-full bg-foreground/[0.05] px-2.5 py-1 text-[11px] font-medium text-text-secondary">QA</span>}
        {task.review_required && <span className="rounded-full bg-foreground/[0.05] px-2.5 py-1 text-[11px] font-medium text-text-secondary">Review</span>}
        {task.depends_on_id && (
          <span className="inline-flex items-center gap-1 rounded-full bg-warning/15 px-2.5 py-1 text-[11px] font-medium text-warning-text">
            <FiClock className="h-3 w-3" /> Blocked by #{task.depends_on_id}
          </span>
        )}
      </div>

      {(due || (task.assigneeIds?.length ?? 0) > 0 || footerActions) && (
        <div className="mt-3 flex items-center justify-between gap-2">
          {due ? (
            <span className={`inline-flex items-center gap-1.5 text-xs ${overdue ? "text-danger-text" : "text-text-muted"}`}>
              <FiCalendar className="h-3.5 w-3.5" />
              {due.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
            </span>
          ) : <span />}
          <div className="flex items-center gap-1.5">
            {footerActions}
            {task.assigneeIds && task.assigneeIds.length > 0 && (
              <div className="origin-right scale-90">
                <UserAvatarGroup users={users.filter((u) => task.assigneeIds?.includes(u.id))} size="md" limit={3} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface KanbanCardProps {
  task: Task;
  users: User[];
  user?: User;
  projects: Project[];
  columns: Status[];
  onMove: (task: Task, status: Task["status"]) => Promise<{ success: boolean; error?: string } | undefined>;
  onDelete: (task: Task) => Promise<void>;
  canManage?: boolean;
  isSelected?: boolean;
  justMoved?: boolean;
  isRemoving?: boolean;
  onSelect?: (id: string) => void;
}

const iconButton = "hover-scale grid h-8 w-8 place-items-center rounded-full text-text-muted transition-colors hover:bg-foreground/[0.06] hover:text-foreground";

export default function KanbanCard({ task, users, user: currentUser, projects, onMove, onDelete, canManage, isSelected = false, justMoved = false, isRemoving = false, onSelect }: KanbanCardProps) {
  const { startTimer, activeTask } = useTaskTimer();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: String(task.id) });
  const { prev, next } = neighbours(task);
  const isTiming = activeTask?.id === task.id;
  const reveal = isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100";

  const actions = (
    <>
      {canUserWorkOnTask(currentUser, task) && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); startTimer(task); }}
          onPointerDown={(e) => e.stopPropagation()}
          className={`${iconButton} ${isTiming ? "bg-accent/15 !text-accent-text opacity-100" : reveal}`}
          aria-label="Start focus timer"
        >
          <FiPlay className={`h-3.5 w-3.5 ${isTiming ? "fill-current" : ""}`} />
        </button>
      )}
      {(canManage || canDeleteTask(currentUser, task)) && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); void onDelete(task); }}
          onPointerDown={(e) => e.stopPropagation()}
          disabled={isRemoving}
          className={`${iconButton} hover:!bg-danger/10 hover:!text-danger-text disabled:cursor-wait ${reveal}`}
          aria-label={`Delete ${task.name}`}
        >
          <FiTrash2 className="h-3.5 w-3.5" />
        </button>
      )}
    </>
  );

  const footerActions = (
    <div className={`flex items-center transition-opacity ${reveal}`}>
      {prev && (
        <button type="button" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); void onMove(task, prev); }} className={iconButton} data-tooltip={`Move to ${statusMapping[prev]}`} aria-label={`Move to ${statusMapping[prev]}`}>
          <FiChevronLeft className="h-4 w-4" />
        </button>
      )}
      {next && (
        <button type="button" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); void onMove(task, next); }} className={iconButton} data-tooltip={`Move to ${statusMapping[next]}`} aria-label={`Move to ${statusMapping[next]}`}>
          <FiChevronRight className="h-4 w-4" />
        </button>
      )}
    </div>
  );

  return (
    <div
      ref={setNodeRef}
      data-task-id={String(task.id)}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
      role="button"
      tabIndex={0}
      aria-pressed={isSelected}
      aria-roledescription="Task card. Option or Alt plus left or right arrow moves it between lanes."
      onClick={() => onSelect?.(String(task.id))}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect?.(String(task.id)); }
      }}
      className={`group relative cursor-pointer touch-manipulation rounded-[22px] outline-none transition-[box-shadow,opacity] duration-200 motion-reduce:transition-none active:cursor-grabbing ${
        isDragging ? "opacity-35" : isRemoving ? "opacity-40" : ""
      } ${isSelected ? "ring-2 ring-accent" : "hover:ring-1 hover:ring-foreground/10 focus-visible:ring-2 focus-visible:ring-accent/60"}`}
    >
      <KanbanCardBody task={task} users={users} projects={projects} justMoved={justMoved} actions={actions} footerActions={footerActions} />
    </div>
  );
}
