import useSWR from 'swr';
import { getProjects } from '@/app/(dashboard)/[orgSlug]/projects/actions';
import { Project } from '@/types/project';

interface UseProjectsProps {
    initialProjects?: Project[];
    limit?: number;
}

export function useProjects({ initialProjects, limit = 100 }: UseProjectsProps = {}) {
    const { data, error, isLoading, mutate, isValidating } = useSWR(
        ['projects', limit],
        () => getProjects(limit),
        {
            fallbackData: initialProjects,
            revalidateOnFocus: false,
            revalidateOnReconnect: true,
            dedupingInterval: 5000,
        }
    );

    return {
        projects: data || [],
        isLoading,
        isValidating,
        error,
        mutate,
    };
}
