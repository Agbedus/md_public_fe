"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";

import React, { useState } from "react";
import { Task, priorityMapping, statusMapping } from "@/types/task";
import { FiCheck, FiX, FiEdit2, FiTrash2, FiPlay, FiPause, FiSquare, FiClock } from "react-icons/fi";
import UserAvatarGroup from '@/components/ui/user-avatar-group';
import { format } from 'date-fns';
import { Combobox } from "@/components/ui/combobox";
import { CustomDatePicker } from "@/components/ui/inputs/custom-date-picker";
import { CustomSelect } from "@/components/ui/inputs/custom-select";

import { User } from "@/types/user";
import { Project } from "@/types/project";

import { toast } from "@/lib/toast";
import { startTaskTimer, pauseTaskTimer, stopTaskTimer } from "@/app/(dashboard)/[orgSlug]/tasks/actions";
import { useTaskTimer } from "@/providers/task-timer-provider";
import { canUserWorkOnTask, canDeleteTask } from "@/lib/task-auth";
import { useConfirm } from "@/providers/confirmation-provider";
import Image from "next/image";
import { trackAction } from '@/lib/recent-actions';
import { Tooltip } from '@/components/ui/Tooltip';
import { avatarStyle } from '@/lib/avatar-color';
import { formatStatus } from '@/lib/format-status';

import { Spinner } from '@/components/ui/busy-icon';
interface TaskCardProps {
    task: Task;
    user?: User;
    users?: User[];
    projects?: Project[];
    updateTask?: (formData: FormData) => Promise<{ success: boolean; error?: string } | undefined>;
    deleteTask?: (formData: FormData) => Promise<{ success: boolean; error?: string } | undefined>;
    hideProject?: boolean;
    isEditing?: boolean;
    isNew?: boolean;
    onEdit?: () => void;
    onCancel?: () => void;
    canManage?: boolean;
}

const TaskCard = React.forwardRef<HTMLTableRowElement, TaskCardProps>(({ 
    task, 
    user: currentUser,
    users = [], 
    projects = [], 
    updateTask = async () => ({ success: true }), 
    deleteTask = async () => ({ success: true }),
    hideProject = false,
    isEditing = false,
    isNew = false,
    onEdit = () => {},
    onCancel = () => {},
    canManage = false
}, ref) => {
    const { startTimer, activeTask } = useTaskTimer();
    const confirm = useConfirm();
    const [selectedAssignees, setSelectedAssignees] = useState<(string | number)[]>(
      task.assignees?.map(a => a.user.id) || []
    );
    const [selectedProject, setSelectedProject] = useState<string | number | null>(
      task.projectId || null
    );
    const [dueDate, setDueDate] = useState<Date | null>(
        task.dueDate ? new Date(task.dueDate) : null
    );
    const [qaRequired, setQaRequired] = useState(task.qa_required);
    const [reviewRequired, setReviewRequired] = useState(task.review_required);
    const [dependsOn, setDependsOn] = useState<number | null>(task.depends_on_id);
    const [isUpdating, setIsUpdating] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [optimisticChecked, setOptimisticChecked] = useState<boolean | null>(null);
    const reduceMotion = useReducedMotion();
    const [isTimerRunning, setIsTimerRunning] = useState(false);
    const formRef = React.useRef<HTMLFormElement>(null);

    // Check if there's an active timer
    const hasActiveTimer = task.timeLogs?.some(log => log.is_active) || false;
    const totalHours = task.totalHours || 0;

    // Sync state when not editing (in case of background updates)
    React.useEffect(() => {
        if (!isEditing) {
            setSelectedAssignees(task.assignees?.map(a => a.user.id) || []);
            setSelectedProject(task.projectId || null);
            setDueDate(task.dueDate ? new Date(task.dueDate) : null);
            setQaRequired(task.qa_required);
            setReviewRequired(task.review_required);
            setDependsOn(task.depends_on_id);
        }
    }, [task, isEditing]);

    const displayAssignees = React.useMemo(() => {
        if (task.assignees && task.assignees.length > 0) return task.assignees.map(a => a.user);
        if (!task.assigneeIds || task.assigneeIds.length === 0) return [];
        return users.filter(u => task.assigneeIds?.includes(u.id));
    }, [task.assignees, task.assigneeIds, users]);

    const handleUpdateSubmit = async (e?: React.FormEvent<HTMLFormElement>) => {
      if (e) e.preventDefault();
      
      setIsUpdating(true);
      try {
        const formData = new FormData();
        formData.append("id", task.id.toString());
        
        // Gather from inputs that might be outside or inside
        const form = document.getElementById(`update-${task.id}`) as HTMLFormElement;
        if (form) {
            const nameInput = document.querySelector(`input[name="name"][form="update-${task.id}"]`) as HTMLInputElement;
            const descInput = document.querySelector(`input[name="description"][form="update-${task.id}"]`) as HTMLInputElement;
            const prioritySelect = document.querySelector(`input[name="priority"][form="update-${task.id}"]`) as HTMLInputElement;
            const statusSelect = document.querySelector(`input[name="status"][form="update-${task.id}"]`) as HTMLInputElement;

            if (nameInput) formData.append('name', nameInput.value);
            if (descInput) formData.append('description', descInput.value);
            if (prioritySelect) formData.append('priority', prioritySelect.value);
            if (statusSelect) formData.append('status', statusSelect.value);
        }
        
        // Gather from state
        formData.append('assigneeIds', JSON.stringify(selectedAssignees));
        formData.append('projectId', selectedProject ? selectedProject.toString() : '');
        formData.append('qa_required', qaRequired.toString());
        formData.append('review_required', reviewRequired.toString());
        formData.append('depends_on_id', dependsOn ? dependsOn.toString() : '');
        if (dueDate) {
            formData.append('dueDate', format(dueDate, 'yyyy-MM-dd'));
        } else {
            formData.append('dueDate', '');
        }
        
        trackAction('task', 'updated');
        const result = await updateTask(formData);
        if (result?.success) {
            toast.success(`Task updated — ${task.name}`);
            onCancel();
        } else {
            toast.error(result?.error || "Failed to update task");
        }
      } catch (error) {
        toast.error("An unexpected error occurred");
        console.error(error);
      } finally {
        setIsUpdating(false);
      }
    };

    const handleSubmitClick = async () => {
      await handleUpdateSubmit();
    };

    const handleStatusToggle = async () => {
      if (optimisticChecked !== null) return;
      const completing = task.status !== "DONE";
      setOptimisticChecked(completing);
      // Show the new check state and its small spring before the row leaves this tab.
      if (!reduceMotion) await new Promise((resolve) => setTimeout(resolve, 180));
      const formData = new FormData();
      formData.append("id", task.id.toString());
      formData.append("status", completing ? "DONE" : "IN_PROGRESS");
      trackAction('task', 'updated');
      try {
        const result = await updateTask(formData);
        if (result?.success) {
          toast.success(`Task ${completing ? "completed" : "in progress"} — ${task.name}`);
        } else {
          toast.error(result?.error || "Failed to update status");
        }
      } catch {
        toast.error("Failed to update status");
      } finally {
        setOptimisticChecked(null);
      }
    };

    const rowClasses = "border-b border-card-border transition-colors hover:bg-foreground/[0.03]";

    const variants: Variants = {
       initial: { opacity: 0 },
       animate: { opacity: 1, transition: { duration: reduceMotion ? 0 : 0.18 } },
       deleting: { opacity: 0.5, transition: { duration: reduceMotion ? 0 : 0.12 } },
       exit: { opacity: 0, transition: { duration: reduceMotion ? 0 : 0.18, ease: [0.23, 1, 0.32, 1] } },
    };

    return isEditing ? (
      <motion.tr
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: reduceMotion ? 0 : 0.16 }}
        className={rowClasses} 
        ref={ref}
      >
        <td className="px-5 py-3 text-xs font-bold text-foreground whitespace-nowrap sticky left-0 z-10 bg-card border-r border-card-border">
          <form
            ref={formRef}
            id={`update-${task.id}`}
            onSubmit={handleUpdateSubmit}
            method="post"
            style={{ display: "none" }}
          ></form>
          <input className="text-foreground" form={`update-${task.id}`} type="hidden" name="id" value={task.id} />
          <input form={`update-${task.id}`} type="hidden" name="qa_required" value={task.qa_required ? 'true' : 'false'} />
          <input form={`update-${task.id}`} type="hidden" name="review_required" value={task.review_required ? 'true' : 'false'} />
          {task.depends_on_id && <input form={`update-${task.id}`} type="hidden" name="depends_on_id" value={task.depends_on_id} />}
          {dueDate && <input form={`update-${task.id}`} type="hidden" name="dueDate" value={format(dueDate, 'yyyy-MM-dd')} />}
          {selectedAssignees.length > 0 && <input form={`update-${task.id}`} type="hidden" name="assigneeIds" value={JSON.stringify(selectedAssignees)} />}
          {selectedProject && <input form={`update-${task.id}`} type="hidden" name="projectId" value={selectedProject.toString()} />}
            <input
              form={`update-${task.id}`}
              type="text"
              name="name"
              defaultValue={task.name}
              disabled={isUpdating}
              className="w-full bg-foreground/[0.03] border border-card-border rounded-xl focus:outline-none focus:bg-foreground/[0.06] px-3 py-1.5 text-foreground placeholder:text-text-muted/50 text-xs transition-all disabled:opacity-50"
            />
          </td>
          <td className="px-5 py-3 text-xs text-text-muted whitespace-nowrap bg-foreground/[0.02]">
            <input
              form={`update-${task.id}`}
              type="text"
              name="description"
              defaultValue={task.description || ''}
              disabled={isUpdating}
              className="w-full bg-foreground/[0.03] border border-card-border rounded-xl focus:outline-none focus:bg-foreground/[0.06] px-3 py-1.5 text-foreground placeholder:text-text-muted/50 text-xs transition-all disabled:opacity-50"
            />
          </td>
          <td className="px-5 py-3 text-xs text-text-muted whitespace-nowrap">
            <CustomSelect
              label="Priority"
              form={`update-${task.id}`}
              name="priority"
              defaultValue={task.priority}
              disabled={isUpdating}
              options={Object.entries(priorityMapping).map(([value, label]) => ({ value, label }))}
              triggerClassName="min-h-9 text-xs"
            />
          </td>
          <td className="px-5 py-3 text-xs text-text-muted whitespace-nowrap min-w-[200px]">
            <Combobox
              options={users.map(u => ({ value: u.id, label: u.fullName || u.email, subLabel: u.email, avatarUrl: u.avatarUrl }))}
              value={selectedAssignees}
              onChange={(val) => setSelectedAssignees(val as (string | number)[])}
              multiple
              compact
              placeholder="Assign..."
              searchPlaceholder="Search users..."
              className="w-full"
            />
          </td>
          <td className="px-5 py-3 text-[11px] text-text-muted whitespace-nowrap min-w-[120px] bg-foreground/[0.02]">
            <CustomDatePicker
                value={dueDate}
                onChange={setDueDate}
                name="dueDate"
                form={`update-${task.id}`}
                className="w-full"
                placeholder="Due date"
                disabled={isUpdating}
            />
          </td>
          <td className="px-5 py-3 text-xs text-text-muted whitespace-nowrap">
              {/* Owner cannot be changed during edit, just display it */}
             {task.owner ? (
                <div className="flex items-center gap-2">
                     {task.owner.avatarUrl ? (
                        <Image src={task.owner.avatarUrl} alt={task.owner.fullName || ''} width={20} height={20} className="w-5 h-5 rounded-full" />
                    ) : (
                        <div style={avatarStyle(task.owner.fullName || task.owner.email)} className="w-5 h-5 rounded-full bg-foreground/[0.06] flex items-center justify-center text-[11px] text-foreground shadow-sm">
                            {(task.owner.fullName || task.owner.email || '?')[0].toUpperCase()}
                        </div>
                    )}
                    <span className="text-xs text-foreground">{task.owner.fullName || task.owner.email}</span>
                </div>
            ) : <span className="text-xs text-text-muted">-</span>}
          </td>
          {!hideProject && (
            <td className="px-5 py-3 text-xs text-text-muted whitespace-nowrap min-w-[150px]">
              <Combobox
                options={projects.map(p => ({ value: p.id, label: p.name, subLabel: p.key || undefined }))}
                value={selectedProject || ''}
                onChange={(val) => setSelectedProject(val as string | number | null)}
                placeholder="Project..."
                searchPlaceholder="Search projects..."
                className="w-full"
              />
            </td>
          )}
          <td className="px-5 py-3 text-xs text-text-secondary whitespace-nowrap bg-foreground/[0.03]">
            <CustomSelect
              label="Status"
              form={`update-${task.id}`}
              name="status"
              defaultValue={task.status}
              disabled={isUpdating}
              options={Object.entries(statusMapping).map(([value, label]) => ({ value, label }))}
              triggerClassName="min-h-9 text-xs"
            />
          </td>
          {/* Time Logged placeholder in edit mode */}
          <td className="px-5 py-3 text-xs text-text-muted whitespace-nowrap">
            {totalHours > 0 ? (
              <div className="flex items-center gap-1.5">
                <FiClock className="w-3 h-3 text-text-muted" />
                <span className="font-bold text-text-secondary tabular-nums">{totalHours.toFixed(1)}h</span>
              </div>
            ) : <span>-</span>}
          </td>
          <td className="px-5 py-3 text-xs text-text-muted whitespace-nowrap bg-foreground/[0.02]">
            <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer group">
                    <div className="relative flex items-center">
                        <input 
                            type="checkbox" 
                            checked={qaRequired}
                            onChange={(e) => setQaRequired(e.target.checked)}
                            className="peer md-check"
                        />
                        <FiCheck className="pointer-events-none absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 transition-opacity peer-checked:opacity-100" />
                    </div>
                    <span className="text-[11px] font-bold text-text-muted group-hover:text-foreground transition-colors">QA</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer group">
                    <div className="relative flex items-center">
                        <input 
                            type="checkbox" 
                            checked={reviewRequired}
                            onChange={(e) => setReviewRequired(e.target.checked)}
                            className="peer md-check"
                        />
                        <FiCheck className="pointer-events-none absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 transition-opacity peer-checked:opacity-100" />
                    </div>
                    <span className="text-[11px] font-bold text-text-muted group-hover:text-foreground transition-colors">Review</span>
                </label>
            </div>
          </td>
          <td className="px-5 py-3 text-xs text-text-muted whitespace-nowrap min-w-[180px] bg-foreground/[0.03]">
            <Combobox
              options={projects.flatMap(p => p.tasks || []).filter(t => t.id !== task.id).map(t => ({ value: t.id, label: t.name }))}
              value={dependsOn || ''}
              onChange={(val) => setDependsOn(val as number | null)}
              placeholder="Depends on..."
              className="w-full"
            />
          </td>
          <td className="px-5 py-3 text-xs font-bold text-right whitespace-nowrap sticky right-0 z-10 bg-card border-l border-card-border">
            <div className="flex items-center justify-end space-x-2">
                <button
                    type="button"
                    onClick={handleSubmitClick}
                    disabled={isUpdating}
                    className="hover-scale flex h-8 w-8 items-center justify-center rounded-lg bg-success/20 text-success-text transition-colors hover:bg-success/30 disabled:opacity-50"
                >
                    {isUpdating ? (
                      <Spinner className="h-3.5 w-3.5 text-success-text" />
                    ) : (
                      <FiCheck className="w-4 h-4" />
                    )}
                </button>
                <button
                type="button"
                onClick={onCancel}
                className="hover-scale flex h-8 w-8 items-center justify-center rounded-full bg-foreground/[0.03] text-text-muted transition-colors hover:bg-foreground/[0.06] hover:text-foreground"
                >
                <FiX className="w-3 h-3" />
                </button>
            </div>
          </td>
        </motion.tr>
    ) : (
      <motion.tr
        variants={variants}
        initial="initial"
        animate={isDeleting ? "deleting" : "animate"}
        exit="exit"
        className={`${rowClasses} group items-center ${isNew ? 'new-task-glow' : ''}`}
        ref={ref}
      >
        <td className="px-5 py-3 text-xs font-bold text-foreground whitespace-nowrap sticky left-0 z-10 bg-card border-r border-card-border">
          <div className="flex items-center">
          <motion.div
            className="relative flex items-center shrink-0"
            animate={optimisticChecked !== null && !reduceMotion ? { scale: [1, 0.86, 1.12, 1] } : { scale: 1 }}
            transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
          >
            <input
              type="checkbox"
              checked={optimisticChecked ?? task.status === "DONE"}
              onChange={() => { void handleStatusToggle(); }}
              disabled={optimisticChecked !== null}
              aria-label={`${task.status === "DONE" ? "Reopen" : "Complete"} ${task.name}`}
              className="peer md-check"
            />
            <FiCheck className="pointer-events-none absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 transition-opacity peer-checked:opacity-100" />
          </motion.div>
          <Tooltip
            content={<p className="text-xs font-medium leading-relaxed text-foreground">{task.name}</p>}
            className="ml-4 min-w-0 justify-start"
          >
            <span className={`block max-w-[250px] truncate font-bold tracking-tight ${task.status === "DONE" ? "line-through text-text-muted" : "text-foreground"}`}>
              {task.name}
            </span>
          </Tooltip>
          </div>
        </td>
        <td className="px-5 py-3 text-xs text-text-muted whitespace-nowrap max-w-[300px] truncate hidden lg:table-cell">
          {task.description || <span className="text-text-muted/50 italic">No description</span>}
        </td>
        <td className="px-5 py-3 text-xs whitespace-nowrap hidden sm:table-cell">
          <span
            className={`px-3 py-1 inline-flex text-[11px] font-bold rounded-full border capitalize whitespace-nowrap ${
 task.priority === 'high'
 ? 'bg-[var(--pastel-rose)]/10 text-[var(--pastel-rose)] border-[var(--pastel-rose)]/20 pulse-soft'
 : task.priority === 'medium'
 ? 'bg-[var(--pastel-amber)]/10 text-[var(--pastel-amber)] border-[var(--pastel-amber)]/20'
 : 'bg-[var(--pastel-emerald)]/10 text-[var(--pastel-emerald)] border-[var(--pastel-emerald)]/20'
 }`}
          >
            {task.priority}
          </span>
        </td>
        <td className="px-5 py-3 text-xs text-text-muted whitespace-nowrap hidden lg:table-cell">
            {displayAssignees.length > 0 ? (
                <UserAvatarGroup users={displayAssignees} size="xs" limit={3} />
            ) : (
                <span className="text-text-muted/30 italic">Unassigned</span>
            )}
        </td>
        <td className="px-5 py-3 text-xs text-text-muted whitespace-nowrap">
          {task.dueDate ? format(new Date(task.dueDate as string), "MMM dd, yyyy") : <span className="text-text-muted/50">-</span>}
        </td>
        <td className="px-5 py-3 text-xs text-text-muted whitespace-nowrap hidden md:table-cell">
            {task.owner ? (
                <div className="flex items-center gap-2">
                     {task.owner.avatarUrl ? (
                        <Image src={task.owner.avatarUrl} alt={task.owner.fullName || ''} width={20} height={20} className="w-5 h-5 rounded-full" />
                    ) : (
                        <div style={avatarStyle(task.owner.fullName || task.owner.email)} className="w-5 h-5 rounded-full bg-foreground/[0.06] flex items-center justify-center text-[11px] text-foreground">
                            {(task.owner.fullName || task.owner.email || '?')[0].toUpperCase()}
                        </div>
                    )}
                    <span className="text-xs text-foreground font-bold">{task.owner.fullName || task.owner.email}</span>
                </div>
            ) : <span className="text-xs text-text-muted/30">-</span>}
        </td>
        <td className="px-5 py-3 text-xs text-text-muted whitespace-nowrap hidden md:table-cell">
            {task.projectId ? (
                <span className="text-[var(--pastel-indigo)] font-bold capitalize tracking-tight text-[11px] bg-[var(--pastel-indigo)]/5 px-2 py-0.5 rounded-full border border-[var(--pastel-indigo)]/10 whitespace-nowrap">
                    {projects.find(p => p.id === task.projectId)?.name}
                </span>
            ) : (
                <span className="text-text-muted/30 italic">No Project</span>
            )}
        </td>
        <td className="px-5 py-3 text-xs whitespace-nowrap">
          <span
            className={`px-3 py-1 inline-flex text-[11px] font-bold rounded-full border capitalize whitespace-nowrap ${
 task.status === 'DONE'
 ? 'bg-[var(--pastel-emerald)]/10 text-[var(--pastel-emerald)] border-[var(--pastel-emerald)]/20'
 : task.status === 'IN_PROGRESS'
 ? 'bg-[var(--pastel-blue)]/10 text-[var(--pastel-blue)] border-[var(--pastel-blue)]/20'
 : task.status === 'QA'
 ? 'bg-[var(--pastel-purple)]/10 text-[var(--pastel-purple)] border-[var(--pastel-purple)]/20'
 : task.status === 'REVIEW'
 ? 'bg-[var(--pastel-indigo)]/10 text-[var(--pastel-indigo)] border-[var(--pastel-indigo)]/20'
 : 'bg-foreground/[0.03] text-text-muted border-card-border'
 }`}
          >
            {formatStatus(task.status)}
          </span>
        </td>
        {/* Time Logged */}
        <td className="px-5 py-3 text-xs whitespace-nowrap">
          {hasActiveTimer ? (
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
              <span className="text-[11px] font-medium text-success-text dark:text-success-text">Active</span>
              {totalHours > 0 && (
                <span className="text-[11px] text-text-muted ml-1">+{totalHours.toFixed(1)}h</span>
              )}
            </div>
          ) : totalHours > 0 ? (
            <div className="flex items-center gap-1.5">
              <FiClock className="w-3.5 h-3.5 text-text-muted" />
              <span className="font-medium text-foreground tabular-nums">{totalHours.toFixed(1)}h</span>
            </div>
          ) : (
            <span className="text-text-muted/50">-</span>
          )}
        </td>
<td className="px-5 py-3 text-xs text-text-muted whitespace-nowrap">
            <div className="flex items-center gap-2">
                {task.qa_required && (
                    <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-[var(--pastel-purple)]/10 text-[var(--pastel-purple)] border border-[var(--pastel-purple)]/20 whitespace-nowrap">QA</span>
                )}
                {task.review_required && (
                    <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-[var(--pastel-indigo)]/10 text-[var(--pastel-indigo)] border border-[var(--pastel-indigo)]/20 whitespace-nowrap">Review</span>
                )}
                {!task.qa_required && !task.review_required && <span className="text-text-muted/50">-</span>}
            </div>
        </td>
        <td className="px-5 py-3 text-xs text-text-muted whitespace-nowrap">
            {task.depends_on_id ? (
                <div className="flex items-center gap-2 text-[11px] font-bold text-warning-text cursor-help" data-tooltip={`Requires Task ID: ${task.depends_on_id}`}>
                    <FiClock className="w-3 h-3" />
                    <span>Req #{task.depends_on_id}</span>
                </div>
            ) : <span className="text-text-muted/30">-</span>}
        </td>
                <td className="sticky right-0 z-10 border-l border-card-border bg-card px-5 py-3 text-right text-xs font-bold whitespace-nowrap">
          <div className="flex items-center justify-end space-x-1">
            {canUserWorkOnTask(currentUser, task) && (
              <button
                type="button"
                onClick={() => startTimer(task)}
                className={`hover-scale flex h-8 w-8 items-center justify-center rounded-lg border transition-colors ${activeTask?.id === task.id ? 'bg-accent/10 text-accent-text dark:text-accent-text border-accent/20' : 'text-text-muted hover:text-foreground hover:bg-foreground/[0.06] border-transparent hover:border-card-border'}`}
                data-tooltip="Work on Mission" aria-label="Work on Mission"
              >
                <FiPlay className={`w-3.5 h-3.5 ${activeTask?.id === task.id ? 'fill-current' : ''}`} />
              </button>
            )}
            {(canManage || canUserWorkOnTask(currentUser, task)) && (
            <button
                type="button"
                onClick={onEdit}
                disabled={task.id < 0}
                className="hover-scale flex h-8 w-8 items-center justify-center rounded-lg border border-transparent text-text-muted transition-colors hover:border-card-border hover:bg-foreground/[0.06] hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
                data-tooltip={task.id < 0 ? "Saving..." : "Edit"} aria-label={task.id < 0 ? "Saving..." : "Edit"}
            >
                <FiEdit2 className="w-3.5 h-3.5" />
            </button>
            )}
            {(canManage || canDeleteTask(currentUser, task)) && (
            <button 
                type="button" 
                disabled={task.id < 0 || isDeleting}
                onClick={async () => {
                    const confirmed = await confirm({
                        title: 'Delete Task',
                        message: `Are you sure you want to delete "${task.name}"? This action cannot be undone.`,
                        confirmText: 'Delete Task',
                        type: 'danger'
                    });

                    if (!confirmed) return;

                    setIsDeleting(true);
                    try {
                        if (!reduceMotion) await new Promise((resolve) => setTimeout(resolve, 120));
                        const fd = new FormData();
                        fd.append('id', task.id.toString());
                        trackAction('task', 'deleted');
                        const result = await deleteTask(fd);
                        if (result?.success) {
                            toast.success(`Task deleted — ${task.name}`);
                        } else {
                            toast.error(result?.error || "Failed to delete task");
                        }
                    } catch (error) {
                        toast.error("An unexpected error occurred");
                    } finally {
                        setIsDeleting(false);
                    }
                }}
                className="hover-scale flex h-8 w-8 items-center justify-center rounded-lg border border-transparent text-text-muted transition-colors hover:border-danger/20 hover:bg-danger/10 hover:text-danger-text disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
                data-tooltip={task.id < 0 ? "Saving..." : "Delete"} aria-label={task.id < 0 ? "Saving..." : "Delete"}
            >
                {isDeleting ? <Spinner className="h-3.5 w-3.5 text-danger-text" /> : <FiTrash2 className="w-3.5 h-3.5" />}
            </button>
            )}
          </div>
        </td>
      </motion.tr>
    );
});

TaskCard.displayName = "TaskCard";

export default TaskCard;
