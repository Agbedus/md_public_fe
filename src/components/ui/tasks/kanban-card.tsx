"use client";

import React from "react";
import type { Task } from "@/types/task";
import { statusMapping, priorityMapping } from "@/types/task";
import { User } from "@/types/user";
import { Project } from "@/types/project";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  FiCalendar,
  FiChevronRight,
  FiChevronLeft,
  FiClock,
  FiPlay,
  FiCheckCircle,
  FiTrash2,
  FiSquare,
  FiPause
} from "react-icons/fi";
import UserAvatarGroup from "@/components/ui/user-avatar-group";
import { useTaskTimer } from "@/providers/task-timer-provider";
import { canUserWorkOnTask } from "@/lib/task-auth";

interface KanbanCardProps {
  task: Task;
  users: User[];
  user?: User;
  projects: Project[];
  columns: Array<keyof typeof statusMapping>;
  onMove: (task: Task, status: Task["status"]) => Promise<void>;
  onDelete: (task: Task) => Promise<void>;
}

export default function KanbanCard({ task, users, user: currentUser, projects, columns, onMove, onDelete }: KanbanCardProps) {
  const { startTimer, activeTask } = useTaskTimer();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: String(task.id) });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    willChange: "transform",
  } as React.CSSProperties;

  const getStatusStyles = (status: Task["status"]) => {
    switch(status) {
      case 'DONE': 
        return {
          stripe: 'bg-[var(--pastel-emerald)]',
          tint: 'bg-[var(--pastel-emerald)]/[0.03]',
          glow: 'group-hover:-[0_0_30px_rgba(16,185,129,0.15)]',
          ring: 'group-hover:ring-[var(--pastel-emerald)]/20',
          gradient: 'from-[var(--pastel-emerald)]/10 to-transparent'
        };
      case 'IN_PROGRESS': 
        return {
          stripe: 'bg-[var(--pastel-blue)]',
          tint: 'bg-[var(--pastel-blue)]/[0.03]',
          glow: 'group-hover:-[0_0_30px_rgba(59,130,246,0.15)]',
          ring: 'group-hover:ring-[var(--pastel-blue)]/20',
          gradient: 'from-[var(--pastel-blue)]/10 to-transparent'
        };
      case 'QA':
        return {
          stripe: 'bg-purple-500',
          tint: 'bg-purple-500/[0.03]',
          glow: 'group-hover:-[0_0_30px_rgba(168,85,247,0.15)]',
          ring: 'group-hover:ring-purple-500/20',
          gradient: 'from-purple-500/10 to-transparent'
        };
      case 'REVIEW':
        return {
          stripe: 'bg-blue-500',
          tint: 'bg-blue-500/[0.03]',
          glow: 'group-hover:-[0_0_30px_rgba(59,130,246,0.15)]',
          ring: 'group-hover:ring-blue-500/20',
          gradient: 'from-blue-500/10 to-transparent'
        };
      default: 
        return {
          stripe: 'bg-zinc-500',
          tint: 'bg-white/[0.02]',
          glow: 'group-hover:-[0_0_30px_rgba(255,255,255,0.05)]',
          ring: 'group-hover:ring-white/20',
          gradient: 'from-white/5 to-transparent'
        };
    }
  };

  const styles = getStatusStyles(task.status);
  const project = projects.find(p => p.id === task.projectId);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative overflow-hidden rounded-2xl border border-white/5 ${styles.tint} transition-all duration-500 backdrop-blur-md cursor-grab active:cursor-grabbing ${
        isDragging ? 'opacity-40 ring-2 ring-indigo-500/50  scale-[1.02] z-50' : `hover:border-white/5 hover:-translate-y-1.5 ring-0 ${styles.ring} ${styles.glow}`
      }`}
      {...attributes}
      {...listeners}
    >
      {/* Dynamic Background Gradient */}
      <div className={`absolute -top-12 -right-12 w-32 h-32 bg-gradient-to-br ${styles.gradient} blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none`} />

      {/* Visual Status Stripe */}
      <div className={`absolute top-0 left-0 w-1 h-full ${styles.stripe} opacity-60 group-hover:opacity-100 transition-opacity`} />

      <div className="p-5 pl-6">
        <div className="flex items-start justify-between gap-3 mb-2.5">
          <div className="flex-1 min-w-0">
            <h4 className={`text-lg font-bold tracking-tight leading-tight text-white/90 group-hover:text-white transition-colors ${task.status === 'DONE' ? 'line-through opacity-40' : ''}`}>
              {task.name}
            </h4>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {canUserWorkOnTask(currentUser, task) && (
              <button
                onClick={(e) => { e.stopPropagation(); startTimer(task); }}
                className={`transition-all duration-300 p-1.5 rounded-xl ${
                  activeTask?.id === task.id 
                    ? 'bg-indigo-500/20 text-indigo-400 ring-1 ring-indigo-500/30' 
                    : 'opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-indigo-400 hover:bg-indigo-500/10'
                }`}
                aria-label="Start Focus"
              >
                <FiPlay className={`h-3.5 w-3.5 ${activeTask?.id === task.id ? 'fill-current' : ''}`} />
              </button>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); void onDelete(task); }}
              className="opacity-0 group-hover:opacity-100 transition-all duration-300 p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl"
              aria-label={`Delete ${task.name}`}
            >
              <FiTrash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {task.description && (
          <p className="text-[14px] leading-relaxed text-zinc-500 line-clamp-2 mb-5 group-hover:text-zinc-400 transition-colors">
            {task.description}
          </p>
        )}

        <div className="flex flex-wrap gap-2.5 mb-5">
          {project && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wider bg-[var(--pastel-indigo)]/10 text-[var(--pastel-indigo)] border border-[var(--pastel-indigo)]/20 ">
              {project.name}
            </span>
          )}
          <span
            className={`px-2.5 py-1 inline-flex text-[11px] font-bold rounded-lg border uppercase tracking-wider  ${
              task.priority === 'high'
                ? 'bg-[var(--pastel-rose)]/10 text-[var(--pastel-rose)] border-[var(--pastel-rose)]/20 pulse-soft'
                : task.priority === 'medium'
                ? 'bg-[var(--pastel-amber)]/10 text-[var(--pastel-amber)] border-[var(--pastel-amber)]/20'
                : 'bg-[var(--pastel-emerald)]/10 text-[var(--pastel-emerald)] border-[var(--pastel-emerald)]/20'
            }`}
          >
            {task.priority}
          </span>
          {task.qa_required && (
            <span className="px-2.5 py-1 inline-flex text-[11px] font-bold rounded-lg border uppercase tracking-wider bg-purple-500/10 text-purple-400 border-purple-500/20">QA</span>
          )}
          {task.review_required && (
            <span className="px-2.5 py-1 inline-flex text-[11px] font-bold rounded-lg border uppercase tracking-wider bg-blue-500/10 text-blue-400 border-blue-500/20">REVIEW</span>
          )}
          {task.depends_on_id && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-amber-500/20 bg-amber-500/10 text-amber-400 text-[11px] font-medium uppercase tracking-wider">
              <FiClock className="w-3 h-3" />
              <span>Blocker: #{task.depends_on_id}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-white/5">
          <div className="flex items-center gap-3">
            {task.dueDate && (
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-zinc-500 bg-white/[0.03] px-2.5 py-1.5 rounded-xl border border-white/5 group-hover:bg-white/[0.06] transition-colors">
                <FiCalendar className="w-3.5 h-3.5" />
                <span>{new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {task.assigneeIds && task.assigneeIds.length > 0 && (
              <div className="scale-90 origin-right">
                <UserAvatarGroup 
                  users={users.filter(u => task.assigneeIds?.includes(u.id))} 
                  size="md" 
                  limit={users.length} 
                />
              </div>
            )}
            
            <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-300 ml-1">
              {task.status === 'TODO' && (
                <button
                  onClick={(e) => { e.stopPropagation(); void onMove(task, 'IN_PROGRESS'); }}
                  className="p-1.5 rounded-xl hover:bg-white/[0.06] text-zinc-500 hover:text-white transition-all border border-white/5 active:scale-90"
                  title="Move to In Progress"
                >
                  <FiChevronRight className="h-4 w-4" />
                </button>
              )}
              {task.status === 'IN_PROGRESS' && (
                <>
                  <button
                    onClick={(e) => { e.stopPropagation(); void onMove(task, 'TODO'); }}
                    className="p-1.5 rounded-xl hover:bg-white/[0.06] text-zinc-500 hover:text-white transition-all border border-white/5 active:scale-90"
                    title="Move to To Do"
                  >
                    <FiChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); void onMove(task, task.qa_required ? 'QA' : task.review_required ? 'REVIEW' : 'DONE'); }}
                    className="p-1.5 rounded-xl hover:bg-white/[0.06] text-zinc-500 hover:text-white transition-all border border-white/5 active:scale-90"
                    title={`Move to ${task.qa_required ? 'QA' : task.review_required ? 'Review' : 'Done'}`}
                  >
                    <FiChevronRight className="h-4 w-4" />
                  </button>
                </>
              )}
              {task.status === 'QA' && (
                <>
                  <button
                    onClick={(e) => { e.stopPropagation(); void onMove(task, 'IN_PROGRESS'); }}
                    className="p-1.5 rounded-xl hover:bg-white/[0.06] text-zinc-500 hover:text-white transition-all border border-white/5 active:scale-90"
                    title="Move to In Progress"
                  >
                    <FiChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); void onMove(task, task.review_required ? 'REVIEW' : 'DONE'); }}
                    className="p-1.5 rounded-xl hover:bg-white/[0.06] text-zinc-500 hover:text-white transition-all border border-white/5 active:scale-90"
                    title={`Move to ${task.review_required ? 'Review' : 'Done'}`}
                  >
                    <FiChevronRight className="h-4 w-4" />
                  </button>
                </>
              )}
              {task.status === 'REVIEW' && (
                <>
                  <button
                    onClick={(e) => { e.stopPropagation(); void onMove(task, task.qa_required ? 'QA' : 'IN_PROGRESS'); }}
                    className="p-1.5 rounded-xl hover:bg-white/[0.06] text-zinc-500 hover:text-white transition-all border border-white/5 active:scale-90"
                    title={`Move to ${task.qa_required ? 'QA' : 'In Progress'}`}
                  >
                    <FiChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); void onMove(task, 'DONE'); }}
                    className="p-1.5 rounded-xl hover:bg-white/[0.06] text-zinc-500 hover:text-white transition-all border border-white/5 active:scale-90"
                    title="Move to Done"
                  >
                    <FiChevronRight className="h-4 w-4" />
                  </button>
                </>
              )}
              {task.status === 'DONE' && (
                <button
                  onClick={(e) => { e.stopPropagation(); void onMove(task, task.review_required ? 'REVIEW' : task.qa_required ? 'QA' : 'IN_PROGRESS'); }}
                  className="p-1.5 rounded-xl hover:bg-white/[0.06] text-zinc-500 hover:text-white transition-all border border-white/5 active:scale-90"
                  title={`Move to ${task.review_required ? 'Review' : task.qa_required ? 'QA' : 'In Progress'}`}
                >
                  <FiChevronLeft className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}