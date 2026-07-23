'use client';

import React, { useState, useTransition, useRef, useEffect } from 'react';
import Image from 'next/image';
import type { OrganizationMembershipWithUser, OrgRole, MembershipStatus } from '@/types/organization';
import { isPrivilegedOrgRole } from '@/types/organization';
import { FiShield, FiStar, FiUser, FiUserCheck, FiClock, FiXCircle, FiCheck, FiUserPlus, FiUserX, FiLink, FiCopy, FiSend, FiChevronDown, FiAlertTriangle, FiTrash2, FiPause, FiPlay } from 'react-icons/fi';
import { approveMember, rejectMember as rejectMemberAction, updateMemberRole, suspendMember, removeMember as removeMemberAction } from '@/app/(dashboard)/[orgSlug]/team/actions';
import { toast } from '@/lib/toast';
import { InviteMemberModal } from '@/components/ui/invite-member-modal';

interface TeamPageClientProps {
  members: OrganizationMembershipWithUser[];
  currentUserId: string;
  currentOrgRole: string | null;
  inviteCode: string | null;
  isSuperAdmin: boolean;
}

const roleConfig: Record<OrgRole, { label: string; icon: React.ReactNode; color: string; bg: string }> = {
  owner: {
    label: 'Owner',
    icon: <FiStar size={14} />,
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
  },
  admin: {
    label: 'Admin',
    icon: <FiShield size={14} />,
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
  },
  member: {
    label: 'Member',
    icon: <FiUserCheck size={14} />,
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
  },
  client: {
    label: 'Client',
    icon: <FiUser size={14} />,
    color: 'text-purple-500',
    bg: 'bg-purple-500/10',
  },
};

const statusConfig: Record<MembershipStatus, { label: string; color: string; bg: string }> = {
  active: {
    label: 'Active',
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
  },
  pending: {
    label: 'Pending',
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
  },
  suspended: {
    label: 'Suspended',
    color: 'text-red-500',
    bg: 'bg-red-500/10',
  },
};

function RoleDropdown({ member, isOwner, isLoading, onRoleChange }: {
  member: OrganizationMembershipWithUser;
  isOwner: boolean;
  isLoading: boolean;
  onRoleChange: (userId: string, role: OrgRole) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const role = roleConfig[member.role];

  const options: { value: OrgRole; label: string }[] = [
    ...(isOwner ? [{ value: 'owner' as OrgRole, label: 'Owner' }] : []),
    { value: 'admin', label: 'Admin' },
    { value: 'member', label: 'Member' },
    { value: 'client', label: 'Client' },
  ];

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border border-card-border bg-foreground/[0.03] text-foreground hover:bg-foreground/[0.06] transition-all whitespace-nowrap"
      >
        {isLoading ? (
          <span className="w-3 h-3 border-2 border-foreground/30 border-t-foreground rounded-full animate-spin" />
        ) : (
          role.icon
        )}
        {role.label}
        <FiChevronDown size={12} className={`text-text-muted transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 min-w-[150px] bg-background border border-card-border rounded-xl shadow-lg shadow-black/10 overflow-hidden">
          {options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { onRoleChange(member.user_id, opt.value); setOpen(false); }}
              disabled={isLoading || member.role === opt.value}
              className={`w-full flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors hover:bg-foreground/[0.05] ${
                member.role === opt.value ? 'text-foreground bg-foreground/[0.03]' : 'text-text-muted'
              } disabled:opacity-50`}
            >
              {roleConfig[opt.value].icon}
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function TeamPageClient({ members, currentUserId, currentOrgRole, inviteCode, isSuperAdmin }: TeamPageClientProps) {
  const [isPending, startTransition] = useTransition();
  const [localMembers, setLocalMembers] = useState(members);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const canManage = isPrivilegedOrgRole(currentOrgRole) || isSuperAdmin;
  const isOwner = currentOrgRole === 'owner';
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ userId: string; name: string; action: 'remove' | 'suspend' } | null>(null);

  const [copied, setCopied] = useState(false);
  const handleCopyInvite = () => {
    if (!inviteCode) return;
    const origin = window.location.origin;
    navigator.clipboard.writeText(`${origin}/invite?code=${inviteCode}`);
    setCopied(true);
    toast.success('Invite link copied');
    setTimeout(() => setCopied(false), 2000);
  };

  const sorted = [...localMembers].sort((a, b) => {
    const roleOrder: Record<OrgRole, number> = { owner: 0, admin: 1, member: 2, client: 3 };
    return (roleOrder[a.role] ?? 99) - (roleOrder[b.role] ?? 99);
  });

  const handleApprove = (userId: string) => {
    setLoadingId(userId);
    startTransition(async () => {
      setLocalMembers(prev => prev.map(m => m.user_id === userId ? { ...m, status: 'active' as MembershipStatus } : m));
      const result = await approveMember(userId);
      setLoadingId(null);
      if (!result.success) {
        setLocalMembers(prev => prev.map(m => m.user_id === userId ? { ...m, status: 'pending' as MembershipStatus } : m));
        toast.error(result.error || 'Failed to approve member');
      } else {
        toast.success('Member approved');
      }
    });
  };

  const handleReject = (userId: string) => {
    setLoadingId(userId);
    startTransition(async () => {
      setLocalMembers(prev => prev.filter(m => m.user_id !== userId));
      const result = await rejectMemberAction(userId);
      setLoadingId(null);
      if (!result.success) {
        setLocalMembers(members);
        toast.error(result.error || 'Failed to reject member');
      } else {
        toast.success('Member rejected');
      }
    });
  };

  const handleRoleChange = (userId: string, role: OrgRole) => {
    setLoadingId(userId);
    startTransition(async () => {
      setLocalMembers(prev => prev.map(m => m.user_id === userId ? { ...m, role } : m));
      const result = await updateMemberRole(userId, role);
      setLoadingId(null);
      if (!result.success) {
        setLocalMembers(members);
        toast.error(result.error || 'Failed to update role');
      } else {
        toast.success('Role updated');
      }
    });
  };

  const handleSuspend = (userId: string) => {
    setLoadingId(userId);
    startTransition(async () => {
      setLocalMembers(prev => prev.map(m => m.user_id === userId ? { ...m, status: 'suspended' as MembershipStatus } : m));
      const result = await suspendMember(userId);
      setLoadingId(null);
      if (!result.success) {
        setLocalMembers(members);
        toast.error(result.error || 'Failed to suspend member');
      } else {
        setConfirmAction(null);
        toast.success('Member suspended');
      }
    });
  };

  const handleActivate = (userId: string) => {
    setLoadingId(userId);
    startTransition(async () => {
      setLocalMembers(prev => prev.map(m => m.user_id === userId ? { ...m, status: 'active' as MembershipStatus } : m));
      const result = await approveMember(userId);
      setLoadingId(null);
      if (!result.success) {
        setLocalMembers(members);
        toast.error(result.error || 'Failed to activate member');
      } else {
        toast.success('Member activated');
      }
    });
  };

  const handleRemove = (userId: string) => {
    setLoadingId(userId);
    startTransition(async () => {
      setLocalMembers(prev => prev.filter(m => m.user_id !== userId));
      const result = await removeMemberAction(userId);
      setLoadingId(null);
      if (!result.success) {
        setLocalMembers(members);
        toast.error(result.error || 'Failed to remove member');
      } else {
        setConfirmAction(null);
        toast.success('Member removed');
      }
    });
  };

  return (
    <div>
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Team</h1>
          <p className="text-text-muted mt-1">{localMembers.length} member{localMembers.length !== 1 ? 's' : ''}</p>
          {inviteCode && canManage && (
            <button
              onClick={handleCopyInvite}
              className="mt-2 flex items-center gap-1.5 text-xs text-text-muted hover:text-foreground transition-colors"
            >
              <FiLink size={12} />
              <span className="font-mono tracking-wider">{inviteCode}</span>
              <FiCopy size={12} className={copied ? 'text-emerald-400' : ''} />
            </button>
          )}
        </div>
        {canManage && (
          <button
            onClick={() => setInviteModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium transition-all"
          >
            <FiSend size={16} />
            Invite Members
          </button>
        )}
      </div>

      <InviteMemberModal
        isOpen={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
      />

      {sorted.length === 0 ? (
        <div className="glass border border-card-border rounded-xl px-5 py-12 text-center">
          <FiUser className="mx-auto text-text-muted/40 mb-3" size={32} />
          <p className="text-text-muted">No team members found</p>
        </div>
      ) : (
        <div className="glass border border-card-border rounded-xl">
          <table className="w-full">
            <thead>
              <tr className="border-b border-card-border bg-foreground/[0.02]">
                <th className="text-left px-5 py-3 text-xs font-medium text-text-muted uppercase tracking-wider">Member</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-text-muted uppercase tracking-wider">Role</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-text-muted uppercase tracking-wider">Status</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-text-muted uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-card-border">
              {sorted.map((m) => {
                const isCurrentUser = m.user_id === currentUserId;
                const isOwnerMember = m.role === 'owner';
                const initial = (m.user.full_name || m.user.email || '?')[0].toUpperCase();
                const status = statusConfig[m.status];

                return (
                  <tr key={m.id} className="hover:bg-foreground/[0.02] transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="relative w-9 h-9 flex-shrink-0">
                          {m.user.avatar_url ? (
                            <Image
                              src={m.user.avatar_url}
                              alt={m.user.full_name || ''}
                              fill
                              className="rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-foreground/[0.06] flex items-center justify-center text-sm font-bold text-foreground/60">
                              {initial}
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-medium text-foreground">
                              {m.user.full_name || m.user.email.split('@')[0]}
                            </span>
                            {isCurrentUser && (
                              <span className="text-[10px] font-medium text-text-muted bg-foreground/[0.05] px-1.5 py-0.5 rounded uppercase tracking-wider">
                                You
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-text-muted mt-0.5">{m.user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      {canManage && !isCurrentUser && !isOwnerMember ? (
                        <RoleDropdown member={m} isOwner={isOwner} isLoading={loadingId === m.user_id} onRoleChange={handleRoleChange} />
                      ) : (
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${roleConfig[m.role].bg} ${roleConfig[m.role].color} whitespace-nowrap`}>
                          {roleConfig[m.role].icon}
                          {roleConfig[m.role].label}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${status.bg} ${status.color}`}>
                        {m.status === 'active' && <FiCheck size={12} />}
                        {m.status === 'pending' && <FiClock size={12} />}
                        {m.status === 'suspended' && <FiXCircle size={12} />}
                        {status.label}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {canManage && m.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleApprove(m.user_id)}
                              disabled={loadingId === m.user_id}
                              className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 transition-all disabled:opacity-50"
                              title="Approve member"
                            >
                              {loadingId === m.user_id ? (
                                <span className="block w-3.5 h-3.5 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin" />
                              ) : (
                                <FiUserPlus size={14} />
                              )}
                            </button>
                            <button
                              onClick={() => handleReject(m.user_id)}
                              disabled={loadingId === m.user_id}
                              className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20 transition-all disabled:opacity-50"
                              title="Reject member"
                            >
                              {loadingId === m.user_id ? (
                                <span className="block w-3.5 h-3.5 border-2 border-rose-400/30 border-t-rose-400 rounded-full animate-spin" />
                              ) : (
                                <FiUserX size={14} />
                              )}
                            </button>
                          </>
                        )}
                        {canManage && !isCurrentUser && !isOwnerMember && m.status !== 'pending' && (
                          <>
                            {m.status === 'active' ? (
                              <button
                                onClick={() => setConfirmAction({ userId: m.user_id, name: m.user.full_name || m.user.email, action: 'suspend' })}
                                disabled={loadingId === m.user_id}
                                className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/20 transition-all disabled:opacity-50"
                                title="Suspend member"
                              >
                                {loadingId === m.user_id ? (
                                  <span className="block w-3.5 h-3.5 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
                                ) : (
                                  <FiPause size={14} />
                                )}
                              </button>
                            ) : (
                              <button
                                onClick={() => handleActivate(m.user_id)}
                                disabled={loadingId === m.user_id}
                                className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 transition-all disabled:opacity-50"
                                title="Reactivate member"
                              >
                                {loadingId === m.user_id ? (
                                  <span className="block w-3.5 h-3.5 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin" />
                                ) : (
                                  <FiPlay size={14} />
                                )}
                              </button>
                            )}
                            <button
                              onClick={() => setConfirmAction({ userId: m.user_id, name: m.user.full_name || m.user.email, action: 'remove' })}
                              disabled={loadingId === m.user_id}
                              className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20 transition-all disabled:opacity-50"
                              title="Remove member"
                            >
                              {loadingId === m.user_id ? (
                                <span className="block w-3.5 h-3.5 border-2 border-rose-400/30 border-t-rose-400 rounded-full animate-spin" />
                              ) : (
                                <FiTrash2 size={14} />
                              )}
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {confirmAction && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-white/60 dark:bg-black/60 backdrop-blur-md" onClick={() => setConfirmAction(null)} />
          <div className="relative w-full max-w-sm bg-background border border-card-border rounded-[1.5rem] p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                <FiAlertTriangle className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground capitalize">
                  {confirmAction.action} member
                </h3>
                <p className="text-xs text-text-muted mt-0.5">
                  {confirmAction.action === 'remove'
                    ? `Remove ${confirmAction.name} from the organization?`
                    : `Suspend ${confirmAction.name}? They won't be able to access the organization.`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 justify-end">
              <button
                onClick={() => setConfirmAction(null)}
                className="px-4 py-2 rounded-xl text-sm font-medium text-text-muted hover:text-foreground border border-card-border hover:bg-foreground/[0.03] transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (confirmAction.action === 'remove') {
                    handleRemove(confirmAction.userId);
                  } else {
                    handleSuspend(confirmAction.userId);
                  }
                }}
                disabled={loadingId === confirmAction.userId}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white bg-rose-500 hover:bg-rose-600 transition-all disabled:opacity-50"
              >
                {loadingId === confirmAction.userId ? (
                  <span className="block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : null}
                {loadingId === confirmAction.userId ? 'Processing...' : `Confirm ${confirmAction.action}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
