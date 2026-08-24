'use server';

import { auth } from '@/auth';
import { getSessionHeaders } from '@/lib/server-auth';

const BASE_URL =
  process.env.BASE_URL_LOCAL ||
  process.env.BASE_URL_PRODUCTION ||
  'http://127.0.0.1:8000';
const API_BASE_URL = `${BASE_URL}/api/v1`;

export interface SidebarCounts {
  tasks: number;
  projects: number;
  notes: number;
}

const emptyCounts: SidebarCounts = {
  tasks: 0,
  projects: 0,
  notes: 0,
};

async function getResourceCount(resource: 'tasks' | 'projects' | 'notes', headers: Record<string, string>) {
  try {
    const response = await fetch(`${API_BASE_URL}/${resource}?limit=1000`, {
      method: 'GET',
      headers,
      cache: 'no-store',
    });

    if (!response.ok) return 0;

    const records: unknown = await response.json();
    return Array.isArray(records) ? records.length : 0;
  } catch {
    return 0;
  }
}

/** Lightweight sidebar totals, scoped by the active organization header. */
export async function getSidebarCounts(): Promise<SidebarCounts> {
  const session = await auth();
  if (!session?.user?.accessToken) return emptyCounts;

  const headers = await getSessionHeaders();
  const [tasks, projects, notes] = await Promise.all([
    getResourceCount('tasks', headers),
    getResourceCount('projects', headers),
    getResourceCount('notes', headers),
  ]);

  return { tasks, projects, notes };
}
