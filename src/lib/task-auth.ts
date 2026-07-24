import { canManageOrg } from '@/lib/org-permissions';

/**
 * May manage any task in the org — edit and delete tasks regardless of owner.
 * Org OWNER/ADMIN, or a global MANAGER/SUPER_ADMIN.
 *
 * Note this is *not* the gate for creating a task: creating is open to every
 * collaborator down to MEMBER (see `canCollaborate`), matching the backend.
 */
export function canManageTask(roles: string[] = [], orgRole?: string): boolean {
    return canManageOrg({ roles, orgRole });
}

/**
 * May work on a specific task — move it across the board, log time, edit it.
 *
 * Mirrors the backend rule in `update_task`: org managers may touch any task,
 * everyone else needs to be the creator, an assignee, or the project owner.
 */
export function canUserWorkOnTask(user: { id?: string | number; roles?: string[]; orgRole?: string } | null | undefined, task: { userId?: string | number | null; assigneeIds?: (string | number)[] | null; assignees?: { user: { id: string | number } }[] | null; owner?: { id?: string | number } | null }): boolean {
    if (!user) return false;

    if (canManageOrg({ roles: user.roles, orgRole: user.orgRole })) return true;

    if (String(task.userId) === String(user.id)) return true;
    if (task.owner && String(task.owner.id) === String(user.id)) return true;
    if (task.assigneeIds?.some(id => String(id) === String(user.id))) return true;
    if (task.assignees?.some((a: { user: { id: string | number } }) => String(a.user.id) === String(user.id))) return true;

    return false;
}
