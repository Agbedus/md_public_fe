'use server';

const BASE_URL = process.env.BASE_URL_LOCAL || process.env.BASE_URL_PRODUCTION || "http://127.0.0.1:8000";
const API_BASE_URL = `${BASE_URL}/api/v1`;

import { auth } from '@/auth';
import { getSessionHeaders, handleUnauthorizedResponse, handleForbiddenResponse } from '@/lib/server-auth';
import { Task } from '@/types/task';
import { revalidatePath, revalidateTag } from 'next/cache';
import { cache } from 'react';
import type { ActionResult } from '@/types/api';

// Interface for what the API returns (snake_case)
interface ApiTask {
    id: number;
    name: string;
    description: string | null;
    status: string;
    priority: string;
    due_date: string | null;
    qa_required: boolean;
    review_required: boolean;
    depends_on_id: number | null;
    created_at: string;
    updated_at: string;
    project_id: number | null;
    assignees?: Array<{
        id: string | number;
        full_name?: string;
        name?: string;
        email?: string;
        avatar_url?: string;
        image?: string;
        roles?: string[];
    }>;
    assignee_ids?: string[];
    task_assignees?: Array<{
        task_id: number;
        user_id: string | number;
    }>;
    user_id?: string;
    time_logs?: any[];
    total_hours?: number;
}

export const getTasks = cache(async function(query?: string, priority?: string, status?: string, projectId?: number, limit?: number, skip?: number): Promise<Task[]> {

    const session = await auth();
    if (!session?.user?.accessToken) {

        return [];
    }

    try {
        const queryParams = new URLSearchParams();
        if (query) queryParams.append('q', query);
        if (priority) queryParams.append('priority', priority);
        if (status) queryParams.append('status', status);
        if (projectId) queryParams.append('project_id', projectId.toString());
        if (limit) queryParams.append('limit', limit.toString());
        if (skip) queryParams.append('skip', skip.toString());

        const [response, users] = await Promise.all([
            fetch(`${API_BASE_URL}/tasks?${queryParams.toString()}`, {
                method: 'GET',
                headers: { ...(await getSessionHeaders())! },
                next: { tags: ['tasks', 'projects'], revalidate: 60 }
            }),
            import('@/app/(dashboard)/[orgSlug]/users/actions').then(mod => mod.getUsersSafe())
        ]);


        if (!response.ok) {
            if (await handleUnauthorizedResponse(response)) return [];
            console.error("Failed to fetch tasks:", await response.text());
            return [];
        }

        const apiTasks: ApiTask[] = await response.json();
        
        // Map API snake_case to Frontend camelCase
        let tasks: Task[] = apiTasks.map(t => {
            const owner = users.find((u: any) => u.id === t.user_id);
            return {
                id: t.id,
                name: t.name,
                description: t.description,
                status: t.status as Task['status'],
                priority: t.priority as Task['priority'],
                dueDate: t.due_date,
                qa_required: t.qa_required,
                review_required: t.review_required,
                depends_on_id: t.depends_on_id,
                createdAt: t.created_at,
                updatedAt: t.updated_at,
                projectId: t.project_id,
                assignees: [], // Will be hydrated on client
                assigneeIds: (() => {
                    if (t.assignee_ids && t.assignee_ids.length > 0) return t.assignee_ids;
                    if (t.task_assignees && t.task_assignees.length > 0) return t.task_assignees.map(a => String(a.user_id));
                    if (t.assignees && t.assignees.length > 0) return t.assignees.map(a => String(a.id));
                    return [];
                })(),
                userId: t.user_id,
                owner: owner ? owner : undefined,
                timeLogs: t.time_logs,
                totalHours: t.total_hours
            };
        });

        return tasks;
    } catch (error) {
        console.error("Error fetching tasks:", error);
        return [];
    }
});

export async function createTask(formData: FormData): Promise<{ success: true; task: ApiTask } | { success: false; error: string }> {
    const session = await auth();
    if (!session?.user?.accessToken) {
        return { success: false, error: "Unauthorized" };
    }

    const rawData: Record<string, unknown> = {
        name: formData.get('name'),
        description: formData.get('description'),
        status: formData.get('status') || 'TODO',
        priority: formData.get('priority') || 'medium',
        due_date: formData.get('dueDate') || null,
        qa_required: formData.get('qa_required') === 'true',
        review_required: formData.get('review_required') === 'true',
        depends_on_id: formData.get('depends_on_id') ? Number(formData.get('depends_on_id')) : null,
        project_id: formData.get('projectId') ? Number(formData.get('projectId')) : null,
        user_id: session.user?.id,
    };
    
    const assigneeIds = formData.get('assigneeIds');
    if (assigneeIds) {
        try {
            const parsedIds = JSON.parse(assigneeIds as string);
            rawData.assignees = parsedIds;
        } catch (e) {
            console.error("Error parsing assigneeIds", e);
        }
    }

    try {
        const response = await fetch(`${API_BASE_URL}/tasks`, {
            method: 'POST',
            headers: { ...(await getSessionHeaders())! },
            body: JSON.stringify(rawData)
        });

        if (!response.ok) {
            if (await handleUnauthorizedResponse(response)) return { success: false, error: "Session expired" };
            const forbiddenMsg = await handleForbiddenResponse(response);
            if (forbiddenMsg) return { success: false, error: forbiddenMsg };
            const error = await response.text();
            console.error("Failed to create task:", error);
            return { success: false, error: "Failed to create task" };
        }

        const apiTask: ApiTask = await response.json();
        revalidatePath('/tasks');
        revalidateTag('tasks', 'max');
        revalidateTag('projects', 'max');
        return { success: true, task: apiTask };
    } catch (error) {
        console.error("Error creating task:", error);
        return { success: false, error: "Failed to create task" };
    }
}

export async function updateTask(formData: FormData): Promise<{ success: true; task: ApiTask } | { success: false; error: string }> {
    const session = await auth();
    if (!session?.user?.accessToken) {
        return { success: false, error: "Unauthorized" };
    }

    const id = formData.get('id');
    if (!id) return { success: false, error: "Missing task ID" };
    const taskId = Number(id);

    const rawData: Record<string, unknown> = {};
    const name = formData.get('name'); if (name !== null) rawData.name = name;
    const description = formData.get('description'); if (description !== null) rawData.description = description;
    const status = formData.get('status'); if (status !== null) rawData.status = status;
    const priority = formData.get('priority'); if (priority !== null) rawData.priority = priority;
    
    const dueDate = formData.get('dueDate'); 
    if (dueDate !== null) {
        rawData.due_date = dueDate === '' ? null : dueDate;
    }

    const qa_required = formData.get('qa_required'); 
    if (qa_required !== null) {
        rawData.qa_required = qa_required === 'true';
    }

    const review_required = formData.get('review_required'); 
    if (review_required !== null) {
        rawData.review_required = review_required === 'true';
    }

    const depends_on_id = formData.get('depends_on_id'); 
    if (depends_on_id !== null) {
        rawData.depends_on_id = depends_on_id === '' ? null : Number(depends_on_id);
    }
    
    const projectId = formData.get('projectId'); 
    if (projectId !== null) {
        rawData.project_id = projectId === '' ? null : Number(projectId);
    }

    const assigneeIds = formData.get('assigneeIds');
    if (assigneeIds !== null) {
        try {
            const parsedIds = JSON.parse(assigneeIds as string);
            rawData.assignees = parsedIds;
        } catch (e) {
             console.error("Error parsing assigneeIds", e);
        }
    }

    try {
        const response = await fetch(`${API_BASE_URL}/tasks/${taskId}`, {
            method: 'PATCH',
            headers: { ...(await getSessionHeaders())! },
            body: JSON.stringify(rawData)
        });

        if (!response.ok) {
            if (await handleUnauthorizedResponse(response)) return { success: false, error: "Session expired" };
            const forbiddenMsg = await handleForbiddenResponse(response);
            if (forbiddenMsg) return { success: false, error: forbiddenMsg };
            const errorText = await response.text();
            console.error("Failed to update task. Status:", response.status, "Error:", errorText);
            return { success: false, error: "Failed to update task" };
        }

        const apiTask: ApiTask = await response.json();
        revalidatePath('/tasks');
        revalidateTag('tasks', 'max');
        revalidateTag('projects', 'max');
        return { success: true, task: apiTask };
    } catch (error) {
        console.error("Error updating task:", error);
        return { success: false, error: "Failed to update task" };
    }
}

export async function deleteTask(formData: FormData): Promise<ActionResult> {
    const session = await auth();
    if (!session?.user?.accessToken) {
        return { success: false, error: "Unauthorized" };
    }

    const id = formData.get('id');
    if (!id) return { success: false, error: "Missing task ID" };

    try {
        const response = await fetch(`${API_BASE_URL}/tasks/${id}`, {
            method: 'DELETE',
            headers: { ...(await getSessionHeaders())! },
        });

        if (!response.ok) {
            if (await handleUnauthorizedResponse(response)) return { success: false, error: "Session expired" };
            const forbiddenMsg = await handleForbiddenResponse(response);
            if (forbiddenMsg) return { success: false, error: forbiddenMsg };
            console.error("Failed to delete task:", await response.text());
            return { success: false, error: "Failed to delete task" };
        }

        revalidatePath('/tasks');
        revalidateTag('tasks', 'max');
        revalidateTag('projects', 'max');
        return { success: true };
    } catch (error) {
        console.error("Error deleting task:", error);
        return { success: false, error: "Failed to delete task" };
    }
}

export async function updateTaskStatus(taskId: number, status: string): Promise<ActionResult> {
     const session = await auth();
    if (!session?.user?.accessToken) {
        return { success: false, error: "Unauthorized" };
    }

    try {
        const response = await fetch(`${API_BASE_URL}/tasks/${taskId}`, {
            method: 'PATCH',
            headers: { ...(await getSessionHeaders())! },
            body: JSON.stringify({ status })
        });

        if (!response.ok) {
            if (await handleUnauthorizedResponse(response)) return { success: false, error: "Session expired" };
            const forbiddenMsg = await handleForbiddenResponse(response);
            if (forbiddenMsg) return { success: false, error: forbiddenMsg };
            console.error("Failed to update task status:", await response.text());
            return { success: false, error: "Failed to update task status" };
        }

        revalidatePath('/tasks');
        revalidateTag('tasks', 'max');
        revalidateTag('projects', 'max');
        return { success: true };
    } catch (error) {
        console.error("Error updating task status:", error);
        return { success: false, error: "Failed to update task status" };
    }
}

export async function startTaskTimer(taskId: number): Promise<ActionResult<any>> {
    const session = await auth();
    if (!session?.user?.accessToken) return { success: false, error: "Unauthorized" };

    try {
        const response = await fetch(`${API_BASE_URL}/tasks/${taskId}/timer/start`, {
            method: 'POST',
            headers: { ...(await getSessionHeaders())! },
        });

        if (!response.ok) {
            if (await handleUnauthorizedResponse(response)) return { success: false, error: "Session expired" };
            const forbiddenMsg = await handleForbiddenResponse(response);
            if (forbiddenMsg) return { success: false, error: forbiddenMsg };
            return { success: false, error: await response.text() };
        }
        
        revalidatePath('/tasks');
        return { success: true, data: await response.json() };
    } catch (error) {
        return { success: false, error: "Timer start failed" };
    }
}

export async function pauseTaskTimer(taskId: number): Promise<ActionResult<any>> {
    const session = await auth();
    if (!session?.user?.accessToken) return { success: false, error: "Unauthorized" };

    try {
        const response = await fetch(`${API_BASE_URL}/tasks/${taskId}/timer/pause`, {
            method: 'POST',
            headers: { ...(await getSessionHeaders())! },
        });

        if (!response.ok) {
            if (await handleUnauthorizedResponse(response)) return { success: false, error: "Session expired" };
            const forbiddenMsg = await handleForbiddenResponse(response);
            if (forbiddenMsg) return { success: false, error: forbiddenMsg };
            return { success: false, error: await response.text() };
        }
        
        revalidatePath('/tasks');
        return { success: true, data: await response.json() };
    } catch (error) {
        return { success: false, error: "Timer pause failed" };
    }
}

export async function stopTaskTimer(taskId: number): Promise<ActionResult<any>> {
    const session = await auth();
    if (!session?.user?.accessToken) return { success: false, error: "Unauthorized" };

    try {
        const response = await fetch(`${API_BASE_URL}/tasks/${taskId}/timer/stop`, {
            method: 'POST',
            headers: { ...(await getSessionHeaders())! },
        });

        if (!response.ok) {
            if (await handleUnauthorizedResponse(response)) return { success: false, error: "Session expired" };
            const forbiddenMsg = await handleForbiddenResponse(response);
            if (forbiddenMsg) return { success: false, error: forbiddenMsg };
            return { success: false, error: await response.text() };
        }
        
        revalidatePath('/tasks');
        return { success: true, data: await response.json() };
    } catch (error) {
        return { success: false, error: "Timer stop failed" };
    }
}

export async function batchUpdateTaskStatus(taskIds: number[], status: string): Promise<ActionResult> {
    const session = await auth();
    if (!session?.user?.accessToken) {
        return { success: false, error: "Unauthorized" };
    }

    const headers = { ...(await getSessionHeaders())! };
    try {
        const results = await Promise.all(
            taskIds.map(id =>
                fetch(`${API_BASE_URL}/tasks/${id}`, {
                    method: 'PATCH',
                    headers,
                    body: JSON.stringify({ status })
                })
            )
        );

        const allOk = results.every(res => res.ok);
        
        revalidatePath('/tasks');
        revalidateTag('tasks', 'max');
        revalidateTag('projects', 'max');

        if (allOk) {
            return { success: true };
        } else {
            const errorRes = results.find(r => !r.ok);
            if (errorRes) {
                if (await handleUnauthorizedResponse(errorRes)) return { success: false, error: "Session expired" };
                const forbiddenMsg = await handleForbiddenResponse(errorRes);
                if (forbiddenMsg) return { success: false, error: forbiddenMsg };
            }
            return { success: false, error: "Some tasks failed to update" };
        }
    } catch (error) {
        console.error("Error in batch update:", error);
        return { success: false, error: "Batch update failed" };
    }
}
