/**
 * Optimistic writes against an SWR list cache.
 *
 * The pattern every CRUD screen should use:
 *
 *   await mutate(
 *     async (current) => {
 *       const res = await createThing(formData);
 *       if (!res.success) throw new Error(res.error);   // triggers rollback
 *       return replaceTemp(current ?? [], toThing(res.thing));
 *     },
 *     optimisticList<Thing>(list => [tempThing, ...list]),
 *   );
 *
 * What this buys, and why each option matters:
 *
 *  - `optimisticData` paints the change before the request leaves the browser,
 *    so the screen responds immediately.
 *  - `populateCache` writes the resolver's return value (built from the server's
 *    own response) straight into the cache, so no follow-up fetch is needed.
 *  - `revalidate: false` skips the round-trip that otherwise makes a list feel
 *    stale until it lands.
 *  - `rollbackOnError` restores the previous list if the resolver throws, so a
 *    failed write cannot leave a phantom row on screen.
 *
 * Do NOT reach for React's `useOptimistic` here. It drops its optimistic layer
 * as soon as the enclosing transition settles and only works when the base state
 * comes back updated from a server re-render. These screens are backed by an SWR
 * cache, so the optimistic row disappeared on settle and the page looked
 * unchanged until a full browser refresh.
 */
export function optimisticList<T>(apply: (current: T[]) => T[]) {
    return {
        optimisticData: (current: T[] | undefined) => apply(current ?? []),
        populateCache: true,
        revalidate: false,
        rollbackOnError: true,
    };
}

/**
 * Same instant feedback, for actions that only confirm success and do not hand
 * back the saved record (everything returning a bare `ActionResult`).
 *
 * Because there is no server payload to write into the cache, the optimistic
 * list stays on screen and SWR refetches quietly in the background. The user
 * sees the change immediately; the authoritative list arrives a moment later
 * without the screen going blank or bouncing.
 */
export function optimisticListRevalidate<T>(apply: (current: T[]) => T[]) {
    return {
        optimisticData: (current: T[] | undefined) => apply(current ?? []),
        populateCache: false,
        revalidate: true,
        rollbackOnError: true,
    };
}

/**
 * Swap a temporary (optimistic) entry for the real one the server returned,
 * keeping list position stable and guarding against duplicates.
 */
export function replaceById<T extends { id: string | number }>(
    list: T[],
    tempId: string | number,
    real: T,
): T[] {
    const withoutTemp = list.filter(item => item.id !== tempId && item.id !== real.id);
    const at = list.findIndex(item => item.id === tempId);
    if (at === -1) return [real, ...withoutTemp];
    return [...withoutTemp.slice(0, at), real, ...withoutTemp.slice(at)];
}
