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
import { canCreate } from '@/lib/org-permissions';
import { getPermissionSubject } from '@/lib/permission-subject';

export default async function ProjectsPage() {
  const [session, allProjects, allUsers, allTasks, allNotes] = await Promise.all([
    auth(),
    getProjects(),
    getUsersSafe(),
    getTasks(),
    getNotes(),
  ]);

  // Reading the client list is collaborator-level on the backend
  // (`get_current_org_collaborator`), so anyone who can create a project can
  // pick a client for it. Creating a client is a separate, higher gate.
  const hasClientAccess = canCreate({
    roles: session?.user?.roles,
    orgRole: session?.user?.orgRole,
  });
  const allClients = hasClientAccess ? await getClients() : [];
  
  // Link tasks to projects
  const projectsWithTasks: Project[] = allProjects.map((project: Project) => ({
    ...project,
    tasks: allTasks.filter((task: Task) => task.projectId === project.id)
  }));
  
  const subject = await getPermissionSubject();

  return <ProjectsPageClient 
    subject={subject}
    initialProjects={projectsWithTasks} 
    initialUsers={allUsers} 
    initialClients={allClients} 
    initialNotes={allNotes}
    initialTasks={allTasks}
  />;
}
