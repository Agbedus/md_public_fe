import { User } from '@/types/user';
import { Task } from '@/types/task';

export function canUserWorkOnTask(user: User | null | undefined, task: Task): boolean {
    if (!user) return false;

    const roles = user.roles || [];
    const isPrivileged = roles.some((role: string) => 
        role === 'super_admin' || role === 'manager'
    );

    if (isPrivileged) return true;

    // Check if owner
    if (String(task.userId) === String(user.id)) return true;

    // Check if assigned
    if (task.assigneeIds?.some(id => String(id) === String(user.id))) return true;

    // Additional check for task.assignees structure
    if (task.assignees?.some((a: { user: { id: string | number } }) => String(a.user.id) === String(user.id))) return true;

    return false;
}
