import useSWR from 'swr';
import { useOrgSlug } from '@/hooks/use-org-slug';
import { getNotes } from '@/app/(dashboard)/[orgSlug]/notes/actions';
import { Note } from '@/types/note';

interface UseNotesProps {
    initialNotes?: Note[];
    limit?: number;
}

export function useNotes({ initialNotes, limit = 100 }: UseNotesProps = {}) {
    const orgSlug = useOrgSlug();

    // The cache key is scoped to the organization. SWR's cache is module-global
    // and survives client-side navigation, so an org-agnostic key ('clients',
    // 'users', …) left the previous tenant's rows on screen after an org switch
    // until that key revalidated. Keying on the slug switches cache entries with
    // the org.
    const { data, error, isLoading, mutate, isValidating } = useSWR(
        ['notes', orgSlug, limit],
        () => getNotes(limit),
        {
            fallbackData: initialNotes,
            revalidateOnFocus: false,
            revalidateOnReconnect: true,
            dedupingInterval: 5000,
        }
    );

    return {
        notes: data || [],
        // True once there is something to render — server-provided fallback or
        // fetched data, even an empty list. Gate skeletons on this rather than
        // `isLoading`: SWR reports `isLoading` until its own first fetch lands,
        // which says nothing about whether the page already has data to show.
        hasData: data !== undefined,
        isLoading,
        isValidating,
        error,
        mutate,
    };
}
