import useSWR from 'swr';
import { useOrgSlug } from '@/hooks/use-org-slug';
import { getEvents } from '@/app/(dashboard)/[orgSlug]/calendar/actions';
import { CalendarEvent } from '@/types/calendar';

export function useEvents(initialEvents?: CalendarEvent[]) {
    const orgSlug = useOrgSlug();

    // The cache key is scoped to the organization. SWR's cache is module-global
    // and survives client-side navigation, so an org-agnostic key ('clients',
    // 'users', …) left the previous tenant's rows on screen after an org switch
    // until that key revalidated. Keying on the slug switches cache entries with
    // the org.
    const { data, error, isLoading, mutate, isValidating } = useSWR(
        ['calendar-events', orgSlug],
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
