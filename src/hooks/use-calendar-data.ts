import useSWR from 'swr';
import { getCalendarData } from '@/app/(dashboard)/[orgSlug]/calendar/actions';
import { User } from '@/types/user';

export function useCalendarData(initialData?: any, users: User[] = []) {
    const { data, error, isLoading, mutate, isValidating } = useSWR(
        'calendar-data',
        () => getCalendarData(),
        {
            fallbackData: initialData,
            revalidateOnFocus: false,
            revalidateOnReconnect: true,
            dedupingInterval: 5000,
        }
    );

    const tasks = data?.tasks || [];
    const hydratedTasks = tasks.map((task: any) => {
        if (!task.assigneeIds || task.assigneeIds.length === 0) return task;
        return {
            ...task,
            assignees: users
                .filter(u => task.assigneeIds?.includes(u.id))
                .map(user => ({ user }))
        };
    });

    return {
        events: data?.events || [],
        tasks: hydratedTasks,
        projects: data?.projects || [],
        timeOffRequests: data?.timeOff || [],
        isLoading,
        isValidating,
        error,
        mutate,
    };
}
