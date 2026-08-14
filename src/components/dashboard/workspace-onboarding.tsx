'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { FiCheck, FiChevronRight, FiCircle, FiSettings, FiX } from 'react-icons/fi';
import { InviteMemberModal } from '@/components/ui/invite-member-modal';
import { updateWorkspaceOnboarding } from '@/lib/org-actions';
import type { WorkspaceOnboardingStatus } from '@/lib/org-actions';

interface Props {
  organizationId: string;
  orgSlug: string;
  role?: string;
  initialMemberCount: number;
  inviteDismissed: boolean;
  checklistDismissed: boolean;
  status: WorkspaceOnboardingStatus;
}

export default function WorkspaceOnboarding({ organizationId, orgSlug, role, initialMemberCount, inviteDismissed, checklistDismissed, status }: Props) {
  const canInvite = role === 'owner' || role === 'admin';
  const [memberCount, setMemberCount] = useState(initialMemberCount);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [checklistHidden, setChecklistHidden] = useState(checklistDismissed);
  const [pipUsed, setPipUsed] = useState(false);
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (canInvite && memberCount <= 1 && !inviteDismissed && !status.invite) {
      const timer = window.setTimeout(() => setInviteOpen(true), 450);
      return () => window.clearTimeout(timer);
    }
  }, [canInvite, memberCount, inviteDismissed, status.invite]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setPipUsed(localStorage.getItem('md_pip_used') === 'true');
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const items = useMemo(() => [
    { label: 'Workspace created', done: true, href: `/${orgSlug}/settings` },
    { label: 'Invite your team', done: memberCount > 1 || status.invite, href: '#invite' },
    { label: 'Add an office location', done: status.office, href: `/${orgSlug}/attendance` },
    { label: 'Set an attendance policy', done: status.attendance_policy, href: `/${orgSlug}/attendance` },
    { label: 'Create your first project or task', done: status.first_work, href: `/${orgSlug}/tasks` },
    { label: 'Ask Pip about your workspace', done: pipUsed, href: `/${orgSlug}/assistant` },
  ], [memberCount, orgSlug, pipUsed, status]);

  const dismissInvite = () => {
    setInviteOpen(false);
    startTransition(() => { void updateWorkspaceOnboarding(organizationId, { invite_dismissed: true }); });
  };
  const dismissChecklist = () => {
    setChecklistHidden(true);
    startTransition(() => { void updateWorkspaceOnboarding(organizationId, { checklist_dismissed: true }); });
  };

  return (
    <>
      {!checklistHidden && (
        <section className="mb-8 overflow-hidden rounded-2xl border border-card-border bg-card">
          <div className="flex items-start justify-between gap-4 border-b border-card-border px-5 py-4 sm:px-6">
            <div><p className="text-sm font-semibold text-foreground">Set up your workspace</p><p className="mt-1 text-xs text-text-muted">A few small steps will make MyndDesk useful to your whole team.</p></div>
            <button onClick={dismissChecklist} aria-label="Dismiss setup checklist" className="rounded-lg p-1.5 text-text-muted hover:bg-foreground/[0.05] hover:text-foreground"><FiX /></button>
          </div>
          <div className="grid sm:grid-cols-2 xl:grid-cols-3">
            {items.map((item) => item.label === 'Invite your team' && canInvite ? (
              <button key={item.label} onClick={() => setInviteOpen(true)} className="flex items-center gap-3 border-b border-card-border px-5 py-4 text-left transition hover:bg-foreground/[0.025] sm:border-r xl:last:border-r-0">
                {item.done ? <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500"><FiCheck size={13} /></span> : <FiCircle className="text-text-muted/50" />}
                <span className={`min-w-0 flex-1 text-sm ${item.done ? 'text-text-muted line-through' : 'text-foreground'}`}>{item.label}</span><FiChevronRight className="text-text-muted" />
              </button>
            ) : (
              <Link key={item.label} href={item.href} className="flex items-center gap-3 border-b border-card-border px-5 py-4 transition hover:bg-foreground/[0.025] sm:border-r xl:last:border-r-0">
                {item.done ? <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500"><FiCheck size={13} /></span> : <FiCircle className="text-text-muted/50" />}
                <span className={`min-w-0 flex-1 text-sm ${item.done ? 'text-text-muted line-through' : 'text-foreground'}`}>{item.label}</span><FiChevronRight className="text-text-muted" />
              </Link>
            ))}
          </div>
          <div className="flex items-center gap-2 px-5 py-3 text-[11px] text-text-muted"><FiSettings /> You can reopen setup tasks from Workspace settings.</div>
        </section>
      )}
      <InviteMemberModal isOpen={inviteOpen} onClose={dismissInvite} canInviteAdmin={role === 'owner'} onInvited={(count) => { setMemberCount(value => value + count); startTransition(() => { void updateWorkspaceOnboarding(organizationId, { invite_dismissed: true }); }); }} />
    </>
  );
}
