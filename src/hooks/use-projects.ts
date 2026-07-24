import useSWR from 'swr';
import { useOrgSlug } from '@/hooks/use-org-slug';
import { getProjects } from '@/app/(dashboard)/[orgSlug]/projects/actions';
import { Project } from '@/types/project';

interface UseProjectsProps {
    initialProjects?: Project[];
    limit?: number;
}

export function useProjects({ initialProjects, limit = 100 }: UseProjectsProps = {}) {
    const orgSlug = useOrgSlug();

    // The cache key is scoped to the organization. SWR's cache is module-global
    // and survives client-side navigation, so an org-agnostic key ('clients',
    // 'users', …) left the previous tenant's rows on screen after an org switch
    // until that key revalidated. Keying on the slug switches cache entries with
    // the org.
    const { data, error, isLoading, mutate, isValidating } = useSWR(
        ['projects', orgSlug, limit],
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
