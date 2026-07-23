export function canManageTask(roles: string[] = [], orgRole?: string): boolean {
    if (roles.some(r => r === 'super_admin' || r === 'manager')) return true;
    if (orgRole === 'owner' || orgRole === 'admin') return true;
    return false;
}

export function canUserWorkOnTask(user: { id?: string | number; roles?: string[]; orgRole?: string } | null | undefined, task: { userId?: string | number | null; assigneeIds?: (string | number)[] | null; assignees?: { user: { id: string | number } }[] | null; owner?: { id?: string | number } | null }): boolean {
    if (!user) return false;

    const roles = user.roles || [];
    const isPrivileged = roles.some((role: string) => 
        role === 'super_admin' || role === 'manager'
    );
    if (isPrivileged) return true;

    if (user.orgRole === 'owner' || user.orgRole === 'admin') return true;

    if (String(task.userId) === String(user.id)) return true;
    if (task.owner && String(task.owner.id) === String(user.id)) return true;
    if (task.assigneeIds?.some(id => String(id) === String(user.id))) return true;
    if (task.assignees?.some((a: { user: { id: string | number } }) => String(a.user.id) === String(user.id))) return true;

    return false;
}
