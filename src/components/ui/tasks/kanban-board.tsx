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

interface KanbanBoardProps {
  tasks?: Task[];
  users: User[];
  user?: User;
  projects: Project[];
  updateTask: (formData: FormData) => Promise<{ success: boolean; error?: string } | undefined>;
  deleteTask: (formData: FormData) => Promise<{ success: boolean; error?: string } | undefined>;
}

interface ColumnProps {
  col: keyof typeof statusMapping;
  items: Task[];
  users: User[];
  user?: User;
  projects: Project[];
  columns: Array<keyof typeof statusMapping>;
  onMove: (task: Task, status: Task["status"]) => Promise<void>;
  onDelete: (task: Task) => Promise<void>;
  highlightedIds: Record<string, boolean>;
  flash: boolean;
}

function Column({ col, items, users, user, projects, columns, onMove, onDelete, highlightedIds, flash }: ColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: col });
  return (
    <div
      ref={setNodeRef}
      id={String(col)}
      data-column={col}
      className={`glass rounded-2xl p-4 flex flex-col transition-all duration-300 ${
        isOver
          ? 'bg-white/[0.06] ring-2 ring-indigo-500/50 -[0_0_30px_rgba(99,102,241,0.1)]'
          : 'bg-zinc-900/10'
      } ${flash ? 'ring-2 ring-emerald-500/50 bg-emerald-500/10' : ''}`}
    >
      <div className="flex items-center justify-between mb-6 px-1">
        <div className="flex items-center gap-3">
          <div className={`w-2.5 h-2.5 rounded-full  ${
            col === 'DONE' ? 'bg-[var(--pastel-emerald)] -[0_0_10px_rgba(16,185,129,0.3)]' : 
            col === 'IN_PROGRESS' ? 'bg-[var(--pastel-blue)] -[0_0_10px_rgba(59,130,246,0.3)]' : 
            col === 'QA' ? 'bg-purple-500 -[0_0_10px_rgba(168,85,247,0.3)]' :
            col === 'REVIEW' ? 'bg-blue-500 -[0_0_10px_rgba(59,130,246,0.3)]' :
            'bg-zinc-500'
          }`} />
          <h3 className="text-[11px] font-medium text-white/50 uppercase tracking-wider">
            {statusMapping[col]}
          </h3>
          {flash && (
            <span className="inline-flex items-center text-emerald-400 text-[11px] animate-pulse font-bold uppercase tracking-tight bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              Updated
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-medium text-zinc-500 bg-white/[0.03] px-2 py-1 rounded-lg border border-white/5 min-w-[28px] text-center">
            {items?.length ?? 0}
          </span>
        </div>
      </div>
      <SortableContext items={(items ?? []).map((t) => String(t.id))} strategy={verticalListSortingStrategy}>
        <div className="flex-1 space-y-3 min-h-[150px]">
          {(items ?? []).map((task) => (
            <div
              key={task.id}
              className={`rounded-xl transition-all duration-300 ${highlightedIds[String(task.id)] ? 'ring-2 ring-emerald-500 -[0_0_20px_rgba(16,185,129,0.2)]' : ''}`}
            >
              <KanbanCard
                task={task}
                users={users}
                user={user}
                projects={projects}
                columns={columns}
                onMove={onMove}
                onDelete={onDelete}
              />
            </div>
          ))}
          {isOver && (
            <div className="rounded-xl border-2 border-dashed border-indigo-500/30 bg-indigo-500/10 h-24 flex items-center justify-center animate-pulse">
              <span className="text-xs font-medium uppercase tracking-wider text-indigo-400">Drop here</span>
            </div>
          )}
          {(items ?? []).length === 0 && !isOver && (
            <div className="h-24 rounded-xl border-2 border-dashed border-white/5 flex items-center justify-center">
              <span className="text-xs text-zinc-600 italic">No tasks</span>
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}

export default function KanbanBoard({ tasks = [], users, user, projects, updateTask, deleteTask }: KanbanBoardProps) {
  const columns = useMemo(() => Object.keys(statusMapping) as Array<keyof typeof statusMapping>, []);

  const [grouped, setGrouped] = useState<Record<string, Task[]>>({});
  const [lastTasks, setLastTasks] = useState<Task[]>([]);

  if (tasks !== lastTasks) {
    const next: Record<string, Task[]> = {};
    (Object.keys(statusMapping) as Array<keyof typeof statusMapping>).forEach((c) => (next[c] = []));
    tasks.forEach((t) => next[t.status].push(t));
    setGrouped(next);
    setLastTasks(tasks);
  }

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
      if (grouped[col].some((t) => String(t.id) === idStr)) return col;
    }
    return null;
  };

  const moveTo = async (task: Task, status: Task["status"]) => {
    if (task.status === status) return;
    const fd = new FormData();
    fd.append("id", String(task.id));
    fd.append("status", status);
    // We can await this, but DND usually doesn't need the return value immediately
    await updateTask(fd);
  };

  const handleDelete = async (task: Task) => {
    const fd = new FormData();
    fd.append("id", String(task.id));
    await deleteTask(fd);
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

    const activeTask = grouped[fromCol].find((t) => String(t.id) === String(activeId));
    if (!activeTask) return;

    // Optimistic local move to end of target column
    setGrouped((prev) => {
      const next = { ...prev };
      next[fromCol] = prev[fromCol].filter((t) => String(t.id) !== String(activeId));
      next[toCol] = [...prev[toCol], { ...activeTask, status: toCol as Task["status"] }];
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
    await moveTo(activeTask, toCol as Task["status"]);
  };

  return (
    <DndContext sensors={sensors} onDragEnd={onDragEnd}>
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-4 min-w-max">
          {columns.map((col) => (
            <div key={col} className="w-[400px] flex-shrink-0">
              <Column
                col={col}
                items={grouped[col] ?? []}
                users={users}
                projects={projects}
                columns={columns}
                onMove={moveTo}
                onDelete={handleDelete}
                highlightedIds={highlightedIds}
                flash={flashCol === col}
              />
            </div>
          ))}
        </div>
      </div>
    </DndContext>
  );
}
