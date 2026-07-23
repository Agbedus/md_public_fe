import TasksPageClient from "@/components/ui/tasks/tasks-page-client";
import { auth } from '@/auth';
import { getTasks } from '@/app/(dashboard)/[orgSlug]/tasks/actions';
import { getUsersSafe } from '@/app/(dashboard)/[orgSlug]/users/actions';
import { getProjects } from '@/app/(dashboard)/[orgSlug]/projects/actions';

export default async function TasksPage() {
    const session = await auth();

    const [tasks, users, projects] = await Promise.all([
        getTasks(),
        getUsersSafe(),
        getProjects(),
    ]);

    return <TasksPageClient
        allTasks={tasks}
        users={users}
        projects={projects}
        currentUserId={session?.user?.id}
    />;
}
