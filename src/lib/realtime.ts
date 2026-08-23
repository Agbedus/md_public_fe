import { mutate } from 'swr';

/**
 * Applying a real-time record change to the SWR cache.
 *
 * The server pushes raw API records — snake_case, with the backend's field
 * names. The frontend types are camelCase, and the snake→camel mapping for each
 * resource lives inline in that resource's `actions.ts`. Splicing the pushed
 * payload straight into the cache would mean re-implementing all seven of those
 * mappings here, giving every resource a second shape definition that silently
 * goes wrong the moment a field is added on either side.
 *
 * So a push triggers an immediate, targeted revalidation of the affected
 * org-scoped keys instead. The user never refreshes — the row appears on its
 * own, one round trip behind the event — and the data that lands is mapped by
 * the same code path as every other fetch.
 *
 * Deletes are the exception: an id is unambiguous, so the row is dropped from
 * the cache straight away and the revalidation just confirms it.
 */

/**
 * Backend resource name -> the SWR cache key prefix it feeds.
 *
 * Not a plain `resource + 's'`: calendar events are cached under
 * `calendar-events`, so the naive pluralization silently never matched and the
 * calendar stayed stale.
 */
const RESOURCE_KEYS: Record<string, string[]> = {
    task: ['tasks'],
    note: ['notes'],
    project: ['projects'],
    client: ['clients'],
    event: ['calendar-events'],
    decision: ['decisions'],
    timelog: ['timelogs', 'tasks'],
    announcement: ['announcements'],
};

/** Human-readable name per resource, for toasts. */
export const REALTIME_LABELS: Record<string, string> = {
    task: 'Task',
    note: 'Note',
    project: 'Project',
    client: 'Client',
    event: 'Event',
    decision: 'Decision',
    timelog: 'Time log',
    announcement: 'Announcement',
};

/** Every cache key prefix a resource should refresh. */
export function cacheKeysFor(resource: string): string[] {
    return RESOURCE_KEYS[resource] ?? [`${resource}s`];
}

function keyMatches(key: unknown, prefixes: string[], workspaceScope?: string | null): boolean {
    if (!Array.isArray(key) || typeof key[0] !== 'string' || !prefixes.includes(key[0])) return false;
    return !workspaceScope || key[1] === workspaceScope;
}

/**
 * Revalidate every cache entry belonging to a resource.
 *
 * Filtered by the active workspace slug. Since caches survive organization
 * switches, revalidating every matching prefix would otherwise refill cached
 * entries for inactive workspaces with data from the currently selected one.
 */
export function revalidateResource(resource: string, workspaceScope?: string | null): Promise<unknown> {
    const prefixes = cacheKeysFor(resource);
    return mutate((key: unknown) => keyMatches(key, prefixes, workspaceScope), undefined, {
        revalidate: true,
    });
}

/** A record carrying an id, in either casing. */
interface Identifiable {
    id?: string | number;
}

function sameId(a: unknown, b: unknown): boolean {
    return a !== undefined && a !== null && String(a) === String(b);
}

/**
 * Drop a deleted record from every cached list that holds it, then revalidate.
 *
 * Handles both plain arrays (`useSWR`) and page arrays (`useSWRInfinite`, which
 * tasks use — its cache value is an array of pages, not an array of rows).
 */
export function removeFromCache(resource: string, id: string | number, workspaceScope?: string | null): Promise<unknown> {
    const prefixes = cacheKeysFor(resource);
    return mutate(
        (key: unknown) => keyMatches(key, prefixes, workspaceScope),
        (current: unknown) => {
            if (!Array.isArray(current)) return current;

            // useSWRInfinite: an array of pages, each an array of rows.
            if (current.length > 0 && Array.isArray(current[0])) {
                return (current as Identifiable[][]).map((page) =>
                    page.filter((row) => !sameId(row?.id, id)),
                );
            }
            return (current as Identifiable[]).filter((row) => !sameId(row?.id, id));
        },
        { revalidate: true },
    );
}

/**
 * Apply one `DATA_UPDATE` message.
 *
 * Returns the resource so callers can decide whether to surface a toast.
 */
export function applyRealtimeUpdate(
    resource: string,
    action: string,
    data: Identifiable | null | undefined,
    workspaceScope?: string | null,
): Promise<unknown> {
    if (action === 'deleted' && data?.id !== undefined) {
        return removeFromCache(resource, data.id, workspaceScope);
    }
    return revalidateResource(resource, workspaceScope);
}
