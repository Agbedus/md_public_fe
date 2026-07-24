import { useEffect } from 'react';
import useSWRInfinite from 'swr/infinite';
import { getTasks } from '@/app/(dashboard)/[orgSlug]/tasks/actions';
import { Task } from '@/types/task';
import { User } from "@/types/user";
import { on } from '@/lib/event-bus';
import { useOrgSlug } from '@/hooks/use-org-slug';

interface UseTasksProps {
    searchQuery?: string;
    filterPriority?: string;
    filterStatus?: string;
    projectId?: number;
    limit?: number;
    users: User[];
    initialTasks?: Task[];
}

export function useTasks({ 
    searchQuery, 
    filterPriority, 
    filterStatus, 
    projectId, 
    limit = 50,
    users,
    initialTasks 
}: UseTasksProps) {
    const orgSlug = useOrgSlug();

    // The cache key is scoped to the organization. SWR's cache is module-global
    // and survives client-side navigation, so an org-agnostic key left the
    // previous tenant's tasks on screen after an org switch until that key
    // revalidated. Keying on the slug switches cache entries with the org.
    const getKey = (pageIndex: number, previousPageData: Task[]) => {
        if (previousPageData && !previousPageData.length) return null; // reached the end
        return ['tasks', orgSlug, searchQuery || '', filterPriority || '', filterStatus || '', projectId || null, limit, pageIndex * limit];
    };

    // Destructuring is positional, so it must stay in step with `getKey` above —
    // note the org slug sits at index 1.
    const fetcher = async ([_, _org, q, p, s, proj, l, sk]: [string, string | null, string, string, string, number | null, number, number]) => {
        const tasks = await getTasks(
            q || undefined, 
            p || undefined, 
            s || undefined, 
            proj || undefined, 
            l, 
            sk
        );
        // Hydrate tasks with user objects for assignees
        return tasks.map(task => {
            if (task.assignees && task.assignees.length > 0 && task.assignees[0].user) return task;
            if (!task.assigneeIds || task.assigneeIds.length === 0) return task;
            
            return {
                ...task,
                assignees: users
                    .filter(u => task.assigneeIds?.some(id => String(id) === String(u.id)))
                    .map(user => ({ user }))
            };
        });
    };

    const { data, error, size, setSize, mutate, isLoading, isValidating } = useSWRInfinite(getKey, fetcher, {
        revalidateOnFocus: true,
        fallbackData: initialTasks ? [initialTasks] : undefined,
        keepPreviousData: true,
        dedupingInterval: 1000,
    });

    useEffect(() => {
        const unsubCreated = on('task:created', () => { mutate(); });
        const unsubUpdated = on('task:updated', () => { mutate(); });
        const unsubDeleted = on('task:deleted', () => { mutate(); });
        return () => {
            unsubCreated();
            unsubUpdated();
            unsubDeleted();
        };
    }, [mutate]);

    const tasks = data ? data.flat() : [];
    const isLoadingMore = 
        isLoading || (size > 0 && data && typeof data[size - 1] === "undefined");
    const isReachingEnd = data && data[data.length - 1]?.length < limit;

    return {
        tasks,
        isLoading,
        isValidating,
        isLoadingMore,
        isReachingEnd,
        size,
        setSize,
        mutate,
        error
    };
}

