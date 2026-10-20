"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Task } from "@/types/task";
import { statusMapping } from "@/types/task";
import { User } from "@/types/user";
import { Project } from "@/types/project";
import KanbanCard, { KanbanCardBody, STATUS_COLOR } from "./kanban-card";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  type DropAnimation,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { toast } from "@/lib/toast";
import { useConfirm } from "@/providers/confirmation-provider";

type Status = keyof typeof statusMapping;

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
  col: Status;
  items: Task[];
  users: User[];
  user?: User;
  projects: Project[];
  columns: Status[];
  onMove: (task: Task, status: Task["status"]) => Promise<{ success: boolean; error?: string } | undefined>;
  onDelete: (task: Task) => Promise<void>;
  selectedId: string | null;
  onSelect: (id: string) => void;
  movedId: string | null;
  flash: boolean;
  canManage?: boolean;
}

// The dragged card settles into place with a soft spring instead of a snap.
const dropAnimation: DropAnimation = {
  duration: 260,
  easing: "cubic-bezier(.23, 1, .32, 1)",
};

function Column({ col, items, users, user, projects, columns, onMove, onDelete, selectedId, onSelect, movedId, flash, canManage }: ColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: col });
  const color = STATUS_COLOR[col];

  // Each status is its own lane, tinted with the status colour so the board
  // reads at a glance. The tint deepens while a card hovers over the lane.
  return (
    <section
      ref={setNodeRef}
      data-column={col}
      aria-label={`${statusMapping[col]}, ${items.length} tasks`}
      style={{
        backgroundColor: `color-mix(in oklab, ${color} ${isOver ? 12 : flash ? 9 : 5}%, var(--background))`,
        outline: isOver ? `1.5px dashed color-mix(in oklab, ${color} 55%, transparent)` : undefined,
        outlineOffset: -6,
      }}
      className="flex w-[300px] shrink-0 flex-col rounded-[28px] p-2 transition-[background-color] duration-200"
    >
      <header className="flex items-center gap-2.5 px-3 pb-2 pt-2.5">
        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} aria-hidden="true" />
        <h3 className="text-sm font-semibold text-foreground">{statusMapping[col]}</h3>
        <span className="md-count ml-auto bg-background text-text-muted">{items.length}</span>
      </header>

      <SortableContext items={items.map((t) => String(t.id))} strategy={verticalListSortingStrategy}>
        <div className="flex min-h-24 flex-1 flex-col gap-2">
          {items.map((task) => (
            <KanbanCard
              key={task.id}
              task={task}
              users={users}
              user={user}
              projects={projects}
              columns={columns}
              onMove={onMove}
              onDelete={onDelete}
              canManage={canManage}
              isSelected={selectedId === String(task.id)}
              justMoved={movedId === String(task.id)}
              onSelect={onSelect}
            />
          ))}

          {items.length === 0 && (
            <div className="flex h-24 items-center justify-center rounded-[22px] border border-dashed border-foreground/10">
              <span className="text-xs text-text-muted">{isOver ? "Drop here" : "No tasks"}</span>
            </div>
          )}
        </div>
      </SortableContext>
    </section>
  );
}

export default function KanbanBoard({ tasks = [], users, user, projects, updateTask, deleteTask, canManage }: KanbanBoardProps) {
  const confirm = useConfirm();
  const columns = useMemo(() => Object.keys(statusMapping) as Status[], []);
  const boardRef = useRef<HTMLDivElement>(null);

  const [grouped, setGrouped] = useState<Record<string, Task[]>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [movedId, setMovedId] = useState<string | null>(null);
  const [flashCol, setFlashCol] = useState<Status | null>(null);

  useEffect(() => {
    const next: Record<string, Task[]> = {};
    columns.forEach((c) => (next[c] = []));
    tasks.forEach((t) => (next[t.status] ?? next.TODO).push(t));
    const frame = window.requestAnimationFrame(() => setGrouped(next));
    return () => window.cancelAnimationFrame(frame);
  }, [tasks, columns]);

  // Press and hold to drag; a quick click selects instead.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { delay: 160, tolerance: 6 } })
  );

  const findColumn = useCallback((id: string): Status | null => {
    if ((columns as string[]).includes(id)) return id as Status;
    return columns.find((col) => grouped[col]?.some((t) => String(t.id) === id)) ?? null;
  }, [columns, grouped]);

  const findTask = useCallback((id: string | null) => {
    if (!id) return undefined;
    for (const col of columns) {
      const task = grouped[col]?.find((t) => String(t.id) === id);
      if (task) return task;
    }
    return undefined;
  }, [columns, grouped]);

  const persistStatus = async (task: Task, status: Task["status"]) => {
    if (task.status === status) return { success: true };
    const fd = new FormData();
    fd.append("id", String(task.id));
    fd.append("status", status);
    const result = await updateTask(fd);
    if (result?.success) toast.success(`Moved to ${statusMapping[status]}`);
    return result;
  };

  // One path for drag, keyboard and the card's arrow buttons: move locally
  // first, mark the card and the lane, then persist and roll back on failure.
  const moveTask = useCallback(async (task: Task, toCol: Status) => {
    const id = String(task.id);
    const fromCol = findColumn(id);
    if (!fromCol || fromCol === toCol) return { success: true };

    const moved = { ...task, status: toCol as Task["status"] };
    setGrouped((prev) => ({
      ...prev,
      [fromCol]: (prev[fromCol] || []).filter((t) => String(t.id) !== id),
      [toCol]: [...(prev[toCol] || []), moved],
    }));
    setMovedId(id);
    setFlashCol(toCol);
    window.setTimeout(() => {
      setMovedId((curr) => (curr === id ? null : curr));
      setFlashCol((curr) => (curr === toCol ? null : curr));
    }, 700);

    const res = await persistStatus(task, toCol as Task["status"]);
    if (res && !res.success) {
      setGrouped((prev) => ({
        ...prev,
        [toCol]: (prev[toCol] || []).filter((t) => String(t.id) !== id),
        [fromCol]: [...(prev[fromCol] || []), task],
      }));
      toast.error(res.error || "Could not move the task");
    }
    return res;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [findColumn]);

  const handleDelete = async (task: Task) => {
    const confirmed = await confirm({
      title: "Delete task",
      message: `Delete “${task.name}”? This cannot be undone.`,
      confirmText: "Delete task",
      type: "danger",
    });
    if (!confirmed) return;
    const fd = new FormData();
    fd.append("id", String(task.id));
    const result = await deleteTask(fd);
    if (result?.success) {
      toast.success(`Task deleted — ${task.name}`);
      setSelectedId((curr) => (curr === String(task.id) ? null : curr));
    }
  };

  const onDragStart = (evt: DragStartEvent) => {
    const id = String(evt.active.id);
    setActiveId(id);
    setSelectedId(id);
  };

  const onDragEnd = (evt: DragEndEvent) => {
    setActiveId(null);
    if (!evt.over) return;
    const task = findTask(String(evt.active.id));
    const toCol = findColumn(String(evt.over.id));
    if (task && toCol) void moveTask(task, toCol);
  };

  // Keyboard: arrows move the selection, Option/Alt + ←/→ moves the card to
  // the neighbouring lane, Escape clears the selection.
  useEffect(() => {
    if (!selectedId) return;
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) return;
      const task = findTask(selectedId);
      const col = findColumn(selectedId);
      if (!task || !col) return;
      const colIndex = columns.indexOf(col);
      const list = grouped[col] ?? [];
      const rowIndex = list.findIndex((t) => String(t.id) === selectedId);

      if (event.key === "Escape") {
        setSelectedId(null);
        return;
      }
      if (event.altKey && (event.key === "ArrowLeft" || event.key === "ArrowRight")) {
        event.preventDefault();
        const next = columns[colIndex + (event.key === "ArrowRight" ? 1 : -1)];
        if (next) void moveTask(task, next);
        return;
      }
      if (event.key === "ArrowUp" || event.key === "ArrowDown") {
        event.preventDefault();
        const next = list[rowIndex + (event.key === "ArrowDown" ? 1 : -1)];
        if (next) setSelectedId(String(next.id));
        return;
      }
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault();
        const step = event.key === "ArrowRight" ? 1 : -1;
        for (let i = colIndex + step; i >= 0 && i < columns.length; i += step) {
          const lane = grouped[columns[i]] ?? [];
          if (lane.length) {
            setSelectedId(String(lane[Math.min(rowIndex, lane.length - 1)].id));
            return;
          }
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedId, grouped, columns, findColumn, findTask, moveTask]);

  // Keep the selected card in view as it moves between lanes.
  useEffect(() => {
    if (!selectedId) return;
    boardRef.current
      ?.querySelector<HTMLElement>(`[data-task-id="${selectedId}"]`)
      ?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
  }, [selectedId, grouped]);

  // Clicking empty board space clears the selection.
  const onBoardPointerDown = (event: React.PointerEvent) => {
    if (!(event.target as HTMLElement).closest("[data-task-id]")) setSelectedId(null);
  };

  const activeTask = findTask(activeId);

  return (
    <div>
      <p className="mb-3 hidden items-center gap-3 px-1 text-xs text-text-muted md:flex">
        <span>Click to select</span>
        <span aria-hidden="true">·</span>
        <span>Hold to drag</span>
        <span aria-hidden="true">·</span>
        <span>
          <kbd className="rounded-full bg-foreground/[0.06] px-1.5 py-0.5 font-sans">⌥</kbd>{" "}
          <kbd className="rounded-full bg-foreground/[0.06] px-1.5 py-0.5 font-sans">←</kbd>{" "}
          <kbd className="rounded-full bg-foreground/[0.06] px-1.5 py-0.5 font-sans">→</kbd> to move
        </span>
      </p>
      <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setActiveId(null)}>
        <div ref={boardRef} onPointerDown={onBoardPointerDown} className="overflow-x-auto pb-2">
          <div className="flex min-w-max items-start gap-3">
            {columns.map((col) => (
              <Column
                key={col}
                col={col}
                items={grouped[col] ?? []}
                users={users}
                user={user}
                projects={projects}
                columns={columns}
                onMove={(task, status) => moveTask(task, status as Status)}
                onDelete={handleDelete}
                selectedId={selectedId}
                onSelect={setSelectedId}
                movedId={movedId}
                flash={flashCol === col}
                canManage={canManage}
              />
            ))}
          </div>
        </div>
        <DragOverlay dropAnimation={dropAnimation}>
          {activeTask ? (
            <div className="rotate-[1.5deg] scale-[1.02] cursor-grabbing rounded-[22px] ring-2 ring-accent/40">
              <KanbanCardBody task={activeTask} users={users} projects={projects} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
