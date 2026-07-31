import { isOrgAdmin, canModifyRecord } from '@/lib/org-permissions';

/**
 * May act on **any** task in the org — edit and delete regardless of owner.
 * Org OWNER/ADMIN, or a global MANAGER/SUPER_ADMIN.
 *
 * Note this is *not* the gate for creating a task: creating is open to every
 * collaborator down to MEMBER (see `canCreate`). Nor is it the gate for editing
 * one specific task — for that use `canUserWorkOnTask`, which also admits the
 * task's creator and assignees.
 */
export function canManageTask(roles: string[] = [], orgRole?: string): boolean {
    return isOrgAdmin({ roles, orgRole });
}

interface TaskSubject {
    id?: string | number;
    roles?: string[];
    orgRole?: string;
}

interface TaskLike {
    userId?: string | number | null;
    assigneeIds?: (string | number)[] | null;
    assignees?: { user: { id: string | number } }[] | null;
    owner?: { id?: string | number } | null;
}

/**
 * May work on a specific task — move it across the board, log time, edit it.
 *
 * Mirrors `update_task` on the backend: org admins may touch any task, and
 * everyone else needs to be the creator, an assignee, or the project owner.
 *
 * The assignee clause is the one deliberate exception to "you may only change
 * what you created" — that is how work moves across the board. It applies to
 * *editing* only; deleting still requires `canDeleteTask`.
 */
export function canUserWorkOnTask(
    user: TaskSubject | null | undefined,
    task: TaskLike,
): boolean {
    if (!user) return false;

    if (isOrgAdmin({ roles: user.roles, orgRole: user.orgRole })) return true;

    if (String(task.userId) === String(user.id)) return true;
    if (task.owner && String(task.owner.id) === String(user.id)) return true;
    if (task.assigneeIds?.some((id) => String(id) === String(user.id))) return true;
    if (task.assignees?.some((a) => String(a.user.id) === String(user.id))) return true;

    return false;
}

/**
 * May delete a specific task.
 *
 * Stricter than `canUserWorkOnTask`: being assigned a task lets you move and
 * edit it, but not destroy it. Org admins may delete anything; everyone else
 * only what they created.
 */
export function canDeleteTask(
    user: TaskSubject | null | undefined,
    task: TaskLike,
): boolean {
    if (!user) return false;
    return canModifyRecord({ id: user.id, roles: user.roles, orgRole: user.orgRole }, task.userId);
}
