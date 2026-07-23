'use client';

import { useState, useTransition, useRef, useEffect, useCallback, useOptimistic, useMemo } from 'react';
import { AnimatePresence, motion } from "framer-motion";
import { FiCheck, FiX, FiPlus, FiGrid, FiList, FiSearch, FiFilter, FiUser, FiClipboard } from 'react-icons/fi';
import { EmptyState } from '@/components/ui/empty-state';
import { createTask, updateTask, deleteTask } from '@/app/(dashboard)/[orgSlug]/tasks/actions';
import { useTasks } from '@/hooks/use-tasks';
import { statusMapping, priorityMapping } from "@/types/task";
import type { Task } from "@/types/task";
import TaskCard from './task-card';
import KanbanBoard from './kanban-board';
import { TaskSummarySection } from './task-summary';
import { UserLeaderboard } from './user-leaderboard';
import { toast } from '@/lib/toast';
import { CustomDatePicker } from '@/components/ui/inputs/custom-date-picker';
import { format } from 'date-fns';
import { createOptimisticTask, updateOptimisticTask } from '@/lib/optimistic-utils';

type ViewMode = 'table' | 'kanban';

import { User } from "@/types/user";
import { Project } from "@/types/project";

import { Combobox } from "@/components/ui/combobox";

import { useUsers } from '@/hooks/use-users';
import { useProjects } from '@/hooks/use-projects';
import TasksLoading from '@/app/(dashboard)/[orgSlug]/tasks/loading';
import { useConfirm } from '@/providers/confirmation-provider';
import { on } from '@/lib/event-bus';
import { trackAction } from '@/lib/recent-actions';

export default function TasksPageClient({ 
    allTasks: initialTasks = [], 
    users: initialUsers = [], 
    projects: initialProjects = [], 
    projectId, 
    currentUserId 
}: { 
    allTasks?: Task[], 
    users?: User[], 
    projects?: Project[], 
    projectId?: number, 
    currentUserId?: string 
}) {
    const confirm = useConfirm();
    const [tableTab, setTableTab] = useState<'active' | 'done'>('active');
    const [viewMode, setViewMode] = useState<ViewMode>('table');
    const [isAddingTask, setIsAddingTask] = useState(false);
    const [filterMyTasks, setFilterMyTasks] = useState(false);

    const [isPending, startTransition] = useTransition();
    const [savingCreate, setSavingCreate] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [isDirty, setIsDirty] = useState(false);

    const [searchQuery, setSearchQuery] = useState('');
    const [filterPriority, setFilterPriority] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
    
    // Background data
    const { users } = useUsers(initialUsers);
    const { projects } = useProjects({ initialProjects });

    // SWR Hook
    const { 
        tasks: serverTasks, 
        isLoading: tasksLoading, 
        isLoadingMore, 
        size, 
        setSize, 
        mutate,
        isReachingEnd 
    } = useTasks({
        searchQuery,
        filterPriority,
        filterStatus,
        projectId,
        limit: 50,
        users,
        initialTasks
    });

    const isLoading = tasksLoading && serverTasks.length === 0;

    // Optimistic UI
    const [optimisticTasks, addOptimisticTask] = useOptimistic(
        serverTasks,
        (state: Task[], action: { type: 'add' | 'update' | 'delete' | 'replace', task: Task, tempId?: number }) => {
            switch (action.type) {
                case 'add':
                    return [...state, action.task];
                case 'update':
                    return state.map(t => t.id === action.task.id ? action.task : t);
                case 'delete':
                    return state.filter(t => t.id !== action.task.id);
                case 'replace':
                    return state.map(t => t.id === action.tempId ? action.task : t);
                default:
                    return state;
            }
        }
    );

    // Realtime-created tasks from WebSocket (live updates)
    const [realtimeCreatedTasks, setRealtimeCreatedTasks] = useState<Task[]>([]);
    const [newTaskIds, setNewTaskIds] = useState<Set<number>>(new Set());

    // Merge realtime tasks into the display list
    const mergedTasks = useMemo(() => {
      const map = new Map<number, Task>();
      realtimeCreatedTasks.forEach(t => map.set(t.id, t));
      optimisticTasks.forEach(t => map.set(t.id, t));
      return Array.from(map.values());
    }, [realtimeCreatedTasks, optimisticTasks]);

    // Filtered tasks for visual grouping and search
    const filteredTasks = useMemo(() => {
        const tasks = mergedTasks.filter(task => {
            const matchesSearch = !searchQuery || 
                task.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (task.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
            
            const matchesPriority = !filterPriority || task.priority === filterPriority;
            const matchesStatus = !filterStatus || task.status === filterStatus;
            
            const matchesMyTasks = !filterMyTasks || (
                currentUserId && (
                    task.userId == currentUserId || 
                    task.owner?.id == currentUserId ||
                    task.assigneeIds?.some(id => String(id) === String(currentUserId)) ||
                    task.assignees?.some(a => String(a.user.id) === String(currentUserId))
                )
            );

            return matchesSearch && matchesPriority && matchesStatus && matchesMyTasks;
        });

        if (viewMode === 'kanban') return tasks;

        // In table view, filter by active/done status based on tab
        const filtered = tasks.filter(task => {
            if (tableTab === 'done') return task.status === 'DONE';
            return task.status !== 'DONE';
        });

        // Sort by Status then Priority
        const statusOrder: Record<string, number> = {
            'IN_PROGRESS': 1,
            'REVIEW': 2,
            'QA': 3,
            'TODO': 4,
            'DONE': 5
        };

        const priorityOrder: Record<string, number> = {
            'high': 1,
            'medium': 2,
            'low': 3
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
        sorted.forEach(t => uniqueTasksMap.set(t.id, t));
        return Array.from(uniqueTasksMap.values());
    }, [mergedTasks, searchQuery, filterPriority, filterStatus, filterMyTasks, currentUserId, viewMode, tableTab]);

    useEffect(() => {
      const unsub = on('task:created', (data: any) => {
        const taskId = data.id;
        if (!taskId) return;

        const newTask: Task = {
          id: taskId,
          name: data.name || 'Untitled',
          description: data.description || null,
          status: data.status || 'TODO',
          priority: data.priority || 'medium',
          dueDate: data.due_date || null,
          qa_required: data.qa_required || false,
          review_required: data.review_required || false,
          depends_on_id: data.depends_on_id || null,
          createdAt: data.created_at || new Date().toISOString(),
          updatedAt: data.updated_at || new Date().toISOString(),
          projectId: data.project_id || null,
          userId: data.user_id || null,
          owner: data.owner ? {
            id: data.owner.id,
            email: data.owner.email,
            fullName: data.owner.full_name || null,
            avatarUrl: data.owner.avatar_url || null,
            roles: [],
          } : undefined,
          assignees: (data.assignee_users || []).map((u: any) => ({
            user: {
              id: u.id,
              email: u.email,
              fullName: u.full_name || null,
              avatarUrl: u.avatar_url || null,
              roles: [],
            }
          })),
          assigneeIds: data.assignee_ids || [],
          timeLogs: [],
          totalHours: 0,
        };

        setRealtimeCreatedTasks(prev => [newTask, ...prev]);
        setNewTaskIds(prev => {
          const next = new Set(prev);
          next.add(taskId);
          return next;
        });
        setTimeout(() => {
          setNewTaskIds(prev => {
            const next = new Set(prev);
            next.delete(taskId);
            return next;
          });
          setRealtimeCreatedTasks(prev => prev.filter(t => t.id !== taskId));
        }, 7000);
      });
      return unsub;
    }, []);

    // New task state
    const [newAssignees, setNewAssignees] = useState<(string | number)[]>([]);
    const [newProject, setNewProject] = useState<string | number | null>(projectId || null);
    const [newDueDate, setNewDueDate] = useState<Date | null>(null);
    const [newQARequired, setNewQARequired] = useState(false);
    const [newReviewRequired, setNewReviewRequired] = useState(false);
    const [newDependsOn, setNewDependsOn] = useState<number | null>(null);
    const newNameRef = useRef<HTMLInputElement | null>(null);

    // Infinite Scroll Sentinel
    const sentinelRef = useRef<HTMLDivElement | null>(null);
    useEffect(() => {
        if (viewMode === 'kanban' || isReachingEnd || isLoadingMore) return;
        
        const currentSentinel = sentinelRef.current;
        if (!currentSentinel) return;

        const observer = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting) {
                setSize(prev => prev + 1);
            }
        }, { rootMargin: '200px' }); // Load early

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
        const newTask = createOptimisticTask(formData, users);
        startTransition(() => {
            addOptimisticTask({ type: 'add', task: newTask });
        });

        trackAction('task', 'created');

        setErrorMsg(null);
        setSavingCreate(true);
        try {
            const result = await createTask(formData);
            if (!result.success) {
                setErrorMsg(result.error);
                startTransition(() => {
                    addOptimisticTask({ type: 'delete', task: newTask });
                });
            } else if (result.task) {
                const apiTask = result.task;
                const owner = users.find((u: any) => u.id === apiTask.user_id);
                const realTask: Task = {
                    id: apiTask.id,
                    name: apiTask.name,
                    description: apiTask.description,
                    status: apiTask.status as Task['status'],
                    priority: apiTask.priority as Task['priority'],
                    dueDate: apiTask.due_date,
                    qa_required: apiTask.qa_required,
                    review_required: apiTask.review_required,
                    depends_on_id: apiTask.depends_on_id,
                    createdAt: apiTask.created_at,
                    updatedAt: apiTask.updated_at,
                    projectId: apiTask.project_id,
                    userId: apiTask.user_id,
                    owner: owner || undefined,
                    assignees: [],
                    assigneeIds: (() => {
                        if (apiTask.assignee_ids?.length) return apiTask.assignee_ids;
                        if (apiTask.task_assignees?.length) return apiTask.task_assignees.map(a => String(a.user_id));
                        if (apiTask.assignees?.length) return apiTask.assignees.map(a => String(a.id));
                        return [];
                    })(),
                    timeLogs: apiTask.time_logs,
                    totalHours: apiTask.total_hours,
                };

                startTransition(() => {
                    addOptimisticTask({ type: 'replace', tempId: -1, task: realTask });
                });

                mutate((current: Task[][] | undefined) => {
                    if (!current) return current;
                    return current.map(page =>
                        page.map(t => t.id === -1 ? realTask : t)
                    );
                }, { revalidate: false });

                setNewTaskIds(prev => {
                    const next = new Set(prev);
                    next.add(apiTask.id);
                    return next;
                });
                setTimeout(() => {
                    setNewTaskIds(prev => {
                        const next = new Set(prev);
                        next.delete(apiTask.id);
                        return next;
                    });
                }, 7000);

                toast.success('Task created successfully');
                setIsAddingTask(false);
                setIsDirty(false);
                setNewAssignees([]);
                setNewProject(projectId || null);
                setNewQARequired(false);
                setNewReviewRequired(false);
                setNewDependsOn(null);
                if (newNameRef.current) newNameRef.current.value = '';
            }
        } catch (err) {
            console.error(err);
            startTransition(() => {
                addOptimisticTask({ type: 'delete', task: newTask });
            });
            setErrorMsg('Could not save the new task. Please try again.');
        } finally {
            setSavingCreate(false);
        }
    };

    if (isLoading) {
        return <TasksLoading />;
    }

    const handleUpdate = async (formData: FormData) => {
        // Optimistic Update
        const id = Number(formData.get('id'));
        const existingTask = optimisticTasks.find(t => t.id === id);
        if (existingTask) {
             const updatedTask = updateOptimisticTask(existingTask, formData, users);
             startTransition(() => {
                 addOptimisticTask({ type: 'update', task: updatedTask });
             });
        }

        setErrorMsg(null);
        trackAction('task', 'updated');
        try {
            const result = await updateTask(formData);
            if (!result.success) {
                setErrorMsg(result.error);
                return { success: false, error: result.error };
            } else {
                setEditingTaskId(null);
            }
            mutate();
            return { success: true };
        } catch (err) {
            console.error(err);
            const msg = 'Could not update the task. Please try again.';
            setErrorMsg(msg);
            return { success: false, error: msg };
        }
    };

    const handleDelete = async (formData: FormData) => {
        const id = Number(formData.get('id'));
        const task = optimisticTasks.find(t => t.id === id);
        if (task) {
            startTransition(() => {
                addOptimisticTask({ type: 'delete', task });
            });
        }
        
        setErrorMsg(null);
        trackAction('task', 'deleted');
        try {
            const result = await deleteTask(formData);
            if (!result.success) {
                setErrorMsg(result.error);
                return { success: false, error: result.error };
            }
            mutate();
            return { success: true };
        } catch (err) {
            console.error(err);
            const msg = 'Could not delete the task. Please try again.';
            setErrorMsg(msg);
            return { success: false, error: msg };
        }
    };

    return (
        <div className="px-4 py-8 max-w-[1600px] mx-auto min-h-screen">
            <div className="hidden lg:block mb-10">
                <h1 className="text-3xl font-bold text-foreground mb-2 tracking-tight">Tasks</h1>
                <p className="text-text-muted text-lg">Manage team work and track progress.</p>
            </div>

            <TaskSummarySection tasks={optimisticTasks} />
            
            <UserLeaderboard tasks={optimisticTasks} users={users} />

            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6 lg:mb-10">
                <div className="flex items-center gap-2 w-full overflow-x-auto pb-2 scrollbar-hide">
                    <div className="relative flex-1 min-w-[140px] max-w-sm group">
                        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-[var(--pastel-indigo)] transition-colors w-3.5 h-3.5"/>
                        <input
                            type="text"
                            placeholder="Search..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-8 pr-4 h-9 lg:h-11 bg-foreground/[0.03] border border-card-border rounded-xl focus:outline-none focus:bg-foreground/[0.06] focus:border-card-border text-foreground placeholder:text-text-muted/50 transition-all text-xs lg:text-sm"
                        />
                    </div>
                    
                    <div className="relative group flex-shrink-0">
                         <div className="h-9 lg:h-11 w-9 lg:w-36 bg-foreground/[0.03] border border-card-border rounded-xl flex items-center justify-center lg:justify-start lg:pl-3 relative overflow-hidden focus-within:outline-none focus-within:bg-foreground/[0.06] focus-within:border-card-border transition-all">
                            <FiFilter className="text-text-muted group-hover:text-[var(--pastel-indigo)] transition-colors w-3.5 h-3.5 lg:absolute lg:left-3 lg:top-1/2 lg:-translate-y-1/2 lg:z-10" />
                            <select
                                value={filterPriority}
                                onChange={(e) => setFilterPriority(e.target.value)}
                                className="absolute inset-0 opacity-0 lg:opacity-100 lg:static lg:bg-transparent lg:border-none lg:pl-8 lg:pr-4 lg:w-full lg:h-full text-text-muted cursor-pointer lg:text-[11px] lg:font-bold lg:uppercase lg:tracking-wider appearance-none focus:outline-none"
                            >
                                <option value="" className="bg-card">Priority</option>
                                {Object.entries(priorityMapping).map(([key, value]) => <option key={key} value={key} className="bg-card">{value}</option>)}
                            </select>
                         </div>
                    </div>

                     <div className="relative group flex-shrink-0">
                         <div className="h-9 lg:h-11 w-9 lg:w-36 bg-foreground/[0.03] border border-card-border rounded-xl flex items-center justify-center lg:justify-start lg:pl-3 relative overflow-hidden focus-within:outline-none focus-within:bg-foreground/[0.06] focus-within:border-card-border transition-all">
                            <FiFilter className="text-text-muted group-hover:text-[var(--pastel-indigo)] transition-colors w-3.5 h-3.5 lg:absolute lg:left-3 lg:top-1/2 lg:-translate-y-1/2 lg:z-10" />
                            <select
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value)}
                                className="absolute inset-0 opacity-0 lg:opacity-100 lg:static lg:bg-transparent lg:border-none lg:pl-8 lg:pr-4 lg:w-full lg:h-full text-text-muted cursor-pointer lg:text-[11px] lg:font-bold lg:uppercase lg:tracking-wider appearance-none focus:outline-none"
                            >
                                <option value="" className="bg-card">Status</option>
                                {Object.entries(statusMapping).map(([key, value]) => <option key={key} value={key} className="bg-card">{value}</option>)}
                            </select>
                        </div>
                     </div>

                     {/* My Tasks Toggle */}
                      <button
                        onClick={() => setFilterMyTasks(f => !f)}
                        className={`flex items-center gap-2 h-9 lg:h-11 px-3 lg:px-4 rounded-xl border text-[11px] font-bold uppercase tracking-wider transition-all flex-shrink-0 ${
                            filterMyTasks
                                ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-600 dark:text-indigo-300'
                                : 'bg-foreground/[0.03] border-card-border text-text-muted hover:text-foreground hover:border-card-border'
                        }`}
                      >
                        <FiUser className="w-3.5 h-3.5" />
                        <span className="hidden lg:inline">My Tasks</span>
                     </button>

                    <div className="flex items-center space-x-1 bg-foreground/[0.03] p-1 h-9 lg:h-11 rounded-xl border border-card-border flex-shrink-0 ml-auto">
                        <button
                            onClick={() => setViewMode('table')}
                            className={`p-1.5 lg:p-2 rounded-lg transition-all ${viewMode === 'table' ? 'bg-card text-foreground border border-card-border' : 'text-text-muted hover:text-foreground'}`}
                        >
                            <FiList className="w-4 h-4 lg:w-5 lg:h-5"/>
                        </button>
                        <button
                            onClick={() => setViewMode('kanban')}
                            className={`p-1.5 lg:p-2 rounded-lg transition-all ${viewMode === 'kanban' ? 'bg-card text-foreground border border-card-border' : 'text-text-muted hover:text-foreground'}`}
                        >
                            <FiGrid className="w-4 h-4 lg:w-5 lg:h-5"/>
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

            {viewMode === 'kanban' ? (
                <KanbanBoard
                    tasks={filteredTasks}
                    users={users}
                    user={users.find((u: User) => u.id === currentUserId)}
                    projects={projects}
                    updateTask={handleUpdate}
                    deleteTask={handleDelete}
                />
            ) : (
                <div className="flex flex-col gap-6">
                    <div className="flex items-center justify-between gap-4 overflow-x-auto pb-1 scrollbar-hide">
                         <div className="flex items-center gap-1 bg-foreground/[0.03] p-1 w-fit rounded-xl border border-card-border flex-shrink-0">
                            <button
                                onClick={() => setTableTab('active')}
                                className={`px-3 py-1.5 lg:px-4 lg:py-2 rounded-lg text-[11px] lg:text-xs font-bold uppercase tracking-wider transition-all ${tableTab === 'active' ? 'bg-emerald-500 text-zinc-950' : 'text-text-muted hover:text-foreground'}`}
                            >
                                Active
                            </button>
                        <button
                            onClick={() => setTableTab('done')}
                            className={`px-3 py-1.5 lg:px-4 lg:py-2 rounded-lg text-[11px] lg:text-xs font-bold uppercase tracking-wider transition-all ${tableTab === 'done' ? 'bg-emerald-500 text-zinc-950' : 'text-text-muted hover:text-foreground'}`}
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
                                        <th scope="col" className="px-6 py-4 text-[11px] font-bold text-text-muted uppercase tracking-wider whitespace-nowrap sticky left-0 z-20 bg-card/90 backdrop-blur-md border-r border-card-border">Name</th>
                                        <th scope="col" className="px-6 py-4 text-[11px] font-bold text-text-muted uppercase tracking-wider whitespace-nowrap hidden lg:table-cell">Description</th>
                                        <th scope="col" className="px-6 py-4 text-[11px] font-bold text-text-muted uppercase tracking-wider whitespace-nowrap">Due Date</th>
                                        <th scope="col" className="px-6 py-4 text-[11px] font-bold text-text-muted uppercase tracking-wider whitespace-nowrap">QA/Review</th>
                                        <th scope="col" className="px-6 py-4 text-[11px] font-bold text-text-muted uppercase tracking-wider whitespace-nowrap">Depends On</th>
                                        <th scope="col" className="px-6 py-4 text-[11px] font-bold text-text-muted uppercase tracking-wider whitespace-nowrap hidden md:table-cell">Owner</th>
                                        <th scope="col" className="px-6 py-4 text-[11px] font-bold text-text-muted uppercase tracking-wider whitespace-nowrap hidden sm:table-cell">Priority</th>
                                        <th scope="col" className="px-6 py-4 text-[11px] font-bold text-text-muted uppercase tracking-wider whitespace-nowrap hidden lg:table-cell">Assignee</th>
                                        <th scope="col" className="px-6 py-4 text-[11px] font-bold text-text-muted uppercase tracking-wider whitespace-nowrap hidden md:table-cell">Project</th>
                                        <th scope="col" className="px-6 py-4 text-[11px] font-bold text-text-muted uppercase tracking-wider whitespace-nowrap">Status</th>
                                        <th scope="col" className="px-6 py-4 text-[11px] font-bold text-text-muted uppercase tracking-wider whitespace-nowrap">Time Logged</th>
                                        <th scope="col" className="px-6 py-4 text-right text-[11px] font-bold text-text-muted uppercase tracking-wider whitespace-nowrap sticky right-0 z-20 bg-card/90 backdrop-blur-md border-l border-card-border">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-card-border">
                                    <AnimatePresence initial={false} mode="popLayout">
                                        {filteredTasks.map((task, index) => (
                                            <TaskCard
                                                key={task.id}
                                                task={task}
                                                user={users.find((u: User) => u.id === currentUserId)}
                                                users={users}
                                                projects={projects}
                                                updateTask={handleUpdate}
                                                deleteTask={handleDelete}
                                                isEditing={editingTaskId === task.id}
                                                isNew={newTaskIds.has(task.id)}
                                                onEdit={() => setEditingTaskId(task.id)}
                                                onCancel={() => setEditingTaskId(null)}
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
                                                <td className="px-6 py-4">
                                                    <div className="h-4 w-20 bg-foreground/5 rounded-lg"></div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="h-4 w-16 bg-foreground/5 rounded-lg"></div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="h-4 w-24 bg-foreground/5 rounded-lg"></div>
                                                </td>
                                                <td className="px-6 py-4 hidden md:table-cell">
                                                    <div className="h-8 w-8 rounded-full bg-foreground/10"></div>
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
                                                <td className="px-6 py-4 hidden md:table-cell">
                                                    <div className="h-4 w-16 bg-foreground/5 rounded-lg"></div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="h-6 w-20 rounded-full bg-foreground/10"></div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="h-4 w-12 bg-foreground/5 rounded-lg"></div>
                                                </td>
                                                <td className="px-6 py-4 sticky right-0 z-20 bg-card/90 backdrop-blur-md border-l border-card-border">
                                                    <div className="h-8 w-8 ml-auto rounded-lg bg-foreground/5"></div>
                                                </td>
                                            </tr>
                                        )}
                                        {isAddingTask && (
                                            <motion.tr 
                                                initial={{ opacity: 0, y: -20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                                                className="bg-foreground/[0.03]"
                                            >
                                                <td className="px-4 py-2 sticky left-0 z-10 bg-card/90 backdrop-blur-md border-r border-card-border">
                                                    <form id="create-task-form" onSubmit={async (e) => {
                                                        e.preventDefault();
                                                        const formData = new FormData(e.currentTarget);
                                                        
                                                        // Manually append state values to FormData since inputs are outside form or detached
                                                        if (newAssignees.length > 0) {
                                                            formData.append('assigneeIds', JSON.stringify(newAssignees));
                                                        }
                                                        if (newProject) {
                                                            formData.append('projectId', newProject.toString());
                                                        }
                                                        if (newDueDate) {
                                                            formData.append('dueDate', format(newDueDate, 'yyyy-MM-dd'));
                                                        }
                                                        formData.append('qa_required', newQARequired.toString());
                                                        formData.append('review_required', newReviewRequired.toString());
                                                        if (newDependsOn) {
                                                            formData.append('depends_on_id', newDependsOn.toString());
                                                        }

                                                        await handleCreate(formData);
                                                        setNewDueDate(null);
                                                        setNewAssignees([]);
                                                        // Reset other states if needed or rely on form reset
                                                        if (newNameRef.current) newNameRef.current.value = "";
                                                    }}>
                                                        <input
                                                            ref={newNameRef}
                                                            type="text"
                                                            name="name"
                                                            placeholder="Task name"
                                                            className="w-full bg-foreground/[0.03] border border-card-border rounded-xl focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 px-3 py-2 text-foreground placeholder:text-text-muted/50 text-xs transition-all"
                                                            onChange={() => setIsDirty(true)}
                                                            required
                                                        />
                                                    </form>
                                                </td>
                                                <td className="px-4 py-2 bg-foreground/[0.03]">
                                                    <input
                                                        type="text"
                                                        name="description"
                                                        placeholder="Description"
                                                        form="create-task-form"
                                                        className="w-full bg-foreground/[0.06] border border-card-border rounded-xl focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 px-3 py-2 text-foreground placeholder:text-text-muted/50 text-xs transition-all"
                                                        onChange={() => setIsDirty(true)}
                                                    />
                                                </td>
                                                <td className="px-4 py-2 bg-foreground/[0.03]">
                                                    <CustomDatePicker
                                                        value={newDueDate}
                                                        onChange={(date) => {
                                                            setNewDueDate(date);
                                                            setIsDirty(true);
                                                        }}
                                                        placeholder="Due date"
                                                        className="w-full"
                                                    />
                                                </td>
                                                <td className="px-4 py-2 bg-foreground/[0.03]">
                                                    <div className="flex items-center gap-4">
                                                        <label className="flex items-center gap-2 cursor-pointer group">
                                                            <div className="relative flex items-center">
                                                                <input 
                                                                    type="checkbox" 
                                                                    checked={newQARequired}
                                                                    onChange={(e) => { setNewQARequired(e.target.checked); setIsDirty(true); }}
                                                                    className="peer h-4 w-4 appearance-none rounded border border-card-border bg-foreground/[0.03] checked:bg-purple-500/40 checked:border-purple-400 transition-all"
                                                                />
                                                                <FiCheck className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 text-purple-400 opacity-0 peer-checked:opacity-100 transition-opacity" />
                                                            </div>
                                                            <span className="text-[11px] font-bold text-text-muted group-hover:text-purple-400 transition-colors uppercase tracking-wider">QA</span>
                                                        </label>
                                                        <label className="flex items-center gap-2 cursor-pointer group">
                                                            <div className="relative flex items-center">
                                                                <input 
                                                                    type="checkbox" 
                                                                    checked={newReviewRequired}
                                                                    onChange={(e) => { setNewReviewRequired(e.target.checked); setIsDirty(true); }}
                                                                    className="peer h-4 w-4 appearance-none rounded border border-card-border bg-foreground/[0.03] checked:bg-blue-500/40 checked:border-blue-400 transition-all"
                                                                />
                                                                <FiCheck className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 text-blue-400 opacity-0 peer-checked:opacity-100 transition-opacity" />
                                                            </div>
                                                            <span className="text-[11px] font-bold text-text-muted group-hover:text-blue-400 transition-colors uppercase tracking-wider">Review</span>
                                                        </label>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-2 bg-foreground/[0.03]">
                                                    <Combobox
                                                        options={optimisticTasks.filter(t => t.id > 0).map(t => ({ value: t.id, label: t.name }))}
                                                        value={newDependsOn || ''}
                                                        onChange={(val) => { setNewDependsOn(val as number | null); setIsDirty(true); }}
                                                        placeholder="Depends on..."
                                                        className="w-full"
                                                    />
                                                </td>
                                                <td className="px-4 py-2">
                                                    <select
                                                        name="priority"
                                                        form="create-task-form"
                                                        className="w-full bg-foreground/[0.03] border border-card-border rounded-xl focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 px-3 py-2 text-foreground text-xs appearance-none cursor-pointer transition-all"
                                                        required
                                                        onChange={() => setIsDirty(true)}
                                                    >
                                                        <option value="low" className="bg-card">Low</option>
                                                        <option value="medium" className="bg-card">Medium</option>
                                                        <option value="high" className="bg-card">High</option>
                                                    </select>
                                                </td>
                                                <td className="px-4 py-2 min-w-[200px]">
                                                    <Combobox
                                                        options={users.map((u: User) => ({ value: u.id, label: u.fullName || u.email, subLabel: u.email }))}
                                                        value={newAssignees}
                                                        onChange={(val) => { setNewAssignees(val as (string | number)[]); setIsDirty(true); }}
                                                        multiple
                                                        placeholder="Assign..."
                                                        searchPlaceholder="Search users..."
                                                        className="w-full"
                                                    />
                                                </td>
                                                <td className="px-4 py-2 min-w-[150px]">
                                                    <Combobox
                                                        options={projects.map(p => ({ value: p.id, label: p.name, subLabel: p.key || undefined }))}
                                                        value={newProject || ''}
                                                        onChange={(val) => { setNewProject(val as string | number | null); setIsDirty(true); }}
                                                        placeholder="Project..."
                                                        searchPlaceholder="Search projects..."
                                                        className="w-full"
                                                    />
                                                </td>
                                                <td className="px-4 py-2">
                                                    <select
                                                        name="status"
                                                        form="create-task-form"
                                                        className="w-full bg-foreground/[0.03] border border-card-border rounded-xl focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 px-3 py-2 text-foreground text-xs appearance-none cursor-pointer transition-all"
                                                        required
                                                    >
                                                        {Object.entries(statusMapping).map(([key, value]) => (
                                                            <option key={key} value={key} className="bg-card">{value}</option>
                                                        ))}
                                                    </select>
                                                </td>
                                                {/* Time Logged placeholder in create row */}
                                                <td className="px-4 py-2">
                                                    <span className="text-text-muted/30 text-[11px]">—</span>
                                                </td>
                                                <td className="px-4 py-2 text-right text-xs font-medium sticky right-0 z-10 bg-card/90 backdrop-blur-md border-l border-card-border">
                                                    <div className="flex items-center justify-end space-x-2">
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
                                                            onClick={async () => {
                                                                if (isDirty) {
                                                                    const confirmed = await confirm({
                                                                        title: 'Unsaved Changes',
                                                                        message: 'You have unsaved changes. Are you sure you want to discard them?',
                                                                        confirmText: 'Discard Changes',
                                                                        type: 'warning'
                                                                    });

                                                                    if (confirmed) {
                                                                        setIsAddingTask(false);
                                                                        setIsDirty(false);
                                                                        setNewAssignees([]);
                                                                        setNewProject(null);
                                                                    }
                                                                } else {
                                                                    setIsAddingTask(false);
                                                                }
                                                            }}
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
                                        {filteredTasks.length === 0 && !isLoadingMore && !isAddingTask && (
                                            <tr>
                                                <td colSpan={8} className="px-6 py-24 text-center">
                                                    <EmptyState icon={FiClipboard} title="No tasks found" description="Create a task to get started or adjust your filters." />
                                                </td>
                                            </tr>
                                        )}
                                </tbody>
                            </table>
                        </div>
                        
                        {/* Infinite Scroll Sentinel */}
                        {!isReachingEnd && (
                            <div ref={sentinelRef} className="h-4 w-full" />
                        )}

                        <div className="p-4 border-t border-card-border bg-foreground/[0.01] flex items-center justify-between">
                            <div className="flex items-center">
                                {!isAddingTask && (
                                    <button
                                        onClick={async () => {
                                            if (isAddingTask && isDirty) {
                                                 const confirmed = await confirm({
                                                     title: 'Unsaved Changes',
                                                     message: 'You have unsaved changes. Are you sure you want to close the form?',
                                                     confirmText: 'Close Anyway',
                                                     type: 'warning'
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
                                        <div className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest leading-none mb-1">Expanding</div>
                                        <div className="h-1 w-12 bg-emerald-500/20 rounded-full overflow-hidden">
                                            <motion.div 
                                                className="h-full bg-emerald-500"
                                                initial={{ x: '-100%' }}
                                                animate={{ x: '100%' }}
                                                transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
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
        </div>
    );
}
