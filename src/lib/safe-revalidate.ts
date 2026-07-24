/**
 * Run cache revalidation without letting it fail a mutation that already succeeded.
 *
 * Server actions here follow the shape:
 *
 *   try {
 *     const res = await fetch(...)        // the actual write
 *     if (!res.ok) return { success: false, ... }
 *     revalidateTag(...)                  // cache bookkeeping
 *     return { success: true, ... }
 *   } catch { return { success: false, error: "Failed to ..." } }
 *
 * `revalidatePath`/`revalidateTag` throw in a number of situations (called
 * outside a request scope, during render, inside a cached function, missing
 * incremental cache). Because they sit inside the same `try`, such a throw is
 * caught by the action's own handler and reported to the user as a *write*
 * failure — even though the write already committed on the server. That is how
 * "Task created successfully" turned into a red "Failed to create task" banner.
 *
 * Revalidation is bookkeeping, not the operation. If it fails, log it and let
 * the mutation report the truth: it succeeded.
 */
export function safeRevalidate(revalidate: () => void, context: string): void {
    try {
        revalidate();
    } catch (error) {
        console.error(
            `[safeRevalidate] cache revalidation failed after a successful ${context}; ` +
            `the write itself committed. Clients refresh on their next fetch.`,
            error,
        );
    }
}
