'use client';

import React, { useState, useTransition, useRef, useEffect } from 'react';
import Image from 'next/image';
import type { OrganizationMembershipWithUser, OrgRole, MembershipStatus } from '@/types/organization';
import { isPrivilegedOrgRole, toOrgRole } from '@/types/organization';
import { FiShield, FiStar, FiUser, FiUserCheck, FiEye, FiClock, FiXCircle, FiCheck, FiUserPlus, FiUserX, FiLink, FiCopy, FiSend, FiChevronDown, FiAlertTriangle, FiTrash2, FiPause, FiPlay, FiSearch, FiFilter, FiEdit2 } from 'react-icons/fi';
import { approveMember, rejectMember as rejectMemberAction, updateMemberRole, suspendMember, removeMember as removeMemberAction } from '@/app/(dashboard)/[orgSlug]/team/actions';
import { canEditMemberProfile } from '@/lib/org-permissions';
import { toast } from '@/lib/toast';
import { InviteMemberModal } from '@/components/ui/invite-member-modal';
import { MemberEditModal } from '@/components/ui/team/member-edit-modal';
import { Portal } from '@/components/ui/portal';
import { useAdaptiveDropdown } from '@/hooks/use-adaptive-dropdown';
import PendingInvitations from '@/components/ui/team/pending-invitations';
import type { InvitationStats, PendingInvitation } from '@/app/(dashboard)/[orgSlug]/team/actions';

interface TeamPageClientProps {
  members: OrganizationMembershipWithUser[];
  currentUserId: string;
  currentOrgRole: string | null;
  currentUserRoles?: string[];
  inviteCode: string | null;
  isSuperAdmin: boolean;
  invitations: PendingInvitation[];
  invitationStats: InvitationStats | null;
}

type RoleDisplay = { label: string; hint: string; icon: React.ReactNode; color: string; bg: string };

const roleConfig: Record<OrgRole, RoleDisplay> = {
  owner: {
    label: 'Owner',
    hint: 'Full control of the organization',
    icon: <FiStar size={14} />,
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
  },
  admin: {
    label: 'Admin',
    hint: "Can edit or remove anyone's work",
    icon: <FiShield size={14} />,
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
  },
  manager: {
    label: 'Manager',
    hint: 'Sees everything, changes only their own',
    icon: <FiEye size={14} />,
    color: 'text-teal-500',
    bg: 'bg-teal-500/10',
  },
  member: {
    label: 'Member',
    hint: 'Creates and manages their own work',
    icon: <FiUserCheck size={14} />,
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
  },
  guest: {
    label: 'Guest',
    hint: 'Read-only, shared items only',
    icon: <FiUser size={14} />,
    color: 'text-purple-500',
    bg: 'bg-purple-500/10',
  },
};

const UNKNOWN_ROLE: RoleDisplay = {
  label: 'Unknown',
  hint: 'Unrecognized role',
  icon: <FiUser size={14} />,
  color: 'text-text-muted',
  bg: 'bg-foreground/[0.05]',
};

/** Never index `roleConfig` directly — an unexpected role from the API would crash the row. */
function displayRole(role: string | null | undefined): RoleDisplay {
  return roleConfig[toOrgRole(role) as OrgRole] ?? UNKNOWN_ROLE;
}

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
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // The table this renders inside has clipping boundaries (for its rounded
  // corners), which clips any absolutely-positioned child that spills past
  // the table's own bounds — so a dropdown near the bottom of a long roster
  // got cut off instead of showing its options. Rendering the panel through
  // a portal escapes that clipping, and `useAdaptiveDropdown` flips it above
  // the trigger when there is not enough room below.
  //
  // The positioning must come from the hook rather than a one-shot layout
  // effect: `Portal` defers its children to a post-mount effect, so any
  // measurement taken in the same pass that opens the menu reads a panel
  // that is not in the DOM yet — height zero, and the flip can never fire.
  const { style: panelStyle, side: panelSide } = useAdaptiveDropdown({
    isOpen: open,
    anchorRef: triggerRef,
    dropdownRef: panelRef,
    preferredSide: 'bottom',
    preferredAlign: 'start',
    gap: 6,
    viewportPadding: 12,
  });

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setOpen(false);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const role = displayRole(member.role);

  // Only an OWNER may grant OWNER or ADMIN. This mirrors the backend rule in
  // `organizations.py` that stops an admin from minting a peer admin.
  const options: OrgRole[] = [
    ...(isOwner ? (['owner', 'admin'] as OrgRole[]) : []),
    'manager',
    'member',
    'guest',
  ];

  return (
    <>
      <button
        ref={triggerRef}
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border border-card-border bg-foreground/[0.03] text-foreground hover:bg-foreground/[0.06] transition-all whitespace-nowrap"
      >
        {isLoading ? (
          <span className="w-3 h-3 border-2 border-foreground/30 border-t-foreground rounded-full animate-spin" />
        ) : (
          role.icon
        )}
        {role.label}
        <FiChevronDown size={12} className={`text-text-muted transition-transform ${open && panelSide === 'top' ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <Portal>
          <div
            ref={panelRef}
            data-side={panelSide}
            style={panelStyle}
            className={`z-[9999] min-w-[230px] overflow-y-auto rounded-xl border border-card-border bg-background shadow-lg shadow-black/10 animate-in fade-in zoom-in-95 duration-150 ease-out motion-reduce:animate-none ${panelSide === 'top' ? 'origin-bottom-left' : 'origin-top-left'}`}
          >
            {options.map((opt) => {
              const cfg = roleConfig[opt];
              const isCurrent = toOrgRole(member.role) === opt;
              return (
                <button
                  key={opt}
                  onClick={() => { onRoleChange(member.user_id, opt); setOpen(false); }}
                  disabled={isLoading || isCurrent}
                  className={`w-full flex items-start gap-2 px-3 py-2 text-left transition-colors hover:bg-foreground/[0.05] ${
                    isCurrent ? 'bg-foreground/[0.03]' : ''
                  } disabled:opacity-50`}
                >
                  <span className={`mt-0.5 ${cfg.color}`}>{cfg.icon}</span>
                  <span className="min-w-0">
                    <span className={`block text-xs font-medium ${isCurrent ? 'text-foreground' : 'text-text-muted'}`}>
                      {cfg.label}
                    </span>
                    <span className="block text-[10px] text-text-muted/70 leading-tight mt-0.5">
                      {cfg.hint}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </Portal>
      )}
    </>
  );
}

export default function TeamPageClient({ members, currentUserId, currentOrgRole, currentUserRoles, inviteCode, isSuperAdmin, invitations, invitationStats }: TeamPageClientProps) {
  const [isPending, startTransition] = useTransition();
  const [localMembers, setLocalMembers] = useState(members);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const canManage = isPrivilegedOrgRole(currentOrgRole) || isSuperAdmin;
  const isOwner = currentOrgRole === 'owner';
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<OrganizationMembershipWithUser | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ userId: string; name: string; action: 'remove' | 'suspend' } | null>(null);

  /**
   * Profile edits follow a *different* rule from role/status management: they
   * flow down the chain (see `canEditMemberProfile`), so a MANAGER can edit a
   * MEMBER even though they can't change roles at all, and everyone can edit
   * themselves.
   */
  const canEditProfileOf = (member: OrganizationMembershipWithUser): boolean =>
    canEditMemberProfile(
      { id: currentUserId, roles: currentUserRoles, orgRole: currentOrgRole },
      { id: member.user_id, orgRole: member.role },
    );

  const applyProfilePatch = (
    userId: string,
    patch: { full_name?: string; job_title?: string; avatar_url?: string },
  ) => {
    setLocalMembers(prev =>
      prev.map(m => (m.user_id === userId ? { ...m, user: { ...m.user, ...patch } } : m)),
    );
  };

  const [copied, setCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const handleCopyInvite = () => {
    if (!inviteCode) return;
    const origin = window.location.origin;
    navigator.clipboard.writeText(`${origin}/invite?code=${inviteCode}`);
    setCopied(true);
    toast.success('Invite link copied');
    setTimeout(() => setCopied(false), 2000);
  };

  const sorted = [...localMembers].sort((a, b) => {
    const roleOrder: Record<OrgRole, number> = { owner: 0, admin: 1, manager: 2, member: 3, guest: 4 };
    const rank = (r: string) => roleOrder[toOrgRole(r) as OrgRole] ?? 99;
    return rank(a.role) - rank(b.role);
  }).filter(m => {
    const matchesSearch = !searchQuery || m.user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) || m.user.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = filterRole === 'all' || toOrgRole(m.role) === filterRole;
    const matchesStatus = filterStatus === 'all' || m.status === filterStatus;
    return matchesSearch && matchesRole && matchesStatus;
  });

  /**
   * Whether the current user may change or remove this member.
   *
   * Mirrors the backend: owners are untouchable through this screen, you cannot
   * act on yourself, and an ADMIN may not modify a peer ADMIN — only an OWNER
   * can. Without that last clause any admin could demote every other admin.
   */
  const canActOn = (member: OrganizationMembershipWithUser): boolean => {
    if (!canManage) return false;
    if (member.user_id === currentUserId) return false;
    const targetRole = toOrgRole(member.role);
    if (targetRole === 'owner') return false;
    if (targetRole === 'admin' && !isOwner && !isSuperAdmin) return false;
    return true;
  };

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
          <h1 className="text-3xl font-bold text-foreground mb-2 tracking-tight">Team</h1>
          <p className="text-text-muted text-sm">{localMembers.length} member{localMembers.length !== 1 ? 's' : ''} in your organization.</p>
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
            className="flex items-center gap-2 p-1.5 h-9 lg:h-11 rounded-xl bg-foreground/[0.03] hover:bg-foreground/[0.06] border border-card-border hover:border-card-border text-sm text-text-muted hover:text-foreground transition-all duration-200 group"
          >
            <div className="p-1 rounded-lg bg-foreground/[0.03] group-hover:bg-foreground/[0.06] transition-colors">
              <FiSend size={16} />
            </div>
            Invite Members
          </button>
        )}
      </div>

      {canManage && <PendingInvitations invitations={invitations} stats={invitationStats} />}

      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
        <div className="relative flex-1 min-w-[140px] max-w-sm group">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-[var(--pastel-indigo)] transition-colors w-3.5 h-3.5"/>
          <input
            type="text"
            placeholder="Search members..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-4 h-9 lg:h-11 bg-foreground/[0.03] border border-card-border rounded-xl focus:outline-none focus:bg-foreground/[0.06] text-foreground placeholder:text-text-muted/50 transition-all text-xs lg:text-sm"
          />
        </div>

        <div className="relative group flex-shrink-0">
          <div className="h-9 lg:h-11 w-9 lg:w-36 bg-foreground/[0.03] border border-card-border rounded-xl flex items-center justify-center lg:justify-start lg:pl-3 relative overflow-hidden focus-within:bg-foreground/[0.06] transition-all">
            <FiFilter className="text-text-muted group-hover:text-[var(--pastel-indigo)] transition-colors w-3.5 h-3.5 lg:absolute lg:left-3 lg:top-1/2 lg:-translate-y-1/2 lg:z-10" />
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="absolute inset-0 opacity-0 lg:opacity-100 lg:static lg:bg-transparent lg:border-none lg:pl-8 lg:pr-4 lg:w-full lg:h-full text-text-muted cursor-pointer lg:text-[11px] lg:font-bold lg:uppercase lg:tracking-wider appearance-none focus:outline-none"
            >
              <option value="all" className="bg-card">Role</option>
              <option value="owner" className="bg-card">Owner</option>
              <option value="admin" className="bg-card">Admin</option>
              <option value="manager" className="bg-card">Manager</option>
              <option value="member" className="bg-card">Member</option>
              <option value="guest" className="bg-card">Guest</option>
            </select>
          </div>
        </div>

        <div className="relative group flex-shrink-0">
          <div className="h-9 lg:h-11 w-9 lg:w-36 bg-foreground/[0.03] border border-card-border rounded-xl flex items-center justify-center lg:justify-start lg:pl-3 relative overflow-hidden focus-within:bg-foreground/[0.06] transition-all">
            <FiFilter className="text-text-muted group-hover:text-[var(--pastel-indigo)] transition-colors w-3.5 h-3.5 lg:absolute lg:left-3 lg:top-1/2 lg:-translate-y-1/2 lg:z-10" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="absolute inset-0 opacity-0 lg:opacity-100 lg:static lg:bg-transparent lg:border-none lg:pl-8 lg:pr-4 lg:w-full lg:h-full text-text-muted cursor-pointer lg:text-[11px] lg:font-bold lg:uppercase lg:tracking-wider appearance-none focus:outline-none"
            >
              <option value="all" className="bg-card">Status</option>
              <option value="active" className="bg-card">Active</option>
              <option value="pending" className="bg-card">Pending</option>
              <option value="suspended" className="bg-card">Suspended</option>
            </select>
          </div>
        </div>
      </div>

      <InviteMemberModal
        isOpen={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
        canInviteAdmin={isOwner}
      />

      {editingMember && (
        <MemberEditModal
          member={editingMember}
          isSelf={editingMember.user_id === currentUserId}
          onClose={() => setEditingMember(null)}
          onSaved={(patch) => applyProfilePatch(editingMember.user_id, patch)}
        />
      )}

      {sorted.length === 0 ? (
        <div className="bg-card border border-card-border rounded-2xl px-5 py-12 text-center">
          <FiUser className="mx-auto text-text-muted/40 mb-3" size={32} />
          <p className="text-text-muted">No team members found</p>
        </div>
      ) : (
        <div className="bg-card border border-card-border rounded-2xl overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-card-border bg-foreground/[0.02]">
                <th className="text-left px-5 py-3 text-xs font-medium text-text-muted uppercase tracking-wider">Member</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-text-muted uppercase tracking-wider">Job Title</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-text-muted uppercase tracking-wider">Email</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-text-muted uppercase tracking-wider">Phone</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-text-muted uppercase tracking-wider">Role</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-text-muted uppercase tracking-wider">Status</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-text-muted uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-card-border">
              {sorted.map((m) => {
                const isCurrentUser = m.user_id === currentUserId;
                const mayAct = canActOn(m);
                const roleDisplay = displayRole(m.role);
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
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-medium text-foreground whitespace-nowrap">
                            {m.user.full_name || m.user.email.split('@')[0]}
                          </span>
                          {isCurrentUser && (
                            <span className="text-[10px] font-medium text-text-muted bg-foreground/[0.05] px-1.5 py-0.5 rounded uppercase tracking-wider">
                              You
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-xs text-text-secondary whitespace-nowrap">
                        {m.user.job_title || '—'}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <a
                        href={`mailto:${m.user.email}`}
                        className="text-xs text-text-muted hover:text-foreground transition-colors whitespace-nowrap"
                      >
                        {m.user.email}
                      </a>
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-xs text-text-muted whitespace-nowrap">
                        {m.user.phone || '—'}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      {mayAct ? (
                        <RoleDropdown member={m} isOwner={isOwner} isLoading={loadingId === m.user_id} onRoleChange={handleRoleChange} />
                      ) : (
                        <span
                          title={roleDisplay.hint}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${roleDisplay.bg} ${roleDisplay.color} whitespace-nowrap`}
                        >
                          {roleDisplay.icon}
                          {roleDisplay.label}
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
                        {canEditProfileOf(m) && (
                          <button
                            onClick={() => setEditingMember(m)}
                            className="p-1.5 rounded-lg bg-foreground/[0.03] text-text-muted hover:text-foreground hover:bg-foreground/[0.06] border border-card-border transition-all"
                            title={isCurrentUser ? 'Edit your profile' : 'Edit member profile'}
                          >
                            <FiEdit2 size={14} />
                          </button>
                        )}
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
                        {mayAct && m.status !== 'pending' && (
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
                  <span className="block w-4 h-4 border-2 border-foreground/30 border-t-white rounded-full animate-spin" />
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
