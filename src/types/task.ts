import { User } from './user';

export type TaskStatus = "TODO" | "IN_PROGRESS" | "QA" | "REVIEW" | "DONE";
export type TaskPriority = "low" | "medium" | "high";

export type TaskTimeLog = {
    id: number;
    task_id: number;
    user_id: string;
    start_time: string;
    end_time: string | null;
    duration: number | null;
    is_active: boolean;
};

export type Task = {
    id: number;
    name: string;
    description: string | null;
    dueDate: string | null; // API: due_date
    priority: TaskPriority;
    status: TaskStatus;
    qa_required: boolean;
    review_required: boolean;
    depends_on_id: number | null;
    createdAt?: string | null; // API: created_at
    updatedAt?: string | null; // API: updated_at
    assignees?: { user: User }[];
    assigneeIds?: string[];
    projectId?: number | null; // API: project_id
    userId?: string | null; // API: user_id
    owner?: User;
    timeLogs?: TaskTimeLog[];
    totalHours?: number; // API: total_hours
};

export type TaskFormData = Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'timeLogs' | 'totalHours'>;

export function parseTaskFormData(formData: FormData): Partial<Task> {
    const data = Object.fromEntries(formData);
    return {
        name: data.name as string,
        description: data.description as string || null,
        dueDate: (data.dueDate || data.due_date) as string || null,
        priority: (data.priority || 'medium') as TaskPriority,
        status: (data.status || 'TODO') as TaskStatus,
        qa_required: data.qa_required === "true",
        review_required: data.review_required === "true",
        depends_on_id: data.depends_on_id ? Number(data.depends_on_id) : null,
        assigneeIds: data.assigneeIds ? JSON.parse(data.assigneeIds as string) : [],
        projectId: (data.projectId || data.project_id) ? Number(data.projectId || data.project_id) : null,
    };
}


export const statusMapping: { [key in TaskStatus]: string } = {
    TODO: "To Do",
    IN_PROGRESS: "In Progress",
    QA: "Quality Assurance",
    REVIEW: "Review",
    DONE: "Done",
};

export const priorityMapping: { [key in TaskPriority]: string } = {
    low: "Low",
    medium: "Medium",
    high: "High",
};
