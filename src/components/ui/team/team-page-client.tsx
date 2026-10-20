'use client';

import React, { useState, useTransition, useRef, useEffect } from 'react';
import Image from 'next/image';
import type { OrganizationMembershipWithUser, OrgRole, MembershipStatus } from '@/types/organization';
import { isPrivilegedOrgRole, toOrgRole } from '@/types/organization';
import { StatTile } from '@/components/ui/stat-tile';
import { FiShield, FiStar, FiUser, FiUserCheck, FiEye, FiClock, FiXCircle, FiCheck, FiUserPlus, FiUserX, FiLink, FiCopy, FiSend, FiChevronDown, FiAlertTriangle, FiTrash2, FiPause, FiPlay, FiSearch, FiFilter, FiEdit2, FiGrid, FiList, FiDownload, FiMail } from 'react-icons/fi';
import { avatarStyle } from '@/lib/avatar-color';
import { approveMember, rejectMember as rejectMemberAction, updateMemberRole, suspendMember, removeMember as removeMemberAction } from '@/app/(dashboard)/[orgSlug]/team/actions';
import { canEditMemberProfile } from '@/lib/org-permissions';
import { toast } from '@/lib/toast';
import { InviteMemberModal } from '@/components/ui/invite-member-modal';
import { MemberEditModal } from '@/components/ui/team/member-edit-modal';
import { Portal } from '@/components/ui/portal';
import { useAdaptiveDropdown } from '@/hooks/use-adaptive-dropdown';
import PendingInvitations from '@/components/ui/team/pending-invitations';
import type { InvitationStats, PendingInvitation } from '@/app/(dashboard)/[orgSlug]/team/actions';

import { TabPill } from '@/components/ui/tab-pill';
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
    color: 'text-[var(--status-qa)]',
    bg: 'bg-[color-mix(in_oklab,var(--status-qa)_14%,transparent)]',
  },
  admin: {
    label: 'Admin',
    hint: "Can edit or remove anyone's work",
    icon: <FiShield size={14} />,
    color: 'text-[var(--accent)]',
    bg: 'bg-[color-mix(in_oklab,var(--accent)_14%,transparent)]',
  },
  manager: {
    label: 'Manager',
    hint: 'Sees everything, changes only their own',
    icon: <FiEye size={14} />,
    color: 'text-[var(--status-review)]',
    bg: 'bg-[color-mix(in_oklab,var(--status-review)_14%,transparent)]',
  },
  member: {
    label: 'Member',
    hint: 'Creates and manages their own work',
    icon: <FiUserCheck size={14} />,
    color: 'text-text-secondary',
    bg: 'bg-foreground/[0.05]',
  },
  guest: {
    label: 'Guest',
    hint: 'Read-only, shared items only',
    icon: <FiUser size={14} />,
    color: 'text-text-secondary',
    bg: 'bg-foreground/[0.05]',
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
    color: 'text-success-text',
    bg: 'bg-success/15',
  },
  pending: {
    label: 'Pending',
    color: 'text-warning-text',
    bg: 'bg-warning/15',
  },
  suspended: {
    label: 'Suspended',
    color: 'text-danger-text',
    bg: 'bg-danger/12',
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
            className={`z-[9999] min-w-[230px] overflow-y-auto rounded-xl border border-card-border bg-background animate-in fade-in zoom-in-95 duration-150 ease-out motion-reduce:animate-none ${panelSide === 'top' ? 'origin-bottom-left' : 'origin-top-left'}`}
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
  const [sortBy, setSortBy] = useState<'role' | 'name' | 'recent'>('role');
  const [view, setView] = useState<'list' | 'grid'>('list');
  const handleCopyInvite = () => {
    if (!inviteCode) return;
    const origin = window.location.origin;
    navigator.clipboard.writeText(`${origin}/invite?code=${inviteCode}`);
    setCopied(true);
    toast.success('Invite link copied');
    setTimeout(() => setCopied(false), 2000);
  };

  const statusCounts = localMembers.reduce<Record<string, number>>((acc, m) => {
    acc[m.status] = (acc[m.status] ?? 0) + 1;
    return acc;
  }, {});

  const sorted = [...localMembers].sort((a, b) => {
    if (sortBy === 'name') {
      return (a.user.full_name || a.user.email).localeCompare(b.user.full_name || b.user.email);
    }
    if (sortBy === 'recent') {
      return new Date(b.joined_at).getTime() - new Date(a.joined_at).getTime();
    }
    const roleOrder: Record<OrgRole, number> = { owner: 0, admin: 1, manager: 2, member: 3, guest: 4 };
    const rank = (r: string) => roleOrder[toOrgRole(r) as OrgRole] ?? 99;
    return rank(a.role) - rank(b.role);
  }).filter(m => {
    const matchesSearch = !searchQuery || m.user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) || m.user.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = filterRole === 'all' || toOrgRole(m.role) === filterRole;
    const matchesStatus = filterStatus === 'all' || m.status === filterStatus;
    return matchesSearch && matchesRole && matchesStatus;
  });

  // Download the members currently shown (after search, filters and sort).
  const handleExport = () => {
    const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;
    const rows = [
      ['Name', 'Email', 'Job title', 'Phone', 'Role', 'Status', 'Joined'],
      ...sorted.map((m) => [
        m.user.full_name || '',
        m.user.email,
        m.user.job_title || '',
        m.user.phone || '',
        displayRole(m.role).label,
        statusConfig[m.status]?.label ?? m.status,
        m.joined_at ? new Date(m.joined_at).toISOString().slice(0, 10) : '',
      ]),
    ];
    const blob = new Blob([rows.map((r) => r.map(escape).join(',')).join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'team-members.csv';
    link.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${sorted.length} member${sorted.length === 1 ? '' : 's'}`);
  };

  const handleCopyEmail = (email: string) => {
    void navigator.clipboard.writeText(email);
    toast.success('Email copied');
  };

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

  const renderActions = (m: OrganizationMembershipWithUser, mayAct: boolean, isCurrentUser: boolean) => (
      <div className="flex items-center justify-end gap-1">
        {canEditProfileOf(m) && (
          <button
            onClick={() => setEditingMember(m)}
            className="grid h-8 w-8 place-items-center rounded-full text-text-muted hover:text-foreground hover:bg-foreground/[0.06] transition-colors"
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
              className="grid h-8 w-8 place-items-center rounded-full bg-success/12 text-success-text hover:bg-success/20 transition-colors disabled:opacity-50"
              title="Approve member"
            >
              {loadingId === m.user_id ? (
                <span className="block w-3.5 h-3.5 border-2 border-success/30 border-t-success rounded-full animate-spin" />
              ) : (
                <FiUserPlus size={14} />
              )}
            </button>
            <button
              onClick={() => handleReject(m.user_id)}
              disabled={loadingId === m.user_id}
              className="grid h-8 w-8 place-items-center rounded-full text-text-muted hover:bg-danger/12 hover:text-danger-text transition-colors disabled:opacity-50"
              title="Reject member"
            >
              {loadingId === m.user_id ? (
                <span className="block w-3.5 h-3.5 border-2 border-danger/30 border-t-danger rounded-full animate-spin" />
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
                className="grid h-8 w-8 place-items-center rounded-full text-text-muted hover:bg-warning/15 hover:text-warning-text transition-colors disabled:opacity-50"
                title="Suspend member"
              >
                {loadingId === m.user_id ? (
                  <span className="block w-3.5 h-3.5 border-2 border-warning/30 border-t-warning rounded-full animate-spin" />
                ) : (
                  <FiPause size={14} />
                )}
              </button>
            ) : (
              <button
                onClick={() => handleActivate(m.user_id)}
                disabled={loadingId === m.user_id}
                className="grid h-8 w-8 place-items-center rounded-full bg-success/12 text-success-text hover:bg-success/20 transition-colors disabled:opacity-50"
                title="Reactivate member"
              >
                {loadingId === m.user_id ? (
                  <span className="block w-3.5 h-3.5 border-2 border-success/30 border-t-success rounded-full animate-spin" />
                ) : (
                  <FiPlay size={14} />
                )}
              </button>
            )}
            <button
              onClick={() => setConfirmAction({ userId: m.user_id, name: m.user.full_name || m.user.email, action: 'remove' })}
              disabled={loadingId === m.user_id}
              className="grid h-8 w-8 place-items-center rounded-full text-text-muted hover:bg-danger/12 hover:text-danger-text transition-colors disabled:opacity-50"
              title="Remove member"
            >
              {loadingId === m.user_id ? (
                <span className="block w-3.5 h-3.5 border-2 border-danger/30 border-t-danger rounded-full animate-spin" />
              ) : (
                <FiTrash2 size={14} />
              )}
            </button>
          </>
        )}
      </div>
  );

  return (
    <div>
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2 tracking-tight">Team</h1>
          <p className="text-text-muted text-sm">{localMembers.length} member{localMembers.length !== 1 ? 's' : ''} in your organization.</p>
          {inviteCode && canManage && (
            <button
              onClick={handleCopyInvite}
              className="mt-3 inline-flex min-h-9 items-center gap-2 rounded-full bg-foreground/[0.05] px-3.5 text-xs text-text-muted transition-colors hover:bg-foreground/[0.08] hover:text-foreground"
              title="Copy invite link"
            >
              <FiLink size={12} />
              <span className="font-mono">{inviteCode}</span>
              {copied ? <FiCheck size={12} className="text-success-text" /> : <FiCopy size={12} />}
            </button>
          )}
        </div>
        {canManage && (
          <button onClick={() => setInviteModalOpen(true)} className="md-btn md-btn-primary shrink-0">
            Invite members <span className="md-btn-chip"><FiSend /></span>
          </button>
        )}
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {([
          { label: 'Members', value: localMembers.length, icon: FiUser, tone: 'var(--accent)', onClick: () => { setFilterStatus('all'); setFilterRole('all'); } },
          { label: 'Active', value: statusCounts.active ?? 0, icon: FiCheck, tone: 'var(--success)', onClick: () => setFilterStatus('active') },
          { label: 'Pending approval', value: statusCounts.pending ?? 0, icon: FiClock, tone: 'var(--warning)', onClick: () => setFilterStatus('pending') },
          { label: 'Admins & owners', value: localMembers.filter((m) => ['owner', 'admin'].includes(toOrgRole(m.role) ?? '')).length, icon: FiShield, tone: 'var(--status-qa)', onClick: () => { setFilterStatus('all'); setFilterRole('admin'); } },
        ]).map((stat) => (
          <StatTile key={stat.label} {...stat} />
        ))}
      </div>

      {canManage && <PendingInvitations invitations={invitations} stats={invitationStats} />}

      <div className="mb-6 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[180px] flex-1 sm:max-w-sm">
            <FiSearch className="pointer-events-none absolute left-4 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              placeholder="Search members"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 w-full border border-transparent bg-foreground/[0.04] pl-10 pr-4 text-sm text-foreground placeholder:text-text-muted/60 focus:bg-background"
            />
          </div>
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            aria-label="Filter by role"
            className="h-10 cursor-pointer border border-transparent bg-foreground/[0.04] pl-4 text-sm text-text-secondary"
          >
            <option value="all">All roles</option>
            <option value="owner">Owner</option>
            <option value="admin">Admin</option>
            <option value="manager">Manager</option>
            <option value="member">Member</option>
            <option value="guest">Guest</option>
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'role' | 'name' | 'recent')}
            aria-label="Sort members"
            className="h-10 cursor-pointer border border-transparent bg-foreground/[0.04] pl-4 text-sm text-text-secondary"
          >
            <option value="role">Sort by role</option>
            <option value="name">Sort by name</option>
            <option value="recent">Newest first</option>
          </select>
          <div className="ml-auto flex items-center gap-2">
            <div className="flex items-center rounded-full bg-foreground/[0.04] p-1" role="group" aria-label="Layout">
              {([['list', FiList, 'List view'], ['grid', FiGrid, 'Grid view']] as const).map(([value, Icon, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setView(value)}
                  aria-pressed={view === value}
                  aria-label={label}
                  className={`relative isolate grid h-8 w-8 place-items-center rounded-full transition-colors ${view === value ? 'text-on-ink' : 'text-text-muted hover:text-foreground'}`}
                >
                  {view === value && <TabPill id="team-layout" />}
                  <Icon size={14} />
                </button>
              ))}
            </div>
            <button type="button" onClick={handleExport} className="md-btn md-btn-secondary md-btn-sm" disabled={sorted.length === 0}>
              <FiDownload size={14} /> Export
            </button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter by status">
          {([['all', 'All', localMembers.length], ['active', 'Active', statusCounts.active ?? 0], ['pending', 'Pending', statusCounts.pending ?? 0], ['suspended', 'Suspended', statusCounts.suspended ?? 0]] as const).map(([value, label, count]) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilterStatus(value)}
              aria-pressed={filterStatus === value}
              className={`relative isolate inline-flex min-h-9 items-center gap-2 rounded-full px-3.5 text-sm transition-colors ${filterStatus === value ? 'text-on-ink' : 'bg-foreground/[0.04] text-text-secondary hover:bg-foreground/[0.07]'}`}
            >
              {filterStatus === value && <TabPill id="team-status-filter" />}
              {label}
              <span className={`md-count ${filterStatus === value ? 'bg-on-ink/15 text-on-ink' : 'bg-background text-text-muted'}`}>{count}</span>
            </button>
          ))}
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
        view === 'grid' ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {sorted.map((m) => {
            const isCurrentUser = m.user_id === currentUserId;
            const mayAct = canActOn(m);
            const roleDisplay = displayRole(m.role);
            const status = statusConfig[m.status];
            const name = m.user.full_name || m.user.email.split('@')[0];
            return (
              <article key={m.id} className="flex flex-col rounded-[28px] bg-card p-5">
                <div className="flex items-start gap-3">
                  <div className="relative h-12 w-12 shrink-0">
                    {m.user.avatar_url ? (
                      <Image src={m.user.avatar_url} alt={name} fill className="rounded-full object-cover" />
                    ) : (
                      <div style={avatarStyle(m.user.full_name || m.user.email)} className="flex h-12 w-12 items-center justify-center rounded-full text-base font-semibold">
                        {(m.user.full_name || m.user.email || '?')[0].toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 truncate text-sm font-semibold text-foreground">
                      {name}
                      {isCurrentUser && <span className="rounded-full bg-accent/12 px-2 py-0.5 text-[11px] font-medium text-accent-text">You</span>}
                    </p>
                    <p className="truncate text-xs text-text-muted">{m.user.job_title || 'No job title'}</p>
                  </div>
                  <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${status.bg} ${status.color}`}>{status.label}</span>
                </div>
                <div className="mt-4 space-y-1.5 text-xs text-text-muted">
                  <a href={`mailto:${m.user.email}`} className="flex items-center gap-2 truncate hover:text-foreground"><FiMail size={12} className="shrink-0" />{m.user.email}</a>
                  {m.user.phone && <p className="flex items-center gap-2"><FiUser size={12} className="shrink-0" />{m.user.phone}</p>}
                </div>
                <div className="mt-4 flex items-center justify-between gap-2 border-t border-card-border pt-3">
                  {mayAct ? (
                    <RoleDropdown member={m} isOwner={isOwner} isLoading={loadingId === m.user_id} onRoleChange={handleRoleChange} />
                  ) : (
                    <span title={roleDisplay.hint} className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${roleDisplay.bg} ${roleDisplay.color}`}>
                      {roleDisplay.icon}{roleDisplay.label}
                    </span>
                  )}
                  {renderActions(m, mayAct, isCurrentUser)}
                </div>
              </article>
            );
          })}
        </div>
        ) : (
        <div className="bg-card border border-card-border rounded-2xl overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-card-border">
                <th className="text-left px-5 py-3 text-xs font-medium text-text-muted">Member</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-text-muted">Job title</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-text-muted">Email</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-text-muted">Phone</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-text-muted">Role</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-text-muted">Status</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-text-muted">Actions</th>
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
                  <tr key={m.id} className={`transition-colors hover:bg-foreground/[0.025] ${m.status === 'pending' ? 'bg-warning/[0.06]' : ''}`}>
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
                            <div style={avatarStyle(m.user.full_name || m.user.email)} className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold">
                              {initial}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-medium text-foreground whitespace-nowrap">
                            {m.user.full_name || m.user.email.split('@')[0]}
                          </span>
                          {isCurrentUser && (
                            <span className="rounded-full bg-accent/12 px-2 py-0.5 text-[11px] font-medium text-accent-text">
                              You
                            </span>
                          )}
                        </div>
                        {m.joined_at && (
                          <p className="text-xs text-text-muted">Joined {new Date(m.joined_at).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}</p>
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
                      <span className="group/email inline-flex items-center gap-1.5">
                        <a
                          href={`mailto:${m.user.email}`}
                          className="text-xs text-text-muted hover:text-foreground transition-colors whitespace-nowrap"
                        >
                          {m.user.email}
                        </a>
                        <button
                          type="button"
                          onClick={() => handleCopyEmail(m.user.email)}
                          className="grid h-6 w-6 place-items-center rounded-full text-text-muted opacity-0 transition-opacity hover:bg-foreground/[0.06] hover:text-foreground focus-visible:opacity-100 group-hover/email:opacity-100"
                          aria-label={`Copy ${m.user.email}`}
                        >
                          <FiCopy size={11} />
                        </button>
                      </span>
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
                      {renderActions(m, mayAct, isCurrentUser)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        )
      )}

      {confirmAction && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-white/60 dark:bg-black/60 backdrop-blur-md" onClick={() => setConfirmAction(null)} />
          <div className="relative w-full max-w-sm bg-background border border-card-border rounded-[28px] p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-danger/12 flex items-center justify-center">
                <FiAlertTriangle className="w-5 h-5 text-danger-text" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-foreground capitalize">
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
                className="md-btn md-btn-secondary flex-1"
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
                className="md-btn md-btn-danger flex-1"
              >
                {loadingId === confirmAction.userId ? (
                  <span className="block w-4 h-4 border-2 border-foreground/30 border-t-white rounded-full animate-spin" />
                ) : null}
                {loadingId === confirmAction.userId ? 'Working…' : confirmAction.action === 'remove' ? 'Remove member' : 'Suspend member'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
