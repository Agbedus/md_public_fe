'use client';

import React, { useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { FiX, FiFolder, FiChevronRight } from 'react-icons/fi';
import { Portal } from '@/components/ui/portal';
import { useOrgPath } from '@/hooks/use-org-path';
import type { User } from '@/types/user';
import type { Project } from '@/types/project';
import type { Task } from '@/types/task';
import { statusMapping } from '@/types/project';

interface UserProjectsModalProps {
  user: User;
  projects: Project[];
  tasks: Task[];
  onClose: () => void;
}

type TabKey = 'active' | 'completed';

const statusToneClass: Record<Project['status'], string> = {
  planning: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
  in_progress: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
  completed: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  on_hold: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
};

export function UserProjectsModal({ user, projects, tasks, onClose }: UserProjectsModalProps) {
  const [tab, setTab] = useState<TabKey>('active');
  const { path: orgPath } = useOrgPath();

  // "Their projects" — owned, managed, or containing work assigned to them.
  // Any one of those is a real stake in the project, so union rather than
  // requiring all three.
  const userProjects = useMemo(() => {
    const projectIdsFromTasks = new Set(
      tasks
        .filter((t) =>
          t.assigneeIds?.some((id) => String(id) === String(user.id)) ||
          t.assignees?.some((a) => String(a.user.id) === String(user.id)),
        )
        .map((t) => t.projectId)
        .filter((id): id is number => id != null),
    );

    return projects.filter((p) =>
      p.ownerId === user.id ||
      p.managers?.some((m) => m.user.id === user.id) ||
      projectIdsFromTasks.has(p.id),
    );
  }, [projects, tasks, user.id]);

  const active = userProjects.filter((p) => p.status !== 'completed');
  const completed = userProjects.filter((p) => p.status === 'completed');
  const shown = tab === 'active' ? active : completed;

  const initial = (user.fullName || user.email || '?').charAt(0).toUpperCase();

  return (
    <Portal>
      <div className="fixed inset-0 z-[140] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-white/60 dark:bg-black/60 backdrop-blur-md" onClick={onClose} />
        <div className="relative w-full max-w-lg bg-background border border-card-border rounded-2xl shadow-xl overflow-hidden max-h-[85vh] flex flex-col">
          <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-card-border shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              {user.avatarUrl ? (
                <Image src={user.avatarUrl} alt={user.fullName || user.email} width={36} height={36} className="rounded-xl border border-card-border w-9 h-9 object-cover shrink-0" />
              ) : (
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 font-bold border border-emerald-500/20 text-sm shrink-0">
                  {initial}
                </div>
              )}
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-foreground truncate">{user.fullName || user.email.split('@')[0]}</h3>
                <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest mt-0.5">Projects</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-text-muted hover:text-foreground hover:bg-foreground/[0.05] transition-all shrink-0"
              aria-label="Close"
            >
              <FiX size={16} />
            </button>
          </div>

          <div className="px-5 pt-4 shrink-0">
            <div role="tablist" aria-label="Project status" className="inline-flex items-center gap-0.5 p-1 rounded-xl bg-foreground/[0.04] border border-card-border">
              <button
                type="button" role="tab" aria-selected={tab === 'active'} onClick={() => setTab('active')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${tab === 'active' ? 'bg-card text-foreground shadow-sm' : 'text-text-muted hover:text-foreground'}`}
              >
                Active <span className="font-numbers">({active.length})</span>
              </button>
              <button
                type="button" role="tab" aria-selected={tab === 'completed'} onClick={() => setTab('completed')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${tab === 'completed' ? 'bg-card text-foreground shadow-sm' : 'text-text-muted hover:text-foreground'}`}
              >
                Completed <span className="font-numbers">({completed.length})</span>
              </button>
            </div>
          </div>

          <div className="p-5 space-y-2 overflow-y-auto">
            {shown.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <span className="grid h-12 w-12 place-items-center rounded-xl bg-foreground/[0.04] text-text-muted"><FiFolder size={20} /></span>
                <p className="mt-3 text-sm text-text-muted">
                  No {tab === 'active' ? 'active' : 'completed'} projects for {user.fullName || user.email.split('@')[0]}.
                </p>
              </div>
            ) : (
              shown.map((project) => (
                <Link
                  key={project.id}
                  href={orgPath(`/projects/${project.id}`)}
                  onClick={onClose}
                  className="flex items-center gap-3 rounded-xl border border-card-border px-3.5 py-3 hover:bg-foreground/[0.03] hover:border-foreground/10 transition-colors group"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">{project.name}</p>
                    {project.description && (
                      <p className="text-xs text-text-muted truncate mt-0.5">{project.description}</p>
                    )}
                  </div>
                  <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusToneClass[project.status]}`}>
                    {statusMapping[project.status] || project.status}
                  </span>
                  <FiChevronRight className="shrink-0 text-text-muted group-hover:text-foreground transition-colors" size={14} />
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </Portal>
  );
}
