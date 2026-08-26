"use client";

import React, { useEffect, useMemo, useState } from "react";
import type { Task } from "@/types/task";
import { statusMapping } from "@/types/task";
import { User } from "@/types/user";
import { Project } from "@/types/project";
import KanbanCard from "./kanban-card";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { toast } from "@/lib/toast";
import { useConfirm } from "@/providers/confirmation-provider";

interface KanbanBoardProps {
  tasks?: Task[];
  users: User[];
  user?: User;
  projects: Project[];
  updateTask: (formData: FormData) => Promise<{ success: boolean; error?: string } | undefined>;
  deleteTask: (formData: FormData) => Promise<{ success: boolean; error?: string } | undefined>;
  canManage?: boolean;
}

interface ColumnProps {
  col: keyof typeof statusMapping;
  items: Task[];
  users: User[];
  user?: User;
  projects: Project[];
  columns: Array<keyof typeof statusMapping>;
  onMove: (task: Task, status: Task["status"]) => Promise<{ success: boolean; error?: string } | undefined>;
  onDelete: (task: Task) => Promise<void>;
  highlightedIds: Record<string, boolean>;
  flash: boolean;
  canManage?: boolean;
  isLast?: boolean;
}

function Column({ col, items, users, user, projects, columns, onMove, onDelete, highlightedIds, flash, canManage, isLast }: ColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: col });

  // Columns butt directly against each other and are told apart by a hairline
  // rule, so the drop targets are contiguous — there is no dead gutter between
  // them for a dragged card to be released into.
  return (
    <div
      ref={setNodeRef}
      id={String(col)}
      data-column={col}
      className={`flex w-[320px] shrink-0 flex-col transition-colors duration-200 ${
        isLast ? '' : 'border-r border-border-subtle'
      } ${isOver ? 'bg-foreground/[0.04]' : flash ? 'bg-emerald-500/[0.06]' : ''}`}
    >
      <div className="flex items-center justify-between border-b border-border-subtle px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className={`h-2 w-2 rounded-full ${
            col === 'DONE' ? 'bg-[var(--pastel-emerald)]' :
            col === 'IN_PROGRESS' ? 'bg-[var(--pastel-blue)]' :
            col === 'QA' ? 'bg-[var(--pastel-purple)]' :
            col === 'REVIEW' ? 'bg-[var(--pastel-indigo)]' :
            'bg-text-muted'
          }`} />
          <h3 className="text-[10px] font-medium uppercase tracking-widest text-text-muted">
            {statusMapping[col]}
          </h3>
        </div>
        <span className="text-[11px] font-medium tabular-nums text-text-muted">
          {items?.length ?? 0}
        </span>
      </div>

      <SortableContext items={(items ?? []).map((t) => String(t.id))} strategy={verticalListSortingStrategy}>
        {/* flex-1 so the droppable area fills the column even when it is empty */}
        <div className="flex flex-1 flex-col gap-2 p-3">
          {(items ?? []).map((task) => (
            <div
              key={task.id}
              className={`rounded-xl transition-colors duration-200 ${
                highlightedIds[String(task.id)] ? 'ring-2 ring-emerald-500/60' : ''
              }`}
            >
              <KanbanCard
                task={task}
                users={users}
                user={user}
                projects={projects}
                columns={columns}
                onMove={onMove}
                onDelete={onDelete}
                canManage={canManage}
              />
            </div>
          ))}

          {isOver && (
            <div className="flex h-20 items-center justify-center rounded-xl border border-dashed border-foreground/20 bg-foreground/[0.02]">
              <span className="text-[10px] font-medium uppercase tracking-widest text-text-muted">
                Drop here
              </span>
            </div>
          )}

          {(items ?? []).length === 0 && !isOver && (
            <div className="flex h-20 items-center justify-center rounded-xl border border-dashed border-border-subtle">
              <span className="text-xs text-text-muted">No tasks</span>
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}

export default function KanbanBoard({ tasks = [], users, user, projects, updateTask, deleteTask, canManage }: KanbanBoardProps) {
  const confirm = useConfirm();
  const columns = useMemo(() => Object.keys(statusMapping) as Array<keyof typeof statusMapping>, []);

  const [grouped, setGrouped] = useState<Record<string, Task[]>>({});

  useEffect(() => {
    const next: Record<string, Task[]> = {};
    columns.forEach((c) => (next[c] = []));
    tasks.forEach((t) => {
      if (next[t.status]) {
        next[t.status].push(t);
      } else {
        next['TODO'].push(t);
      }
    });
    const frame = window.requestAnimationFrame(() => setGrouped(next));
    return () => window.cancelAnimationFrame(frame);
  }, [tasks, columns]);

  const [highlightedIds, setHighlightedIds] = useState<Record<string, boolean>>({});
  const [flashCol, setFlashCol] = useState<keyof typeof statusMapping | null>(null);


  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const findContainer = (id: string | number | undefined): keyof typeof statusMapping | null => {
    if (!id && id !== 0) return null;
    const idStr = String(id);
    if ((Object.keys(statusMapping) as string[]).includes(idStr)) return idStr as keyof typeof statusMapping;
    for (const col of columns) {
      if (grouped[col]?.some((t) => String(t.id) === idStr)) return col;
    }
    return null;
  };

  const moveTo = async (task: Task, status: Task["status"]) => {
    if (task.status === status) return { success: true };
    const fd = new FormData();
    fd.append("id", String(task.id));
    fd.append("status", status);
    const result = await updateTask(fd);
    if (result?.success) {
      toast.success(`Task moved to ${statusMapping[status]}`);
    }
    return result;
  };

  const handleDelete = async (task: Task) => {
    const confirmed = await confirm({
      title: 'Delete task',
      message: `Delete “${task.name}”? This cannot be undone.`,
      confirmText: 'Delete task',
      type: 'danger',
    });
    if (!confirmed) return;
    const fd = new FormData();
    fd.append("id", String(task.id));
    const result = await deleteTask(fd);
    if (result?.success) {
      toast.success(`Task deleted — ${task.name}`);
    }
  };

  const onDragEnd = async (evt: DragEndEvent) => {
    const { active, over } = evt;
    if (!over) return;
    const activeId = active.id as string | number;
    const overId = over.id as string | number;

    const fromCol = findContainer(activeId);
    const toCol = findContainer(overId);
    if (!fromCol || !toCol) return;
    if (fromCol === toCol) return; // keep ordering as-is for now

    const activeTask = grouped[fromCol]?.find((t) => String(t.id) === String(activeId));
    if (!activeTask) return;

    // Optimistic local move to end of target column
    setGrouped((prev) => {
      const next = { ...prev };
      next[fromCol] = (prev[fromCol] || []).filter((t) => String(t.id) !== String(activeId));
      next[toCol] = [...(prev[toCol] || []), { ...activeTask, status: toCol as Task["status"] }];
      return next;
    });

    // Visual feedback: highlight moved card and flash the target column
    setHighlightedIds((prev) => ({ ...prev, [String(activeId)]: true }));
    setFlashCol(toCol);
    setTimeout(() => {
      setHighlightedIds((prev) => {
        const next = { ...prev };
        delete next[String(activeId)];
        return next;
      });
      setFlashCol((curr) => (curr === toCol ? null : curr));
    }, 900);

    // Persist status change
    const res = await moveTo(activeTask, toCol as Task["status"]);
    if (res && !res.success) {
      // Revert move if failed
      setGrouped((prev) => {
        const next = { ...prev };
        next[toCol] = (prev[toCol] || []).filter((t) => String(t.id) !== String(activeId));
        next[fromCol] = [...(prev[fromCol] || []), activeTask];
        return next;
      });
    }
  };

  return (
    <DndContext sensors={sensors} onDragEnd={onDragEnd}>
      {/* One continuous surface. The rounded border belongs to the board, not to
          each column, so the columns read as divisions of a single board. */}
      <div className="overflow-hidden rounded-2xl border border-card-border bg-card">
        <div className="overflow-x-auto">
          <div className="flex min-w-max items-stretch">
            {columns.map((col, index) => (
              <Column
                key={col}
                col={col}
                items={grouped[col] ?? []}
                users={users}
                user={user}
                projects={projects}
                columns={columns}
                onMove={moveTo}
                onDelete={handleDelete}
                highlightedIds={highlightedIds}
                flash={flashCol === col}
                canManage={canManage}
                isLast={index === columns.length - 1}
              />
            ))}
          </div>
        </div>
      </div>
    </DndContext>
  );
}
