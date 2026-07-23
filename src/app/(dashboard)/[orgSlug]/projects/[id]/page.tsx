import React from 'react';
import { notFound } from 'next/navigation';
import { getProject, getProjects } from '@/app/(dashboard)/[orgSlug]/projects/actions';
import { getTasks } from '@/app/(dashboard)/[orgSlug]/tasks/actions';
import { getNotes } from '@/app/(dashboard)/[orgSlug]/notes/actions';
import { getClients } from '@/app/(dashboard)/[orgSlug]/clients/actions';
import { getUsersSafe } from '@/app/(dashboard)/[orgSlug]/users/actions';
import ProjectDashboardClient from '@/components/ui/projects/project-dashboard-client';
import { auth } from '@/auth';

interface ProjectDashboardPageProps {
    params: Promise<{ id: string }>;
}

export default async function ProjectDashboardPage({ params }: ProjectDashboardPageProps) {
    const { id } = await params;
    const projectId = parseInt(id);

    if (isNaN(projectId)) {
        return notFound();
    }

    const [session, project, allTasks, allNotes, allUsers, allProjects] = await Promise.all([
        auth(),
        getProject(projectId),
        getTasks(undefined, undefined, undefined, projectId),
        getNotes(),
        getUsersSafe(),
        getProjects(),
    ]);

    const hasClientAccess = session?.user?.roles?.some(r => r === 'manager' || r === 'super_admin');
    const allClients = hasClientAccess ? await getClients() : [];

    if (!project) {
        return notFound();
    }

    // Filter project specific tasks and notes
    const projectTasks = allTasks.filter(t => t.projectId === projectId);
    const projectNotes = allNotes.filter(n => projectTasks.some(t => t.id === n.task_id));

    return (
        <ProjectDashboardClient 
            project={{...project, tasks: projectTasks}}
            tasks={projectTasks}
            notes={projectNotes}
            users={allUsers}
            clients={allClients}
            allProjects={allProjects}
        />
    );
}
