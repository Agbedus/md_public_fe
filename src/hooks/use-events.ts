import useSWR from 'swr';
import { getEvents } from '@/app/(dashboard)/[orgSlug]/calendar/actions';
import { CalendarEvent } from '@/types/calendar';

export function useEvents(initialEvents?: CalendarEvent[]) {
    const { data, error, isLoading, mutate, isValidating } = useSWR(
        'calendar-events',
        () => getEvents(),
        {
            fallbackData: initialEvents,
            revalidateOnFocus: false,
            revalidateOnReconnect: true,
            dedupingInterval: 10000,
        }
    );

    return {
        events: data || [],
        isLoading,
        isValidating,
        error,
        mutate,
    };
}
