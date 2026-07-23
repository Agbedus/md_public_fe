import useSWRInfinite from 'swr/infinite';
import { getTasks } from '@/app/(dashboard)/[orgSlug]/tasks/actions';
import { Task } from '@/types/task';
import { User } from "@/types/user";

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
    const getKey = (pageIndex: number, previousPageData: Task[]) => {
        if (previousPageData && !previousPageData.length) return null; // reached the end
        return ['tasks', searchQuery, filterPriority, filterStatus, projectId, limit, pageIndex * limit];
    };

    const fetcher = async ([_, q, p, s, proj, l, sk]: [string, string | undefined, string | undefined, string | undefined, number | undefined, number, number]) => {
        const tasks = await getTasks(q, p, s, proj, l, sk);
        // Hydrate tasks with user objects for assignees
        return tasks.map(task => {
            if (task.assignees && task.assignees.length > 0 && task.assignees[0].user) return task; // Already hydrated?
            if (!task.assigneeIds || task.assigneeIds.length === 0) return task;
            
            return {
                ...task,
                assignees: users
                    .filter(u => task.assigneeIds?.includes(u.id))
                    .map(user => ({ user }))
            };
        });
    };

    const { data, error, size, setSize, mutate, isLoading, isValidating } = useSWRInfinite(getKey, fetcher, {
        revalidateOnFocus: true,
        fallbackData: initialTasks ? [initialTasks] : undefined,
        keepPreviousData: true,
        dedupingInterval: 2000, // Short interval to allow frequent updates
    });
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
