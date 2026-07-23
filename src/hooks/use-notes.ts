import useSWR from 'swr';
import { getNotes } from '@/app/(dashboard)/[orgSlug]/notes/actions';
import { Note } from '@/types/note';

interface UseNotesProps {
    initialNotes?: Note[];
    limit?: number;
}

export function useNotes({ initialNotes, limit = 100 }: UseNotesProps = {}) {
    const { data, error, isLoading, mutate, isValidating } = useSWR(
        ['notes', limit],
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
        isLoading,
        isValidating,
        error,
        mutate,
    };
}
