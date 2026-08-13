'use client';

import { useState, useTransition } from 'react';
import { FiClock, FiRefreshCw, FiTrash2 } from 'react-icons/fi';
import { resendInvitation, revokeInvitation, type InvitationStats, type PendingInvitation } from '@/app/(dashboard)/[orgSlug]/team/actions';
import { toast } from '@/lib/toast';

export default function PendingInvitations({ invitations, stats }: { invitations: PendingInvitation[]; stats: InvitationStats | null }) {
  const [rows, setRows] = useState(invitations.filter(item => item.status === 'pending'));
  const [busy, startTransition] = useTransition();
  if (!rows.length && !stats?.total) return null;
  const act = (id: string, action: 'resend' | 'revoke') => startTransition(async () => {
    const result = action === 'resend' ? await resendInvitation(id) : await revokeInvitation(id);
    if (!result.success) { toast.error(result.error || 'The invitation could not be updated.'); return; }
    if (action === 'revoke') setRows(current => current.filter(row => row.id !== id));
    toast.success(action === 'resend' ? 'Invitation resent' : 'Invitation revoked');
  });
  return (
    <section className="mb-6 overflow-hidden rounded-2xl border border-card-border bg-card">
      <div className="flex flex-wrap items-center gap-2 border-b border-card-border px-5 py-3.5"><FiClock className="text-amber-500" /><h2 className="text-sm font-semibold text-foreground">Invitations</h2>{stats && <div className="ml-auto flex items-center gap-3 text-[10px] font-semibold text-text-muted"><span>{stats.delivered} delivered</span><span>{stats.accepted} accepted</span><span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-emerald-500">{stats.acceptance_rate}% acceptance</span></div>}</div>
      <div className="divide-y divide-card-border">
        {rows.map(row => <div key={row.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
          <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-foreground">{row.email}</p><p className="mt-0.5 text-[11px] capitalize text-text-muted">{row.role} · expires {new Date(row.expires_at).toLocaleDateString()}</p></div>
          <button disabled={busy} onClick={() => act(row.id, 'resend')} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-text-muted hover:bg-foreground/[0.05] hover:text-foreground"><FiRefreshCw /> Resend</button>
          <button disabled={busy} onClick={() => act(row.id, 'revoke')} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-rose-500 hover:bg-rose-500/10"><FiTrash2 /> Revoke</button>
        </div>)}
      </div>
    </section>
  );
}
