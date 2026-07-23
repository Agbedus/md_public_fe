import useSWR from 'swr';
import { getTimeOffRequests } from '@/app/(dashboard)/[orgSlug]/time-off/actions';
import type { TimeOffRequest } from '@/types/time-off';

export function useTimeOff(initialData?: TimeOffRequest[]) {
    const { data, error, isLoading, mutate, isValidating } = useSWR(
        'time-off-requests',
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
