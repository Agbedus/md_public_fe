import useSWR from 'swr';
import { useOrgSlug } from '@/hooks/use-org-slug';
import { getTimeOffRequests } from '@/app/(dashboard)/[orgSlug]/time-off/actions';
import type { TimeOffRequest } from '@/types/time-off';

export function useTimeOff(initialData?: TimeOffRequest[]) {
    const orgSlug = useOrgSlug();

    // The cache key is scoped to the organization. SWR's cache is module-global
    // and survives client-side navigation, so an org-agnostic key ('clients',
    // 'users', …) left the previous tenant's rows on screen after an org switch
    // until that key revalidated. Keying on the slug switches cache entries with
    // the org.
    const { data, error, isLoading, mutate, isValidating } = useSWR(
        ['time-off-requests', orgSlug],
        () => getTimeOffRequests(),
        {
            fallbackData: initialData,
            revalidateOnFocus: false,
            revalidateOnReconnect: true,
            dedupingInterval: 10000,
        }
    );

    return {
        timeOffRequests: data || [],
        isLoading,
        isValidating,
        error,
        mutate,
    };
}
