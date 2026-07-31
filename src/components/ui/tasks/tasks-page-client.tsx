"use client";

import {
  useState,
  useTransition,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  FiCheck,
  FiX,
  FiPlus,
  FiGrid,
  FiList,
  FiSearch,
  FiFilter,
  FiUser,
  FiClipboard,
  FiMaximize2,
  FiMinimize2,
} from "react-icons/fi";
import { EmptyState } from "@/components/ui/empty-state";
import {
  createTask,
  updateTask,
  deleteTask,
} from "@/app/(dashboard)/[orgSlug]/tasks/actions";
import { useTasks } from "@/hooks/use-tasks";
import { statusMapping, priorityMapping } from "@/types/task";
import type { Task } from "@/types/task";
import TaskCard from "./task-card";
import KanbanBoard from "./kanban-board";
import { TaskSummarySection } from "./task-summary";
import { UserLeaderboard } from "./user-leaderboard";
import { toast } from "@/lib/toast";
import { CustomDatePicker } from "@/components/ui/inputs/custom-date-picker";
import { format } from "date-fns";
import {
  createOptimisticTask,
  updateOptimisticTask,
} from "@/lib/optimistic-utils";
import { canManageTask } from "@/lib/task-auth";

type ViewMode = "table" | "kanban";

import { User } from "@/types/user";
import { Project } from "@/types/project";

import { Combobox } from "@/components/ui/combobox";

import { useUsers } from "@/hooks/use-users";
import { useProjects } from "@/hooks/use-projects";
import TasksLoading from "@/app/(dashboard)/[orgSlug]/tasks/loading";
import { useConfirm } from "@/providers/confirmation-provider";
import { emit, on } from "@/lib/event-bus";
import { trackAction } from "@/lib/recent-actions";

/** The snake_case task shape the API returns. */
interface ApiTaskShape {
  id: number;
  name: string;
  description: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  qa_required: boolean;
  review_required: boolean;
  depends_on_id: number | null;
  created_at: string;
  updated_at: string;
  project_id: number | null;
  user_id?: string;
  assignee_ids?: string[];
  task_assignees?: Array<{ task_id: number; user_id: string | number }>;
  assignees?: Array<{ id: string | number }>;
  time_logs?: any[];
  total_hours?: number;
}

/** Map an API task onto the camelCase shape the UI renders, hydrating assignees. */
function toTask(apiTask: ApiTaskShape, users: User[]): Task {
  const assigneeIds = (() => {
    if (apiTask.assignee_ids?.length) return apiTask.assignee_ids;
    if (apiTask.task_assignees?.length)
      return apiTask.task_assignees.map((a) => String(a.user_id));
    if (apiTask.assignees?.length)
      return apiTask.assignees.map((a) => String(a.id));
    return [];
  })();

  return {
    id: apiTask.id,
    name: apiTask.name,
    description: apiTask.description,
    status: apiTask.status as Task["status"],
    priority: apiTask.priority as Task["priority"],
    dueDate: apiTask.due_date,
    qa_required: apiTask.qa_required,
    review_required: apiTask.review_required,
    depends_on_id: apiTask.depends_on_id,
    createdAt: apiTask.created_at,
    updatedAt: apiTask.updated_at,
    projectId: apiTask.project_id,
    userId: apiTask.user_id,
    owner: users.find((u) => u.id === apiTask.user_id) || undefined,
    assignees: users
      .filter((u) => assigneeIds.some((id) => String(id) === String(u.id)))
      .map((user) => ({ user })),
    assigneeIds,
    timeLogs: apiTask.time_logs,
    totalHours: apiTask.total_hours,
  };
}

export default function TasksPageClient({
  allTasks: initialTasks = [],
  users: initialUsers = [],
  projects: initialProjects = [],
  projectId,
  currentUserId,
  currentUserRoles = [],
  orgRole,
}: {
  allTasks?: Task[];
  users?: User[];
  projects?: Project[];
  projectId?: number;
  currentUserId?: string;
  currentUserRoles?: string[];
  orgRole?: string;
}) {
  const confirm = useConfirm();
  const [tableTab, setTableTab] = useState<"active" | "done">("active");
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [filterMyTasks, setFilterMyTasks] = useState(false);

  const [isPending, startTransition] = useTransition();
  const [savingCreate, setSavingCreate] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);

  // Background data
  const { users } = useUsers(initialUsers);
  const { projects } = useProjects({ initialProjects });

  const currentUser = useMemo(() => {
    const u = users.find((u: User) => u.id === currentUserId);
    if (!u) return undefined;
    return { ...u, roles: currentUserRoles, orgRole };
  }, [users, currentUserId, currentUserRoles, orgRole]);

  const canManage = useMemo(
    () => canManageTask(currentUserRoles, orgRole),
    [currentUserRoles, orgRole],
  );

  // SWR Hook
  const {
    tasks: serverTasks,
    isLoading: tasksLoading,
    isLoadingMore,
    size,
    setSize,
    mutate,
    isReachingEnd,
  } = useTasks({
    searchQuery,
    filterPriority,
    filterStatus,
    projectId,
    limit: 50,
    users,
    initialTasks,
  });

  const isLoading = tasksLoading && serverTasks.length === 0;

  // Optimistic UI is driven by SWR's `optimisticData` in the mutation handlers
  // below, so the rendered list is simply whatever SWR currently holds.
  //
  // This deliberately does not use React's `useOptimistic`: that hook drops its
  // optimistic layer as soon as the enclosing transition settles, and it only
  // works when the base state comes back updated from a server re-render. Here
  // the base is an SWR cache, so the optimistic row vanished on settle and the
  // page looked unchanged until a full browser refresh.
  const optimisticTasks = serverTasks;

  // Realtime-created tasks from WebSocket (live updates)
  const [realtimeCreatedTasks, setRealtimeCreatedTasks] = useState<Task[]>([]);
  const [newTaskIds, setNewTaskIds] = useState<Set<number>>(new Set());

  /** Briefly highlight a freshly created row. */
  const flagAsNew = useCallback((id: number) => {
    setNewTaskIds((prev) => new Set(prev).add(id));
    setTimeout(() => {
      setNewTaskIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 7000);
  }, []);

  // Merge realtime tasks into the display list
  const mergedTasks = useMemo(() => {
    const map = new Map<number, Task>();
    realtimeCreatedTasks.forEach((t) => map.set(t.id, t));
    optimisticTasks.forEach((t) => map.set(t.id, t));
    return Array.from(map.values());
  }, [realtimeCreatedTasks, optimisticTasks]);

  // Filtered tasks for visual grouping and search
  const filteredTasks = useMemo(() => {
    const tasks = mergedTasks.filter((task) => {
      const matchesSearch =
        !searchQuery ||
        task.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (task.description?.toLowerCase().includes(searchQuery.toLowerCase()) ??
          false);

      const matchesPriority =
        !filterPriority || task.priority === filterPriority;
      const matchesStatus = !filterStatus || task.status === filterStatus;

      const matchesMyTasks =
        !filterMyTasks ||
        (currentUserId &&
          (task.userId == currentUserId ||
            task.owner?.id == currentUserId ||
            task.assigneeIds?.some(
              (id) => String(id) === String(currentUserId),
            ) ||
            task.assignees?.some(
              (a) => String(a.user.id) === String(currentUserId),
            )));

      return (
        matchesSearch && matchesPriority && matchesStatus && matchesMyTasks
      );
    });

    if (viewMode === "kanban") return tasks;

    // In table view, filter by active/done status based on tab
    const filtered = tasks.filter((task) => {
      if (tableTab === "done") return task.status === "DONE";
      return task.status !== "DONE";
    });

    // Sort by Status then Priority
    const statusOrder: Record<string, number> = {
      IN_PROGRESS: 1,
      REVIEW: 2,
      QA: 3,
      TODO: 4,
      DONE: 5,
    };

    const priorityOrder: Record<string, number> = {
      high: 1,
      medium: 2,
      low: 3,
    };
    const sorted = [...filtered].sort((a, b) => {
      const sA = statusOrder[a.status] || 99;
      const sB = statusOrder[b.status] || 99;
      if (sA !== sB) return sA - sB;

      const pA = priorityOrder[a.priority] || 99;
      const pB = priorityOrder[b.priority] || 99;
      if (pA !== pB) return pA - pB;

      // Finally by date (newest first)
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });

    // Final deduplication by ID to prevent duplicate keys during rapid updates or pagination overlaps
    const uniqueTasksMap = new Map();
    sorted.forEach((t) => uniqueTasksMap.set(t.id, t));
    return Array.from(uniqueTasksMap.values());
  }, [
    mergedTasks,
    searchQuery,
    filterPriority,
    filterStatus,
    filterMyTasks,
    currentUserId,
    viewMode,
    tableTab,
  ]);

  useEffect(() => {
    const unsub = on("task:created", (data: any) => {
      const taskId = data.id;
      if (!taskId) return;

      const newTask: Task = {
        id: taskId,
        name: data.name || "Untitled",
        description: data.description || null,
        status: data.status || "TODO",
        priority: data.priority || "medium",
        dueDate: data.due_date || null,
        qa_required: data.qa_required || false,
        review_required: data.review_required || false,
        depends_on_id: data.depends_on_id || null,
        createdAt: data.created_at || new Date().toISOString(),
        updatedAt: data.updated_at || new Date().toISOString(),
        projectId: data.project_id || null,
        userId: data.user_id || null,
        owner: data.owner
          ? {
              id: data.owner.id,
              email: data.owner.email,
              fullName: data.owner.full_name || null,
              avatarUrl: data.owner.avatar_url || null,
              roles: [],
            }
          : undefined,
        assignees: (data.assignee_users || []).map((u: any) => ({
          user: {
            id: u.id,
            email: u.email,
            fullName: u.full_name || null,
            avatarUrl: u.avatar_url || null,
            roles: [],
          },
        })),
        assigneeIds: data.assignee_ids || [],
        timeLogs: [],
        totalHours: 0,
      };

      setRealtimeCreatedTasks((prev) => [newTask, ...prev]);
      setNewTaskIds((prev) => {
        const next = new Set(prev);
        next.add(taskId);
        return next;
      });
      setTimeout(() => {
        setNewTaskIds((prev) => {
          const next = new Set(prev);
          next.delete(taskId);
          return next;
        });
        setRealtimeCreatedTasks((prev) => prev.filter((t) => t.id !== taskId));
      }, 7000);
    });
    return unsub;
  }, []);

  // New task state
  const [newAssignees, setNewAssignees] = useState<(string | number)[]>([]);
  const [newProject, setNewProject] = useState<string | number | null>(
    projectId || null,
  );
  const [newDueDate, setNewDueDate] = useState<Date | null>(null);
  const [newQARequired, setNewQARequired] = useState(false);
  const [newReviewRequired, setNewReviewRequired] = useState(false);
  const [newDependsOn, setNewDependsOn] = useState<number | null>(null);
  const newNameRef = useRef<HTMLInputElement | null>(null);
  // When true the create form is popped out into a modal instead of sitting in
  // the table row. Only one of the two renders at a time, so the shared
  // `create-task-form` id and its associated inputs stay unique.
  const [isCreateExpanded, setIsCreateExpanded] = useState(false);

  const handleCreateSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    // Inputs living outside the <form> are linked via form="create-task-form";
    // values held in React state are appended here.
    if (newAssignees.length > 0) {
      formData.append("assigneeIds", JSON.stringify(newAssignees));
    }
    if (newProject) {
      formData.append("projectId", newProject.toString());
    }
    if (newDueDate) {
      formData.append("dueDate", format(newDueDate, "yyyy-MM-dd"));
    }
    formData.append("qa_required", newQARequired.toString());
    formData.append("review_required", newReviewRequired.toString());
    if (newDependsOn) {
      formData.append("depends_on_id", newDependsOn.toString());
    }

    await handleCreate(formData);
    setNewDueDate(null);
    setNewAssignees([]);
    setIsCreateExpanded(false);
    if (newNameRef.current) newNameRef.current.value = "";
  };

  const handleCancelCreate = async () => {
    if (isDirty) {
      const confirmed = await confirm({
        title: "Unsaved Changes",
        message:
          "You have unsaved changes. Are you sure you want to discard them?",
        confirmText: "Discard Changes",
        type: "warning",
      });
      if (!confirmed) return;
      setIsDirty(false);
      setNewAssignees([]);
      setNewProject(null);
    }
    setIsCreateExpanded(false);
    setIsAddingTask(false);
  };

  // ── Shared create-task fields ──────────────────────────────────────────
  // Rendered either inside the table row or inside the pop-out modal.
  const inputClass =
    "w-full bg-foreground/[0.03] border border-card-border rounded-xl focus:outline-none focus:bg-foreground/[0.06] px-3 py-2 text-foreground placeholder:text-text-muted/50 text-xs transition-all";

  const createNameField = (
    <input
      ref={newNameRef}
      type="text"
      name="name"
      placeholder="Task name"
      className={inputClass}
      onChange={() => setIsDirty(true)}
      required
    />
  );

  const createDescriptionField = (
    <input
      type="text"
      name="description"
      placeholder="Description"
      form="create-task-form"
      className={inputClass.replace(
        "bg-foreground/[0.03]",
        "bg-foreground/[0.06]",
      )}
      onChange={() => setIsDirty(true)}
    />
  );

  // Taller multi-line variant used in the popped-out modal, where there is room
  // to write a real description. Same name/form association, so it submits
  // identically to the single-line row input.
  const createDescriptionFieldTall = (
    <textarea
      name="description"
      placeholder="Add more detail about this task..."
      form="create-task-form"
      rows={5}
      className={`${inputClass.replace("bg-foreground/[0.03]", "bg-foreground/[0.06]")} min-h-[120px] resize-y leading-relaxed`}
      onChange={() => setIsDirty(true)}
    />
  );

  const createDueDateField = (
    <CustomDatePicker
      value={newDueDate}
      onChange={(date) => {
        setNewDueDate(date);
        setIsDirty(true);
      }}
      placeholder="Due date"
      className="w-full"
    />
  );

  const createChecksField = (
    <div className="flex items-center gap-4">
      <label className="flex items-center gap-2 cursor-pointer group">
        <div className="relative flex items-center">
          <input
            type="checkbox"
            checked={newQARequired}
            onChange={(e) => {
              setNewQARequired(e.target.checked);
              setIsDirty(true);
            }}
            className="peer h-4 w-4 appearance-none rounded border border-card-border bg-foreground/[0.03] checked:bg-purple-500/40 checked:border-purple-400 transition-all"
          />
          <FiCheck className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 text-purple-400 opacity-0 peer-checked:opacity-100 transition-opacity" />
        </div>
        <span className="text-[11px] font-bold text-text-muted group-hover:text-purple-400 transition-colors uppercase tracking-wider">
          QA
        </span>
      </label>
      <label className="flex items-center gap-2 cursor-pointer group">
        <div className="relative flex items-center">
          <input
            type="checkbox"
            checked={newReviewRequired}
            onChange={(e) => {
              setNewReviewRequired(e.target.checked);
              setIsDirty(true);
            }}
            className="peer h-4 w-4 appearance-none rounded border border-card-border bg-foreground/[0.03] checked:bg-blue-500/40 checked:border-blue-400 transition-all"
          />
          <FiCheck className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 text-blue-400 opacity-0 peer-checked:opacity-100 transition-opacity" />
        </div>
        <span className="text-[11px] font-bold text-text-muted group-hover:text-blue-400 transition-colors uppercase tracking-wider">
          Review
        </span>
      </label>
    </div>
  );

  const createDependsOnField = (
    <Combobox
      options={optimisticTasks
        .filter((t) => t.id > 0)
        .map((t) => ({ value: t.id, label: t.name }))}
      value={newDependsOn || ""}
      onChange={(val) => {
        setNewDependsOn(val as number | null);
        setIsDirty(true);
      }}
      placeholder="Depends on..."
      className="w-full"
    />
  );

  const createPriorityField = (
    <select
      name="priority"
      form="create-task-form"
      className={`${inputClass} appearance-none cursor-pointer`}
      required
      onChange={() => setIsDirty(true)}
    >
      <option value="low" className="bg-card">
        Low
      </option>
      <option value="medium" className="bg-card">
        Medium
      </option>
      <option value="high" className="bg-card">
        High
      </option>
    </select>
  );

  const createAssigneesField = (
    <Combobox
      options={users.map((u: User) => ({
        value: u.id,
        label: u.fullName || u.email,
        subLabel: u.email,
      }))}
      value={newAssignees}
      onChange={(val) => {
        setNewAssignees(val as (string | number)[]);
        setIsDirty(true);
      }}
      multiple
      placeholder="Assign..."
      searchPlaceholder="Search users..."
      className="w-full"
    />
  );

  const createProjectField = (
    <Combobox
      options={projects.map((p) => ({
        value: p.id,
        label: p.name,
        subLabel: p.key || undefined,
      }))}
      value={newProject || ""}
      onChange={(val) => {
        setNewProject(val as string | number | null);
        setIsDirty(true);
      }}
      placeholder="Project..."
      searchPlaceholder="Search projects..."
      className="w-full"
    />
  );

  const createStatusField = (
    <select
      name="status"
      form="create-task-form"
      className={`${inputClass} appearance-none cursor-pointer`}
      required
    >
      {Object.entries(statusMapping).map(([key, value]) => (
        <option key={key} value={key} className="bg-card">
          {value}
        </option>
      ))}
    </select>
  );

  // Infinite Scroll Sentinel
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (viewMode === "kanban" || isReachingEnd || isLoadingMore) return;

    const currentSentinel = sentinelRef.current;
    if (!currentSentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setSize((prev) => prev + 1);
        }
      },
      { rootMargin: "200px" },
    ); // Load early

    observer.observe(currentSentinel);
    return () => {
      if (currentSentinel) observer.unobserve(currentSentinel);
    };
  }, [viewMode, isReachingEnd, isLoadingMore, setSize]);

  useEffect(() => {
    if (isAddingTask && newNameRef.current) {
      setTimeout(() => newNameRef.current?.focus(), 0);
    }
  }, [isAddingTask]);

  const handleCreate = async (formData: FormData) => {
    const tempTask = createOptimisticTask(formData, users);
    setErrorMsg(null);
    setSavingCreate(true);
    trackAction("task", "created");

    // Clear the composer immediately — the row is already on screen.
    setIsAddingTask(false);
    setIsDirty(false);
    setNewAssignees([]);
    setNewProject(projectId || null);
    setNewQARequired(false);
    setNewReviewRequired(false);
    setNewDependsOn(null);
    if (newNameRef.current) newNameRef.current.value = "";

    let created: Task | null = null;

    try {
      await mutate(
        async (current: Task[][] | undefined) => {
          const result = await createTask(formData);
          if (!result.success) throw new Error(result.error);

          const realTask = toTask(result.task, users);
          created = realTask;
          const pages = current?.length ? current : [[]];
          const firstPage = [
            realTask,
            ...pages[0].filter(
              (t) => t.id !== tempTask.id && t.id !== realTask.id,
            ),
          ];

          return [firstPage, ...pages.slice(1)];
        },
        {
          // Paint the new row before the request leaves the browser.
          optimisticData: (current: Task[][] | undefined) => {
            const pages = current?.length ? current : [[]];
            return [[tempTask, ...pages[0]], ...pages.slice(1)];
          },
          // The server hands back the created task, so trust it and skip
          // the extra round-trip that made the list feel stale.
          populateCache: true,
          revalidate: false,
          rollbackOnError: true,
        },
      );

      // Notify sibling views once the cache already holds the real row, so
      // their background revalidation can't race this write.
      if (created) {
        emit("task:created", created);
        flagAsNew((created as Task).id);
      }
      toast.success("Task created successfully");
    } catch (err) {
      console.error(err);
      setErrorMsg(
        err instanceof Error
          ? err.message
          : "Could not save the new task. Please try again.",
      );
    } finally {
      setSavingCreate(false);
    }
  };

  if (isLoading) {
    return <TasksLoading />;
  }

  const handleUpdate = async (formData: FormData) => {
    const id = Number(formData.get("id"));
    const existingTask = optimisticTasks.find((t) => t.id === id);
    setErrorMsg(null);
    trackAction("task", "updated");

    // Close the editor straight away — the row already shows the new values.
    setEditingTaskId(null);

    const pendingTask = existingTask
      ? updateOptimisticTask(existingTask, formData, users)
      : null;

    let updated: Task | null = null;

    try {
      await mutate(
        async (current: Task[][] | undefined) => {
          const result = await updateTask(formData);
          if (!result.success) throw new Error(result.error);

          const realTask = toTask(result.task, users);
          updated = realTask;
          if (!current) return current;
          return current.map((page) =>
            page.map((t) => (t.id === realTask.id ? realTask : t)),
          );
        },
        {
          optimisticData: (current: Task[][] | undefined) => {
            if (!current || !pendingTask) return current ?? [];
            return current.map((page) =>
              page.map((t) => (t.id === id ? pendingTask : t)),
            );
          },
          populateCache: true,
          revalidate: false,
          rollbackOnError: true,
        },
      );

      if (updated) emit("task:updated", updated);
      return { success: true, error: "" };
    } catch (err) {
      console.error(err);
      const msg =
        err instanceof Error
          ? err.message
          : "Could not update the task. Please try again.";
      setErrorMsg(msg);
      return { success: false, error: msg };
    }
  };

  const handleDelete = async (formData: FormData) => {
    const id = Number(formData.get("id"));
    setErrorMsg(null);
    trackAction("task", "deleted");

    try {
      await mutate(
        async (current: Task[][] | undefined) => {
          const result = await deleteTask(formData);
          if (!result.success) throw new Error(result.error);

          if (!current) return current;
          return current.map((page) => page.filter((t) => t.id !== id));
        },
        {
          optimisticData: (current: Task[][] | undefined) => {
            if (!current) return [];
            return current.map((page) => page.filter((t) => t.id !== id));
          },
          populateCache: true,
          revalidate: false,
          rollbackOnError: true,
        },
      );

      emit("task:deleted", { id });
      return { success: true, error: "" };
    } catch (err) {
      console.error(err);
      const msg =
        err instanceof Error
          ? err.message
          : "Could not delete the task. Please try again.";
      setErrorMsg(msg);
      return { success: false, error: msg };
    }
  };

  return (
    <div className="px-4 py-8 max-w-[1600px] mx-auto min-h-screen">
      <div className="hidden lg:block mb-10">
        <h1 className="text-3xl font-bold text-foreground mb-2 tracking-tight m-1.5">
          Tasks
        </h1>
        <p className="text-text-muted text-lg">
          Manage team work and track progress.
        </p>
      </div>

      <TaskSummarySection tasks={optimisticTasks} />

      <UserLeaderboard tasks={optimisticTasks} users={users} />

      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6 lg:mb-10">
        <div className="flex items-center gap-2 w-full overflow-x-auto pb-2 scrollbar-hide">
          <div className="relative flex-1 min-w-[140px] max-w-sm group">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-[var(--pastel-indigo)] transition-colors w-3.5 h-3.5" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-4 h-9 lg:h-11 bg-white dark:bg-white/[0.03] border border-card-border rounded-xl focus:outline-none focus:border-card-border text-foreground placeholder:text-text-muted/50 transition-all text-xs lg:text-sm"
            />
          </div>

          <div className="relative group flex-shrink-0">
            <div className="h-9 lg:h-11 w-9 lg:w-36 bg-white dark:bg-white/[0.03] border border-card-border rounded-xl flex items-center justify-center lg:justify-start lg:pl-3 relative overflow-hidden focus-within:border-card-border transition-all">
              <FiFilter className="text-text-muted group-hover:text-[var(--pastel-indigo)] transition-colors w-3.5 h-3.5 lg:absolute lg:left-3 lg:top-1/2 lg:-translate-y-1/2 lg:z-10" />
              <select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
                className="absolute inset-0 opacity-0 lg:opacity-100 lg:static lg:bg-transparent lg:border-none lg:pl-8 lg:pr-4 lg:w-full lg:h-full text-text-muted cursor-pointer lg:text-[11px] lg:font-bold lg:uppercase lg:tracking-wider appearance-none focus:outline-none"
              >
                <option value="" className="bg-card">
                  Priority
                </option>
                {Object.entries(priorityMapping).map(([key, value]) => (
                  <option key={key} value={key} className="bg-card">
                    {value}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="relative group flex-shrink-0">
            <div className="h-9 lg:h-11 w-9 lg:w-36 bg-white dark:bg-white/[0.03] border border-card-border rounded-xl flex items-center justify-center lg:justify-start lg:pl-3 relative overflow-hidden focus-within:border-card-border transition-all">
              <FiFilter className="text-text-muted group-hover:text-[var(--pastel-indigo)] transition-colors w-3.5 h-3.5 lg:absolute lg:left-3 lg:top-1/2 lg:-translate-y-1/2 lg:z-10" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="absolute inset-0 opacity-0 lg:opacity-100 lg:static lg:bg-transparent lg:border-none lg:pl-8 lg:pr-4 lg:w-full lg:h-full text-text-muted cursor-pointer lg:text-[11px] lg:font-bold lg:uppercase lg:tracking-wider appearance-none focus:outline-none"
              >
                <option value="" className="bg-card">
                  Status
                </option>
                {Object.entries(statusMapping).map(([key, value]) => (
                  <option key={key} value={key} className="bg-card">
                    {value}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* My Tasks Toggle */}
          <button
            onClick={() => setFilterMyTasks((f) => !f)}
            className={`flex items-center gap-2 h-9 lg:h-11 px-3 lg:px-4 rounded-xl border text-[11px] font-bold uppercase tracking-wider transition-all flex-shrink-0 ${
              filterMyTasks
                ? "bg-indigo-500/20 border-indigo-500/40 text-indigo-600 dark:text-indigo-300"
                : "bg-foreground/[0.03] border-card-border text-text-muted hover:text-foreground hover:border-card-border"
            }`}
          >
            <FiUser className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">My Tasks</span>
          </button>

          <div className="flex bg-foreground/[0.03] p-1 h-9 lg:h-11 rounded-xl border border-card-border flex-shrink-0 ml-auto">
            <button
              onClick={() => setViewMode("table")}
              className="relative flex items-center justify-center h-full px-2 rounded-lg text-text-muted hover:text-foreground transition-colors duration-200"
            >
              {viewMode === "table" && (
                <motion.div
                  layoutId="toggle-active"
                  transition={{ type: "spring", stiffness: 500, damping: 28 }}
                  className="absolute inset-0 bg-card rounded-lg border border-card-border"
                />
              )}
              <span className="relative z-10">
                <FiList className="w-5 h-5" />
              </span>
            </button>
            <button
              onClick={() => setViewMode("kanban")}
              className="relative flex items-center justify-center h-full px-2 rounded-lg text-text-muted hover:text-foreground transition-colors duration-200"
            >
              {viewMode === "kanban" && (
                <motion.div
                  layoutId="toggle-active"
                  transition={{ type: "spring", stiffness: 500, damping: 28 }}
                  className="absolute inset-0 bg-card rounded-lg border border-card-border"
                />
              )}
              <span className="relative z-10">
                <FiGrid className="w-5 h-5" />
              </span>
            </button>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-red-500 dark:text-red-400 text-sm flex items-center gap-2">
          <FiX className="h-4 w-4" />
          {errorMsg}
        </div>
      )}

      {viewMode === "kanban" ? (
        <KanbanBoard
          tasks={filteredTasks}
          users={users}
          user={currentUser}
          projects={projects}
          updateTask={handleUpdate}
          deleteTask={handleDelete}
          canManage={canManage}
        />
      ) : (
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between gap-4 overflow-x-auto pb-1 scrollbar-hide">
            <div className="flex items-center gap-1 bg-foreground/[0.03] p-1 w-fit rounded-xl border border-card-border flex-shrink-0">
              <button
                onClick={() => setTableTab("active")}
                className={`px-3 py-1.5 lg:px-4 lg:py-2 rounded-lg text-[11px] lg:text-xs font-bold uppercase tracking-wider transition-all ${tableTab === "active" ? "bg-emerald-500 text-zinc-950" : "text-text-muted hover:text-foreground"}`}
              >
                Active
              </button>
              <button
                onClick={() => setTableTab("done")}
                className={`px-3 py-1.5 lg:px-4 lg:py-2 rounded-lg text-[11px] lg:text-xs font-bold uppercase tracking-wider transition-all ${tableTab === "done" ? "bg-emerald-500 text-zinc-950" : "text-text-muted hover:text-foreground"}`}
              >
                Done
              </button>
            </div>
          </div>

          <div className="glass rounded-2xl overflow-hidden flex flex-col border border-card-border">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <caption className="sr-only">Tasks table</caption>
                <thead>
                  <tr className="border-b border-card-border bg-foreground/[0.03] text-left">
                    <th
                      scope="col"
                      className="px-6 py-4 text-[11px] font-bold text-text-muted uppercase tracking-wider whitespace-nowrap sticky left-0 z-20 bg-card/90 backdrop-blur-md border-r border-card-border"
                    >
                      Name
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-4 text-[11px] font-bold text-text-muted uppercase tracking-wider whitespace-nowrap hidden lg:table-cell"
                    >
                      Description
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-4 text-[11px] font-bold text-text-muted uppercase tracking-wider whitespace-nowrap hidden sm:table-cell"
                    >
                      Priority
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-4 text-[11px] font-bold text-text-muted uppercase tracking-wider whitespace-nowrap hidden lg:table-cell"
                    >
                      Assignee
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-4 text-[11px] font-bold text-text-muted uppercase tracking-wider whitespace-nowrap"
                    >
                      Due Date
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-4 text-[11px] font-bold text-text-muted uppercase tracking-wider whitespace-nowrap hidden md:table-cell"
                    >
                      Owner
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-4 text-[11px] font-bold text-text-muted uppercase tracking-wider whitespace-nowrap hidden md:table-cell"
                    >
                      Project
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-4 text-[11px] font-bold text-text-muted uppercase tracking-wider whitespace-nowrap"
                    >
                      Status
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-4 text-[11px] font-bold text-text-muted uppercase tracking-wider whitespace-nowrap"
                    >
                      Time Logged
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-4 text-[11px] font-bold text-text-muted uppercase tracking-wider whitespace-nowrap"
                    >
                      QA/Review
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-4 text-[11px] font-bold text-text-muted uppercase tracking-wider whitespace-nowrap"
                    >
                      Depends On
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-4 text-right text-[11px] font-bold text-text-muted uppercase tracking-wider whitespace-nowrap sticky right-0 z-20 bg-card/90 backdrop-blur-md border-l border-card-border"
                    >
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-card-border">
                  <AnimatePresence initial={false} mode="popLayout">
                    {filteredTasks.map((task, index) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        user={currentUser}
                        users={users}
                        projects={projects}
                        updateTask={handleUpdate}
                        deleteTask={handleDelete}
                        isEditing={editingTaskId === task.id}
                        isNew={newTaskIds.has(task.id)}
                        onEdit={() => setEditingTaskId(task.id)}
                        onCancel={() => setEditingTaskId(null)}
                        canManage={canManage}
                      />
                    ))}

                    {isLoadingMore && (
                      <tr className="bg-foreground/[0.01] animate-pulse">
                        <td className="px-6 py-4 sticky left-0 z-20 bg-card/90 backdrop-blur-md border-r border-card-border">
                          <div className="h-4 w-32 bg-foreground/10 rounded-lg"></div>
                        </td>
                        <td className="px-6 py-4 hidden lg:table-cell">
                          <div className="h-4 w-48 bg-foreground/5 rounded-lg"></div>
                        </td>
                        <td className="px-6 py-4 hidden sm:table-cell">
                          <div className="h-5 w-12 rounded-full bg-foreground/10"></div>
                        </td>
                        <td className="px-6 py-4 hidden lg:table-cell">
                          <div className="flex -space-x-2">
                            <div className="h-6 w-6 rounded-full bg-foreground/5"></div>
                            <div className="h-6 w-6 rounded-full bg-foreground/5"></div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="h-4 w-20 bg-foreground/5 rounded-lg"></div>
                        </td>
                        <td className="px-6 py-4 hidden md:table-cell">
                          <div className="h-8 w-8 rounded-full bg-foreground/10"></div>
                        </td>
                        <td className="px-6 py-4 hidden md:table-cell">
                          <div className="h-4 w-16 bg-foreground/5 rounded-lg"></div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="h-6 w-20 rounded-full bg-foreground/10"></div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="h-4 w-12 bg-foreground/5 rounded-lg"></div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="h-4 w-16 bg-foreground/5 rounded-lg"></div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="h-4 w-24 bg-foreground/5 rounded-lg"></div>
                        </td>
                        <td className="px-6 py-4 sticky right-0 z-20 bg-card/90 backdrop-blur-md border-l border-card-border">
                          <div className="h-8 w-8 ml-auto rounded-lg bg-foreground/5"></div>
                        </td>
                      </tr>
                    )}
                    {/* Fade only, deliberately no y/scale: a transform on the row creates
                                            a containing block that breaks `position: sticky` on its cells,
                                            which made the pinned Name and Actions columns scroll away with
                                            the middle of the table. */}
                    {isAddingTask && !isCreateExpanded && (
                      <motion.tr
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0, transition: { duration: 0.2 } }}
                        className="bg-foreground/[0.03]"
                      >
                        {/* Name and description match the widths these columns already
                                                    use when displaying a task, so there is room to type. */}
                        <td className="px-4 py-2 sticky left-0 z-10 bg-card/95 backdrop-blur-md border-r border-card-border min-w-[250px]">
                          <form
                            id="create-task-form"
                            onSubmit={handleCreateSubmit}
                          >
                            {createNameField}
                          </form>
                        </td>
                        <td className="px-4 py-2 bg-foreground/[0.03] min-w-[300px]">
                          {createDescriptionField}
                        </td>
                        <td className="px-4 py-2">{createPriorityField}</td>
                        <td className="px-4 py-2 min-w-[200px]">
                          {createAssigneesField}
                        </td>
                        <td className="px-4 py-2 bg-foreground/[0.03]">
                          {createDueDateField}
                        </td>
                        {/* Owner is stamped from the session on create, so there is
                                                    nothing to edit — but the cell has to exist or every column
                                                    after it sits under the wrong header. */}
                        <td className="px-4 py-2">
                          <span className="text-text-muted/30 text-[11px]">
                            —
                          </span>
                        </td>
                        <td className="px-4 py-2 min-w-[150px]">
                          {createProjectField}
                        </td>
                        <td className="px-4 py-2">{createStatusField}</td>
                        {/* Time Logged placeholder in create row */}
                        <td className="px-4 py-2">
                          <span className="text-text-muted/30 text-[11px]">
                            —
                          </span>
                        </td>
                        <td className="px-4 py-2 bg-foreground/[0.03]">
                          {createChecksField}
                        </td>
                        <td className="px-4 py-2 bg-foreground/[0.03]">
                          {createDependsOnField}
                        </td>
                        <td className="px-4 py-2 text-right text-xs font-medium sticky right-0 z-10 bg-card/95 backdrop-blur-md border-l border-card-border">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              type="button"
                              onClick={() => setIsCreateExpanded(true)}
                              title="Open in a bigger form"
                              aria-label="Open in a bigger form"
                              className="inline-flex items-center p-1.5 border border-card-border rounded-lg text-text-muted bg-foreground/[0.03] hover:bg-foreground/[0.06] hover:text-foreground focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-zinc-500 transition-all"
                            >
                              <FiMaximize2 className="h-3 w-3" />
                            </button>
                            <button
                              type="submit"
                              form="create-task-form"
                              disabled={isPending || savingCreate}
                              className="inline-flex items-center p-1.5 border border-transparent rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-600 dark:text-emerald-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 transition-all"
                            >
                              {savingCreate ? (
                                <div className="h-3.5 w-3.5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                              ) : (
                                <FiCheck className="h-3.5 w-3.5" />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={handleCancelCreate}
                              disabled={savingCreate}
                              className="inline-flex items-center p-1.5 border border-card-border rounded-lg text-text-muted bg-foreground/[0.03] hover:bg-foreground/[0.06] hover:text-foreground focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-zinc-500 disabled:opacity-50 transition-all"
                            >
                              <FiX className="h-3 w-3" />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    )}
                  </AnimatePresence>
                  {filteredTasks.length === 0 &&
                    !isLoadingMore &&
                    !isAddingTask && (
                      <tr>
                        <td colSpan={12} className="px-6 py-4 text-center">
                          <EmptyState
                            compact
                            icon={FiClipboard}
                            title="No tasks found"
                            description="Create a task to get started or adjust your filters."
                          />
                        </td>
                      </tr>
                    )}
                </tbody>
              </table>
            </div>

            {/* Infinite Scroll Sentinel */}
            {!isReachingEnd && <div ref={sentinelRef} className="h-4 w-full" />}

            <div className="p-4 border-t border-card-border bg-foreground/[0.01] flex items-center justify-between">
              <div className="flex items-center">
                {!isAddingTask && (
                  <button
                    onClick={async () => {
                      if (isAddingTask && isDirty) {
                        const confirmed = await confirm({
                          title: "Unsaved Changes",
                          message:
                            "You have unsaved changes. Are you sure you want to close the form?",
                          confirmText: "Close Anyway",
                          type: "warning",
                        });

                        if (confirmed) {
                          setIsAddingTask(!isAddingTask);
                          setIsDirty(false);
                        }
                      } else {
                        setIsAddingTask(!isAddingTask);
                      }
                    }}
                    className="flex items-center gap-2 p-1.5 rounded-xl bg-foreground/[0.03] hover:bg-foreground/[0.06] border border-card-border hover:border-card-border text-sm text-text-muted hover:text-foreground transition-all duration-200 group"
                  >
                    <div className="p-1 rounded-lg bg-foreground/[0.03] group-hover:bg-foreground/[0.06] transition-colors">
                      <FiPlus className="w-4 h-4" />
                    </div>
                    <span>New Task</span>
                  </button>
                )}
              </div>

              {isLoadingMore && (
                <div className="flex items-center gap-4 bg-emerald-500/10 border border-emerald-500/20 py-2 px-4 rounded-2xl animate-in fade-in slide-in-from-bottom-2 duration-500 backdrop-blur-xl shadow-xl shadow-emerald-500/5">
                  <div className="flex flex-col items-end">
                    <div className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest leading-none mb-1">
                      Expanding
                    </div>
                    <div className="h-1 w-12 bg-emerald-500/20 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-emerald-500"
                        initial={{ x: "-100%" }}
                        animate={{ x: "100%" }}
                        transition={{
                          repeat: Infinity,
                          duration: 1,
                          ease: "linear",
                        }}
                      />
                    </div>
                  </div>
                  <div className="relative h-6 w-6 flex items-center justify-center">
                    <div className="absolute inset-0 border-2 border-emerald-500/10 rounded-full"></div>
                    <div className="absolute inset-0 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Popped-out create form. Renders the same fields as the table row
                (and the same `create-task-form`), just with more room. Only one
                of the two is mounted at a time. */}
      <AnimatePresence>
        {isAddingTask && isCreateExpanded && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 bg-background/80 backdrop-blur-md"
              onClick={() => setIsCreateExpanded(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ type: "spring", damping: 26, stiffness: 320 }}
              className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto bg-card border border-card-border rounded-2xl shadow-2xl"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-card-border sticky top-0 bg-card z-10">
                <h2 className="text-base font-bold text-foreground tracking-tight">
                  New task
                </h2>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setIsCreateExpanded(false)}
                    title="Back to the table row"
                    aria-label="Back to the table row"
                    className="p-2 rounded-xl text-text-muted hover:text-foreground hover:bg-foreground/[0.06] transition-all"
                  >
                    <FiMinimize2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelCreate}
                    title="Cancel"
                    aria-label="Cancel"
                    className="p-2 rounded-xl text-text-muted hover:text-foreground hover:bg-foreground/[0.06] transition-all"
                  >
                    <FiX className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="px-6 py-5 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider">
                    Task name
                  </label>
                  <form id="create-task-form" onSubmit={handleCreateSubmit}>
                    {createNameField}
                  </form>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider">
                    Description
                  </label>
                  {createDescriptionFieldTall}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider">
                      Due date
                    </label>
                    {createDueDateField}
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider">
                      Priority
                    </label>
                    {createPriorityField}
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider">
                      Assignees
                    </label>
                    {createAssigneesField}
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider">
                      Project
                    </label>
                    {createProjectField}
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider">
                      Status
                    </label>
                    {createStatusField}
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider">
                      Depends on
                    </label>
                    {createDependsOnField}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider">
                    Checks
                  </label>
                  {createChecksField}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-card-border sticky bottom-0 bg-card">
                <button
                  type="button"
                  onClick={handleCancelCreate}
                  disabled={savingCreate}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-text-muted hover:text-foreground transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="create-task-form"
                  disabled={isPending || savingCreate}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-sm font-bold transition-all disabled:opacity-50"
                >
                  {savingCreate ? (
                    <div className="h-3.5 w-3.5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <FiCheck className="h-4 w-4" />
                  )}
                  Create task
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
