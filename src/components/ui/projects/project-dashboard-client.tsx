"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  FiArrowLeft,
  FiCalendar,
  FiCheckSquare,
  FiClock,
  FiEdit2,
  FiFileText,
  FiUsers,
  FiX,
  FiMaximize2,
} from "react-icons/fi";
import type { Project } from "@/types/project";
import {
  statusMapping,
  priorityMapping,
  billingTypeMapping,
} from "@/types/project";
import type { Task } from "@/types/task";
import type { Note } from "@/types/note";
import type { User } from "@/types/user";
import type { Client } from "@/types/client";
import type { PermissionSubjectProps } from "@/lib/permission-subject";
import { canModifyRecord } from "@/lib/org-permissions";
import { useOrgSlug } from "@/hooks/use-org-slug";
import { useTasks } from "@/hooks/use-tasks";
import { useProjects } from "@/hooks/use-projects";
import TasksPageClient from "@/components/ui/tasks/tasks-page-client";
import NoteCard from "@/components/ui/notes/note-card";
import NoteFormModal from "@/components/ui/notes/NoteFormModal";
import { ProjectFormFields } from "./project-form-fields";
import { FormWizard, FormStepNavigation } from "@/components/ui/form-wizard";
import { TabPill } from "@/components/ui/tab-pill";
import UserAvatarGroup from "@/components/ui/user-avatar-group";
import { updateProject } from "@/app/(dashboard)/[orgSlug]/projects/actions";
import {
  updateNote,
  deleteNote,
} from "@/app/(dashboard)/[orgSlug]/notes/actions";
import { updateOptimisticNote } from "@/lib/optimistic-utils";
import { useConfirm } from "@/providers/confirmation-provider";
import { toast } from "@/lib/toast";

interface Props {
  project: Project;
  tasks: Task[];
  notes: Note[];
  users: User[];
  clients: Client[];
  allProjects: Project[];
  subject?: PermissionSubjectProps | null;
  onClose?: () => void;
}
const dateLabel = (value?: string | null) =>
  value && Number.isFinite(new Date(value).getTime())
    ? new Intl.DateTimeFormat(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(new Date(value))
    : "Not set";
const noteTypes: Note["type"][] = [
  "note",
  "checklist",
  "todo",
  "journal",
  "meeting",
  "idea",
  "link",
  "code",
  "bookmark",
  "sketch",
];

export default function ProjectDashboardClient({
  project: initialProject,
  tasks: initialTasks,
  notes: initialNotes,
  users,
  clients,
  allProjects,
  subject,
  onClose,
}: Props) {
  const slug = useOrgSlug();
  const orgPath = (path: string) => (slug ? `/${slug}${path}` : path);
  const confirm = useConfirm();
  const { mutate: refreshProjects } = useProjects({
    initialProjects: allProjects,
  });
  const [activeView, setActiveView] = useState<"overview" | "tasks" | "notes">(
    "overview",
  );
  const [project, setProject] = useState(initialProject);
  // Keep edits visible immediately, then reconcile fresh server props after navigation.
  const [notes, setNotes] = useState(initialNotes);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setProject(initialProject));
    return () => cancelAnimationFrame(frame);
  }, [initialProject]);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setNotes(initialNotes));
    return () => cancelAnimationFrame(frame);
  }, [initialNotes]);
  const { tasks } = useTasks({ projectId: project.id, users, initialTasks });
  const projectTasks = tasks.filter((task) => task.projectId === project.id);
  const taskIds = new Set(
    [...initialTasks, ...projectTasks].map((task) => task.id),
  );
  const projectNotes = notes.filter(
    (note) => note.task_id != null && taskIds.has(note.task_id),
  );
  const memberIds = new Set<string>([
    ...(project.ownerId ? [project.ownerId] : []),
    ...(project.managers ?? []).map((item) => item.user.id),
  ]);
  projectTasks.forEach((task) => {
    if (task.userId) memberIds.add(task.userId);
    (task.assigneeIds ?? []).forEach((id) => memberIds.add(id));
    (task.assignees ?? []).forEach((item) => memberIds.add(item.user.id));
  });
  const members = users.filter((user) => memberIds.has(user.id));
  const owner = users.find((user) => user.id === project.ownerId);
  const client = clients.find((item) => item.id === project.clientId);
  const done = projectTasks.filter((task) => task.status === "DONE").length;
  const progress = projectTasks.length
    ? Math.round((done / projectTasks.length) * 100)
    : 0;
  const hours = projectTasks.reduce(
    (sum, task) => sum + (task.totalHours ?? 0),
    0,
  );
  const [editingProject, setEditingProject] = useState(false);
  const [savingProject, setSavingProject] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [savingNote, setSavingNote] = useState(false);
  const money = (value: number) => {
    try {
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: project.currency || "USD",
        maximumFractionDigits: 0,
      }).format(value);
    } catch {
      return `${value.toLocaleString()} ${project.currency || ""}`.trim();
    }
  };

  // Optimistic note changes roll back if persistence fails. Task changes use the shared table's SWR cache.
  const handleNoteUpdate = async (data: FormData) => {
    const previous = notes;
    const id = Number(data.get("id"));
    setNotes((list) =>
      list.map((note) =>
        note.id === id ? updateOptimisticNote(note, data) : note,
      ),
    );
    try {
      const result = await updateNote(data);
      if (!result.success) {
        setNotes(previous);
        toast.error(result.error || "Could not update note");
      }
      return result;
    } catch {
      setNotes(previous);
      toast.error("Could not update note");
      return { success: false, error: "Could not update note" };
    }
  };
  const handleNoteDelete = async (data: FormData) => {
    if (
      !(await confirm({
        title: "Delete note",
        message: "Delete this note? This cannot be undone.",
        confirmText: "Delete note",
        type: "danger",
      }))
    )
      return { success: false, error: "Cancelled" };
    const previous = notes;
    setNotes((list) =>
      list.filter((note) => note.id !== Number(data.get("id"))),
    );
    try {
      const result = await deleteNote(data);
      if (!result.success) {
        setNotes(previous);
        toast.error(result.error || "Could not delete note");
      }
      return result;
    } catch {
      setNotes(previous);
      toast.error("Could not delete note");
      return { success: false, error: "Could not delete note" };
    }
  };

  return (
    <div className="min-w-0 bg-background text-foreground">
      <header className="flex items-center justify-between gap-3 border-b border-card-border px-4 py-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          {!onClose && (
            <Link
              href={orgPath("/projects")}
              aria-label="Back to projects"
              className="md-btn md-btn-secondary !px-3"
            >
              <FiArrowLeft />
            </Link>
          )}
          <div className="min-w-0">
            <p className="mb-1 text-xs text-text-muted">
              Project{project.key ? ` · ${project.key}` : ""}
            </p>
            <h1 className="truncate text-xl font-semibold tracking-tight">
              {project.name}
            </h1>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {canModifyRecord(subject, project.ownerId) && (
            <button
              type="button"
              onClick={() => setEditingProject(true)}
              className="md-btn md-btn-secondary !px-3"
              aria-label="Edit project"
            >
              <FiEdit2 />
              <span className="hidden sm:inline">Edit project</span>
            </button>
          )}
          {onClose && (
            <>
              <Link
                href={orgPath(`/projects/${project.id}`)}
                aria-label="Open full project"
                className="md-btn md-btn-secondary !px-3"
              >
                <FiMaximize2 />
              </Link>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close project"
                className="md-btn md-btn-secondary !px-3"
              >
                <FiX />
              </button>
            </>
          )}
        </div>
      </header>
      <div className="mx-auto max-w-[1600px] space-y-6 p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div
            className="flex w-fit gap-1 rounded-full bg-foreground/[0.04] p-1"
            role="tablist"
            aria-label="Project views"
          >
            {(["overview", "tasks", "notes"] as const).map((view) => (
              <button
                key={view}
                type="button"
                role="tab"
                id={`project-${project.id}-${view}-tab`}
                aria-selected={activeView === view}
                aria-controls={`project-${project.id}-panel`}
                onClick={() => setActiveView(view)}
                className={`relative isolate min-h-10 rounded-full px-4 text-sm font-medium capitalize transition-colors ${activeView === view ? "text-on-ink" : "text-text-muted hover:text-foreground"}`}
              >
                {activeView === view && <TabPill />}
                {view}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3 text-xs text-text-muted">
            <span className="rounded-full bg-accent/10 px-3 py-1.5 text-accent-text">
              {statusMapping[project.status]}
            </span>
            <span>{priorityMapping[project.priority]} priority</span>
          </div>
        </div>
        <div
          id={`project-${project.id}-panel`}
          role="tabpanel"
          aria-labelledby={`project-${project.id}-${activeView}-tab`}
          className="space-y-6"
        >
          {activeView === "overview" && (
            <>
              <div className="grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
                <section className="space-y-5 rounded-[28px] border border-card-border bg-card p-5 sm:p-6">
                  <div>
                    <h2 className="text-base font-semibold">
                      About this project
                    </h2>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-text-secondary">
                      {project.description ||
                        "Add a description to give your team context."}
                    </p>
                  </div>
                  {!!project.tags?.length && (
                    <div className="flex flex-wrap gap-2">
                      {project.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-foreground/[0.04] px-3 py-1 text-xs text-text-muted"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  <dl className="grid gap-4 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="text-xs text-text-muted">Project owner</dt>
                      <dd className="mt-1">
                        {owner?.fullName || owner?.email || "Unassigned"}
                      </dd>
                    </div>
                    {client && (
                      <div>
                        <dt className="text-xs text-text-muted">Client</dt>
                        <dd className="mt-1">{client.companyName}</dd>
                      </div>
                    )}
                    <div>
                      <dt className="flex items-center gap-2 text-xs text-text-muted">
                        <FiCalendar />
                        Start date
                      </dt>
                      <dd className="mt-1">{dateLabel(project.startDate)}</dd>
                    </div>
                    <div>
                      <dt className="flex items-center gap-2 text-xs text-text-muted">
                        <FiCalendar />
                        Due date
                      </dt>
                      <dd className="mt-1">{dateLabel(project.endDate)}</dd>
                    </div>
                  </dl>
                </section>
                <section className="space-y-5 rounded-[28px] border border-card-border bg-card p-5 sm:p-6">
                  <h2 className="flex items-center gap-2 text-base font-semibold">
                    <FiCheckSquare className="text-accent-text" />
                    Project progress
                  </h2>
                  <div>
                    <p className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="text-text-muted">
                        {done} of {projectTasks.length} tasks done
                      </span>
                      <span className="font-numbers text-xl font-semibold">
                        {progress}%
                      </span>
                    </p>
                    <div
                      role="progressbar"
                      aria-label="Completed tasks"
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={progress}
                      className="mt-3 h-2 overflow-hidden rounded-full bg-foreground/[0.06]"
                    >
                      <div
                        className="h-full rounded-full bg-accent transition-[width] duration-300 motion-reduce:transition-none"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-text-muted">
                    <span className="flex items-center gap-2">
                      <FiClock />
                      {hours.toFixed(1)} hours logged
                    </span>
                    <span className="flex items-center gap-2">
                      <FiUsers />
                      {members.length} people
                    </span>
                  </div>
                  {members.length > 0 && (
                    <UserAvatarGroup users={members} limit={8} />
                  )}
                  {(project.budget != null ||
                    project.spent != null ||
                    project.billingType) && (
                    <dl className="grid grid-cols-2 gap-3 border-t border-card-border pt-4 text-sm">
                      {project.budget != null && (
                        <div>
                          <dt className="text-xs text-text-muted">Budget</dt>
                          <dd className="mt-1 font-numbers">
                            {money(project.budget)}
                          </dd>
                        </div>
                      )}
                      {project.spent != null && (
                        <div>
                          <dt className="text-xs text-text-muted">Spent</dt>
                          <dd className="mt-1 font-numbers">
                            {money(project.spent)}
                          </dd>
                        </div>
                      )}
                      {project.billingType && (
                        <div className="col-span-2 text-xs text-text-muted">
                          {billingTypeMapping[project.billingType]}
                        </div>
                      )}
                    </dl>
                  )}
                </section>
              </div>
            </>
          )}
          {/* Keep the table mounted when switching views so filters and inline drafts survive. */}
          <section
            hidden={activeView === "notes"}
            className="space-y-4"
            aria-label="Project tasks"
          >
            <h2 className="text-base font-semibold">Project tasks</h2>
            <TasksPageClient
              embedded
              allTasks={initialTasks}
              users={users}
              projects={allProjects}
              projectId={project.id}
              currentUserId={subject?.id ?? undefined}
              currentUserRoles={subject?.roles ?? []}
              orgRole={subject?.orgRole ?? undefined}
            />
          </section>
          {activeView === "notes" && (
            <section className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-base font-semibold">Project notes</h2>
                <Link
                  href={orgPath("/notes")}
                  className="md-btn md-btn-secondary"
                >
                  <FiFileText />
                  Open journal
                </Link>
              </div>
              <p className="text-sm text-text-muted">
                Notes linked to this project’s tasks.
              </p>
              {projectNotes.length ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {projectNotes.map((note) => (
                    <NoteCard
                      key={note.id}
                      note={note}
                      viewMode="grid"
                      onNoteUpdate={handleNoteUpdate}
                      onNoteDelete={handleNoteDelete}
                      onEdit={setEditingNote}
                      canModify={canModifyRecord(subject, note.user_id)}
                    />
                  ))}
                </div>
              ) : (
                <p className="rounded-[24px] border border-dashed border-card-border p-8 text-center text-sm text-text-muted">
                  No notes linked to this project yet.
                </p>
              )}
            </section>
          )}
        </div>
      </div>
      {editingProject && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="project-edit-title"
        >
          <div className="max-h-[90dvh] w-full max-w-3xl overflow-y-auto rounded-[28px] border border-card-border bg-background p-5 sm:p-6">
            <h2 id="project-edit-title" className="mb-5 text-lg font-semibold">
              Edit project
            </h2>
            <FormWizard
              formId={`detail-project-form-${project.id}`}
              steps={["Project", "Schedule & budget", "People"]}
              busy={savingProject}
            >
              <form
                id={`detail-project-form-${project.id}`}
                onSubmit={async (event) => {
                  event.preventDefault();
                  const data = new FormData(event.currentTarget);
                  data.set("id", String(project.id));
                  setSavingProject(true);
                  try {
                    const result = await updateProject(data);
                    if (result.success) {
                      setProject(result.project);
                      setEditingProject(false);
                      void refreshProjects();
                      toast.success("Project updated");
                    } else
                      toast.error(result.error || "Could not update project");
                  } catch {
                    toast.error("Could not update project");
                  } finally {
                    setSavingProject(false);
                  }
                }}
                className="space-y-6"
              >
                <ProjectFormFields
                  defaultValues={project}
                  users={users}
                  clients={clients}
                />
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-card-border pt-4">
                  <button
                    type="button"
                    disabled={savingProject}
                    onClick={() => setEditingProject(false)}
                    className="md-btn md-btn-secondary"
                  >
                    Cancel
                  </button>
                  <FormStepNavigation>
                    <button
                      type="submit"
                      disabled={savingProject}
                      className="md-btn md-btn-primary"
                    >
                      {savingProject ? "Saving…" : "Save project"}
                    </button>
                  </FormStepNavigation>
                </div>
              </form>
            </FormWizard>
          </div>
        </div>
      )}
      {editingNote && (
        <NoteFormModal
          isOpen
          onClose={() => setEditingNote(null)}
          initialNote={editingNote}
          noteTypes={noteTypes}
          tasks={projectTasks}
          isSaving={savingNote}
          currentUser={{ id: subject?.id }}
          onSave={async (data) => {
            setSavingNote(true);
            try {
              const result = await handleNoteUpdate(data);
              if (result?.success) setEditingNote(null);
            } finally {
              setSavingNote(false);
            }
          }}
        />
      )}
    </div>
  );
}
