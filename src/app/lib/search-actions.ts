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
        { id: 'platform-vision', title: 'Platform Vision' },
        { id: 'technical-specs', title: 'Technical Requirements' },
        { id: 'security-auth', title: 'Security & Auth' },
        { id: 'how-to-clock-in', title: 'How to Clock In' },
        { id: 'geofencing-logic', title: 'Geofencing Logic' },
        { id: 'kanban-mastery', title: 'Kanban Mastery' },
        { id: 'task-dynamics', title: 'Priority Dynamics' },
        { id: 'ai-briefing', title: 'Mission Control AI' },
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
