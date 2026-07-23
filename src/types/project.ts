import { User } from './user';
import { Task } from './task';

export type Project = {
    id: number;
    name: string;
    key: string | null;
    description: string | null;
    status: "planning" | "in_progress" | "completed" | "on_hold";
    priority: "low" | "medium" | "high";
    tags: string[]; // API: JSON string "tags"

    ownerId: string | null; // API: owner_id
    managers?: { user: User }[]; 
    tasks?: Task[];
    clientId: string | null; // API: client_id

    startDate: string | null; // API: start_date
    endDate: string | null; // API: end_date

    budget: number | null;
    spent: number | null;
    currency: string | null;
    billingType: "time_and_materials" | "fixed_price" | "non_billable" | null; // API: billing_type

    isArchived: number | null; // API: is_archived (0 or 1)
    createdAt?: string | null; // API: created_at
    updatedAt?: string | null; // API: updated_at
};

export type ProjectFormData = Omit<Project, 'id' | 'createdAt' | 'updatedAt'>;

export function parseProjectFormData(formData: FormData): Partial<Project> {
    const data = Object.fromEntries(formData);
    return {
        name: data.name as string,
        key: data.key as string,
        description: data.description as string,
        status: data.status as Project['status'],
        priority: data.priority as Project['priority'],
        tags: data.tags ? (data.tags as string).split(',').map(t => t.trim()).filter(t => t !== '') : [],
        
        ownerId: data.ownerId as string,
        clientId: data.clientId as string,

        startDate: data.startDate as string,
        endDate: data.endDate as string,

        budget: data.budget ? Number(data.budget) : null,
        spent: data.spent ? Number(data.spent) : 0,
        currency: data.currency as string,
        billingType: data.billingType as Project['billingType'],

        isArchived: data.isArchived ? Number(data.isArchived) : 0,
    };
}

export const statusMapping: { [key: string]: string } = {
    planning: "Planning",
    in_progress: "In Progress",
    completed: "Completed",
    on_hold: "On Hold",
};

export const priorityMapping: { [key: string]: string } = {
    low: "Low",
    medium: "Medium",
    high: "High",
};

export const billingTypeMapping: { [key: string]: string } = {
    time_and_materials: "Time & Materials",
    fixed_price: "Fixed Price",
    non_billable: "Non-Billable",
};
