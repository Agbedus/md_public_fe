import React from 'react';
import ProjectsPageClient from '@/components/ui/projects/projects-page-client';
import { getProjects } from './actions';
import { getClients } from '@/app/(dashboard)/[orgSlug]/clients/actions';
import { getUsersSafe } from '@/app/(dashboard)/[orgSlug]/users/actions';
import { getTasks } from '@/app/(dashboard)/[orgSlug]/tasks/actions';
import { getNotes } from '@/app/(dashboard)/[orgSlug]/notes/actions';
import { Project } from '@/types/project';
import { Task } from '@/types/task';
import { auth } from '@/auth';

export default async function ProjectsPage() {
  const [session, allProjects, allUsers, allTasks, allNotes] = await Promise.all([
    auth(),
    getProjects(),
    getUsersSafe(),
    getTasks(),
    getNotes(),
  ]);

  const hasClientAccess = session?.user?.roles?.some(r => r === 'manager' || r === 'super_admin');
  const allClients = hasClientAccess ? await getClients() : [];
  
  // Link tasks to projects
  const projectsWithTasks: Project[] = allProjects.map((project: Project) => ({
    ...project,
    tasks: allTasks.filter((task: Task) => task.projectId === project.id)
  }));
  
  return <ProjectsPageClient 
    initialProjects={projectsWithTasks} 
    initialUsers={allUsers} 
    initialClients={allClients} 
    initialNotes={allNotes}
    initialTasks={allTasks}
  />;
}
