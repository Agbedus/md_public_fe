import { Task } from "@/types/task";
import { User } from "@/types/user";
import { Project } from "@/types/project";
import { Note } from "@/types/note";
import { Client } from "@/types/client";
import { format } from "date-fns";

/**
 * Tasks Optimistic
 */
export function createOptimisticTask(formData: FormData, users: User[]): Task {
  return {
    id: -Math.floor(Math.random() * 1000000), // Temporary ID
    name: (formData.get("name") as string) || "New Task",
    description: (formData.get("description") as string) || "",
    status: (formData.get("status") as Task["status"]) || "TODO",
    priority: (formData.get("priority") as Task["priority"]) || "medium",
    dueDate: (formData.get("dueDate") as string) || "",
    projectId: formData.get("projectId") ? Number(formData.get("projectId")) : null,
    assignees: (() => {
      const idsJson = formData.get("assigneeIds") as string;
      if (!idsJson) return [];
      try {
        const ids = JSON.parse(idsJson);
        return users.filter((u) => ids.includes(u.id)).map((user) => ({ user }));
      } catch {
        return [];
      }
    })(),
    assigneeIds: (() => {
      const idsJson = formData.get("assigneeIds") as string;
      try {
        return idsJson ? JSON.parse(idsJson) : [];
      } catch {
        return [];
      }
    })(),
    qa_required: formData.get("qa_required") === "true",
    review_required: formData.get("review_required") === "true",
    depends_on_id: formData.get("depends_on_id") ? Number(formData.get("depends_on_id")) : null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function updateOptimisticTask(existingTask: Task, formData: FormData, users: User[]): Task {
  return {
    ...existingTask,
    name: (formData.get("name") as string) || existingTask.name,
    description: (formData.get("description") as string) || existingTask.description,
    status: (formData.get("status") as Task["status"]) || existingTask.status,
    priority: (formData.get("priority") as Task["priority"]) || existingTask.priority,
    dueDate: (formData.get("dueDate") as string) || existingTask.dueDate,
    projectId: formData.get("projectId") ? Number(formData.get("projectId")) : existingTask.projectId,
    assignees: (() => {
      const idsJson = formData.get("assigneeIds") as string;
      if (!idsJson) return existingTask.assignees;
      try {
        const ids = JSON.parse(idsJson);
        return users.filter((u) => ids.includes(u.id)).map((user) => ({ user }));
      } catch {
        return existingTask.assignees;
      }
    })(),
    assigneeIds: (() => {
      const idsJson = formData.get("assigneeIds") as string;
      try {
        return idsJson ? JSON.parse(idsJson) : existingTask.assigneeIds;
      } catch {
        return existingTask.assigneeIds;
      }
    })(),
    qa_required: formData.get("qa_required") !== null ? formData.get("qa_required") === "true" : existingTask.qa_required,
    review_required:
      formData.get("review_required") !== null ? formData.get("review_required") === "true" : existingTask.review_required,
  };
}

/**
 * Projects Optimistic
 */
export function createOptimisticProject(formData: FormData): Project {
  return {
    id: -Math.floor(Math.random() * 1000000), // Random negative ID
    name: (formData.get("name") as string) || "New Project",
    key: (formData.get("key") as string) || "KEY",
    status: (formData.get("status") as Project["status"]) || "planning",
    priority: (formData.get("priority") as Project["priority"]) || "medium",
    ownerId: (formData.get("ownerId") as string) || "",
    clientId: (formData.get("clientId") as string) || "",
    description: (formData.get("description") as string) || "",
    tags: formData.get("tags")
      ? (formData.get("tags") as string)
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean)
      : [],
    startDate: (formData.get("startDate") as string) || format(new Date(), "yyyy-MM-dd"),
    endDate: (formData.get("endDate") as string) || null,
    budget: formData.get("budget") ? Number(formData.get("budget")) : null,
    spent: 0,
    currency: (formData.get("currency") as string) || "USD",
    billingType: (formData.get("billingType") as Project["billingType"]) || null,
    isArchived: 0,
    tasks: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function updateOptimisticProject(existingProject: Project, formData: FormData): Project {
  return {
    ...existingProject,
    name: (formData.get("name") as string) || existingProject.name,
    key: (formData.get("key") as string) || existingProject.key,
    status: (formData.get("status") as Project["status"]) || existingProject.status,
    priority: (formData.get("priority") as Project["priority"]) || existingProject.priority,
    ownerId: (formData.get("ownerId") as string) || existingProject.ownerId,
    clientId: (formData.get("clientId") as string) || existingProject.clientId,
    description: (formData.get("description") as string) || existingProject.description,
    tags: formData.get("tags")
      ? (formData.get("tags") as string)
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean)
      : existingProject.tags,
    budget: formData.get("budget") ? Number(formData.get("budget")) : existingProject.budget,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Notes Optimistic
 */
export function createOptimisticNote(formData: FormData): Note {
  return {
    id: -Math.floor(Math.random() * 1000000),
    title: (formData.get("title") as string) || "Untitled Note",
    content: (formData.get("content") as string) || "",
    priority: (formData.get("priority") as Note["priority"]) || "low",
    type: (formData.get("type") as Note["type"]) || "note",
    tags: (formData.get("tags") as string) || "",
    is_pinned: 0,
    is_archived: 0,
    is_favorite: 0,
    task_id: formData.get("task_id") ? Number(formData.get("task_id")) : null,
    user_id: (formData.get("user_id") as string) || "",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

export function updateOptimisticNote(existingNote: Note, formData: FormData): Note {
  return {
    ...existingNote,
    title: (formData.get("title") as string) || existingNote.title,
    content: (formData.get("content") as string) || existingNote.content,
    priority: (formData.get("priority") as Note["priority"]) || existingNote.priority,
    type: (formData.get("type") as Note["type"]) || existingNote.type,
    tags: (formData.get("tags") as string) || existingNote.tags,
    task_id: formData.get("task_id") ? Number(formData.get("task_id")) : existingNote.task_id,
    updated_at: new Date().toISOString(),
  };
}

/**
 * Clients Optimistic
 */
export function createOptimisticClient(formData: FormData): Client {
  return {
    id: String(-Math.floor(Math.random() * 1000000)),
    companyName: (formData.get("companyName") as string) || "New Client",
    contactPersonName: (formData.get("contactPersonName") as string) || "",
    contactEmail: (formData.get("contactEmail") as string) || "",
    websiteUrl: (formData.get("websiteUrl") as string) || "",
    createdAt: new Date().toISOString(),
  };
}

export function updateOptimisticClient(existingClient: Client, formData: FormData): Client {
  return {
    ...existingClient,
    companyName: (formData.get("companyName") as string) || existingClient.companyName,
    contactPersonName: (formData.get("contactPersonName") as string) || existingClient.contactPersonName,
    contactEmail: (formData.get("contactEmail") as string) || existingClient.contactEmail,
    websiteUrl: (formData.get("websiteUrl") as string) || existingClient.websiteUrl,
  };
}
