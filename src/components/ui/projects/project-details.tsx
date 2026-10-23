"use client";

import { useEffect, useRef, useEffectEvent } from "react";
import type { Project } from "@/types/project";
import type { Note } from "@/types/note";
import type { User } from "@/types/user";
import type { Client } from "@/types/client";
import type { PermissionSubjectProps } from "@/lib/permission-subject";
import ProjectDashboardClient from "./project-dashboard-client";

interface ProjectDetailsProps {
  project: Project;
  users: User[];
  clients: Client[];
  notes: Note[];
  projects: Project[];
  subject?: PermissionSubjectProps | null;
  onClose: () => void;
}

export function ProjectDetails({
  project,
  users,
  clients,
  notes,
  projects,
  subject,
  onClose,
}: ProjectDetailsProps) {
  const panel = useRef<HTMLDivElement>(null);
  const closePanel = useEffectEvent(onClose);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    panel.current?.focus();
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape" && event.target === panel.current)
        closePanel();
    };
    window.addEventListener("keydown", close);
    return () => {
      window.removeEventListener("keydown", close);
      previous?.focus();
    };
  }, []);
  const current = projects.find((item) => item.id === project.id) ?? project;
  return (
    <div
      ref={panel}
      tabIndex={-1}
      role="dialog"
      aria-label={`${current.name} project details`}
      className="fixed inset-y-0 right-0 z-[100] w-full max-w-6xl overflow-y-auto border-l border-card-border bg-background shadow-2xl outline-none"
    >
      <ProjectDashboardClient
        key={current.id}
        project={current}
        tasks={current.tasks ?? []}
        notes={notes}
        users={users}
        clients={clients}
        allProjects={projects}
        subject={subject}
        onClose={onClose}
      />
    </div>
  );
}
