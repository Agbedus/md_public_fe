import useSWR from 'swr';
import { useOrgSlug } from '@/hooks/use-org-slug';
import { getUsersSafe } from '@/app/(dashboard)/[orgSlug]/users/actions';
import { User } from '@/types/user';

export function useUsers(initialUsers?: User[]) {
    const orgSlug = useOrgSlug();

    // The cache key is scoped to the organization. SWR's cache is module-global
    // and survives client-side navigation, so an org-agnostic key ('clients',
    // 'users', …) left the previous tenant's rows on screen after an org switch
    // until that key revalidated. Keying on the slug switches cache entries with
    // the org.
    const { data, error, isLoading, mutate, isValidating } = useSWR(
        ['users', orgSlug],
        () => getUsersSafe(),
        {
            fallbackData: initialUsers,
            revalidateOnFocus: false,
            revalidateOnReconnect: true,
            dedupingInterval: 60000, // Users don't change often
        }
    );

    return {
        users: data || [],
        isLoading,
        isValidating,
        error,
        mutate,
    };
}
