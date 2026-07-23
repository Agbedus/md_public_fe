import useSWR from 'swr';
import { getUsersSafe } from '@/app/(dashboard)/[orgSlug]/users/actions';
import { User } from '@/types/user';

export function useUsers(initialUsers?: User[]) {
    const { data, error, isLoading, mutate, isValidating } = useSWR(
        'users',
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
