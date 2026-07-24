import useSWR from 'swr';
import { useOrgSlug } from '@/hooks/use-org-slug';
import { getClients } from '@/app/(dashboard)/[orgSlug]/clients/actions';
import { Client } from '@/types/client';

interface UseClientsProps {
    initialClients?: Client[];
}

export function useClients({ initialClients }: UseClientsProps = {}) {
    const orgSlug = useOrgSlug();

    // The cache key is scoped to the organization. SWR's cache is module-global
    // and survives client-side navigation, so an org-agnostic key ('clients',
    // 'users', …) left the previous tenant's rows on screen after an org switch
    // until that key revalidated. Keying on the slug switches cache entries with
    // the org.
    const { data, error, isLoading, mutate, isValidating } = useSWR(
        ['clients', orgSlug],
        () => getClients(),
        {
            fallbackData: initialClients,
            revalidateOnFocus: false,
            revalidateOnReconnect: true,
            dedupingInterval: 5000,
        }
    );

    return {
        clients: data || [],
        isLoading,
        isValidating,
        error,
        mutate,
    };
}
