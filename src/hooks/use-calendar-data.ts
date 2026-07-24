import useSWR from 'swr';
import { useOrgSlug } from '@/hooks/use-org-slug';
import { getCalendarData } from '@/app/(dashboard)/[orgSlug]/calendar/actions';
import { User } from '@/types/user';

export function useCalendarData(initialData?: any, users: User[] = []) {
    const orgSlug = useOrgSlug();

    // The cache key is scoped to the organization. SWR's cache is module-global
    // and survives client-side navigation, so an org-agnostic key ('clients',
    // 'users', …) left the previous tenant's rows on screen after an org switch
    // until that key revalidated. Keying on the slug switches cache entries with
    // the org.
    const { data, error, isLoading, mutate, isValidating } = useSWR(
        ['calendar-data', orgSlug],
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
