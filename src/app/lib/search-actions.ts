'use server';

import { auth } from '@/auth';
import { cookies } from 'next/headers';
import { getTasks } from '@/app/(dashboard)/[orgSlug]/tasks/actions';
import { getProjects } from '@/app/(dashboard)/[orgSlug]/projects/actions';
import { orgPath } from '@/lib/org-path';

export interface SearchResult {
    id: string | number;
    title: string;
    type: 'task' | 'project' | 'wiki';
    href: string;
    subtitle?: string;
}

export async function searchGlobal(query: string): Promise<SearchResult[]> {
    if (!query || query.length < 2) return [];

    const session = await auth();
    if (!session) return [];

    // Every result href must stay inside the current org's route segment,
    // otherwise selecting a result navigates out of `[orgSlug]` and 404s.
    const orgSlug =
        session.user?.orgSlug ||
        (await cookies()).get('org_slug')?.value ||
        null;

    const lowerQuery = query.toLowerCase();

    // 1. Fetch Tasks and Projects (we fetch all and filter client-side/server-side for now as API might not have search)
    const [tasks, projects] = await Promise.all([
        getTasks(undefined, undefined, undefined, undefined, 50), // Fetch a reasonable amount to search through
        getProjects(50)
    ]);

    const results: SearchResult[] = [];

    // Filter Tasks
    tasks.filter(t => 
        t.name.toLowerCase().includes(lowerQuery) || 
        t.description?.toLowerCase().includes(lowerQuery)
    ).forEach(t => {
        results.push({
            id: t.id,
            title: t.name,
            type: 'task',
            href: `${orgPath(orgSlug, 'tasks')}?id=${t.id}`,
            subtitle: `Status: ${t.status}`
        });
    });

    // Filter Projects
    projects.filter(p => 
        p.name.toLowerCase().includes(lowerQuery) || 
        p.description?.toLowerCase().includes(lowerQuery) ||
        p.key?.toLowerCase().includes(lowerQuery)
    ).forEach(p => {
        results.push({
            id: p.id,
            title: p.name,
            type: 'project',
            href: orgPath(orgSlug, 'projects', p.id),
            subtitle: `Key: ${p.key}`
        });
    });

    // 2. Static Wiki Search
    const wikiTopics = [
        { id: 'clocking-in', title: 'Clocking In and Automatic Attendance' },
        { id: 'office-locations', title: 'Office Locations and Geofencing' },
        { id: 'board-and-table', title: 'Task Board and Table Views' },
        { id: 'assistant-basics', title: 'Questions You Can Ask Pip AI' },
        { id: 'assistant-actions', title: 'Pip AI Actions and Workspace Data' },
        { id: 'assistant-reports', title: 'AI Reports and PDF Downloads' },
        { id: 'assistant-connection', title: 'Pip NVIDIA Connection and Errors' },
        { id: 'sharing-options', title: 'Sharing MyndDesk' },
        { id: 'sharing-qr', title: 'Custom QR Codes' },
        { id: 'sharing-privacy', title: 'Share Analytics and Privacy' },
    ];

    wikiTopics.filter(w => w.title.toLowerCase().includes(lowerQuery)).forEach(w => {
        results.push({
            id: w.id,
            title: w.title,
            type: 'wiki',
            href: `${orgPath(orgSlug, 'wiki')}#${w.id}`,
            subtitle: 'Knowledge Base'
        });
    });

    return results.slice(0, 10); // Return top 10
}
