'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { User } from '@/types/user';
import { FiSearch, FiEdit2, FiTrash2, FiX, FiCheck, FiClock, FiChevronRight, FiSun, FiUser } from 'react-icons/fi';
import { EmptyState } from '@/components/ui/empty-state';
import { useOrgSlug } from '@/hooks/use-org-slug';
import { updateUser, deleteUser, getUsers } from '@/app/(dashboard)/[orgSlug]/users/actions';
import { useOptimistic, useTransition } from 'react';
import type { TimeOffRequest } from '@/types/time-off';
import { useConfirm } from '@/providers/confirmation-provider';

interface UsersPageClientProps {
  initialUsers: User[];
  currentUser?: {
    role?: string;
    roles?: string[];
    id?: string;
  };
  timeOffRequests?: TimeOffRequest[];
}

const AVAILABLE_ROLES = ['user', 'client', 'staff', 'manager', 'super_admin'];

export default function UsersPageClient({ initialUsers, currentUser, timeOffRequests = [] }: UsersPageClientProps) {
  const confirm = useConfirm();
  const orgSlug = useOrgSlug();
  const orgPath = (path: string) => orgSlug ? `/${orgSlug}${path}` : path;
  const [allUsers, setAllUsers] = useState<User[]>(initialUsers);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [, startTransition] = useTransition();

  // Optimistic UI for Users
  const [optimisticUsers, addOptimisticUser] = useOptimistic(
    allUsers,
    (state: User[], action: { type: 'update' | 'delete', user: User }) => {
      switch (action.type) {
        case 'update':
          return state.map(u => u.id === action.user.id ? action.user : u);
        case 'delete':
          return state.filter(u => u.id !== action.user.id);
        default:
          return state;
      }
    }
  );
  
  // Temporary state for editing
  const [editForm, setEditForm] = useState<Partial<User>>({});

  const filteredUsers = optimisticUsers.filter(user =>
    (user.fullName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const startEditing = (user: User) => {
    setEditingId(user.id);
    setEditForm({
        ...user,
        roles: user.roles || ['staff']
    });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditForm({});
  };

  const handleRoleChange = (role: string, checked: boolean) => {
    setEditForm(prev => {
        const currentRoles = prev.roles || [];
        if (checked) {
            return { ...prev, roles: [...currentRoles, role] };
        } else {
            return { ...prev, roles: currentRoles.filter(r => r !== role) };
        }
    });
  };

  const saveUser = async () => {
    if (!editingId) return;
    
    const formData = new FormData();
    formData.set('id', editingId);
    formData.set('fullName', editForm.fullName || '');
    formData.set('email', editForm.email || '');
    formData.set('avatarUrl', editForm.avatarUrl || '');
    formData.set('roles', JSON.stringify(editForm.roles || []));

    // Optimistic Update
    const updatedUser: User = {
        ...allUsers.find(u => u.id === editingId)!,
        fullName: editForm.fullName || '',
        email: editForm.email || '',
        avatarUrl: editForm.avatarUrl || '',
        roles: editForm.roles || [],
    };
    addOptimisticUser({ type: 'update', user: updatedUser });

    setEditingId(null);
    setEditForm({});

    try {
        await updateUser(formData);
        const users = await getUsers();
        startTransition(() => {
            setAllUsers(users);
        });
    } catch (err) {
        console.error(err);
        const users = await getUsers();
        setAllUsers(users);
    }
  };

  const handleDelete = async (user: User) => {
    const confirmed = await confirm({
      title: 'Delete User Access',
      message: `Are you sure you want to delete ${user.fullName || 'this user'}? Their access will be revoked immediately and this action cannot be undone.`,
      confirmText: 'Revoke Access',
      type: 'danger'
    });

    if (confirmed) {
      addOptimisticUser({ type: 'delete', user });
      try {
        const formData = new FormData();
        formData.set('id', user.id);
        await deleteUser(formData);
        const users = await getUsers();
        startTransition(() => {
            setAllUsers(users);
        });
      } catch (err) {
        console.error(err);
        const users = await getUsers();
        setAllUsers(users);
      }
    }
  };

  const userRoles = currentUser?.roles || [];
  const canEdit = userRoles.includes('super_admin');
  const canDelete = userRoles.includes('super_admin');

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6 mb-10">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2 tracking-tight">Team intelligence</h1>
          <p className="text-text-muted text-lg">Cross-functional team coordination & role management.</p>
        </div>
      </div>

      {/* Search & Actions */}
      <div className="flex flex-col lg:flex-row justify-between items-center gap-6 mb-10">
        <div className="relative w-full lg:w-96 group">
          <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-[var(--pastel-indigo)] transition-colors"/>
          <input
            type="text"
            placeholder="Search team members..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-11 pl-10 pr-4 bg-foreground/[0.03] border border-card-border rounded-xl focus:outline-none focus:bg-foreground/[0.06] focus:border-card-border text-foreground placeholder:text-text-muted/50 transition-all text-sm"
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-card rounded-2xl overflow-hidden border border-card-border">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-card-border bg-foreground/[0.03]">
                <th scope="col" className="px-6 py-4 text-left text-[11px] font-bold text-text-muted uppercase tracking-wider whitespace-nowrap">Member</th>
                <th scope="col" className="px-6 py-4 text-left text-[11px] font-bold text-text-muted uppercase tracking-wider whitespace-nowrap">Access Interface</th>
                <th scope="col" className="px-6 py-4 text-left text-[11px] font-bold text-text-muted uppercase tracking-wider whitespace-nowrap">Assigned Roles</th>
                <th scope="col" className="px-6 py-4 text-left text-[11px] font-bold text-text-muted uppercase tracking-wider whitespace-nowrap">System ID</th>
                <th scope="col" className="px-6 py-4 text-left text-[11px] font-bold text-text-muted uppercase tracking-wider whitespace-nowrap">Time Off</th>
                <th scope="col" className="px-6 py-4 text-right text-[11px] font-bold text-text-muted uppercase tracking-wider whitespace-nowrap">Productivity</th>
                {(canEdit || canDelete) && (
                  <th scope="col" className="px-6 py-4 text-right text-[11px] font-bold text-text-muted uppercase tracking-wider whitespace-nowrap">Operations</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-card-border">
              {filteredUsers.map((user) => {
                const isEditing = editingId === user.id;
                return (
                <tr key={user.id} className={`transition-colors ${isEditing ? 'bg-foreground/[0.02]' : 'hover:bg-foreground/[0.02] cursor-pointer group'}`}>
                  {/* Name */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      {!isEditing && (
                          user.avatarUrl ? (
                            <Image 
                              src={user.avatarUrl} 
                              alt={user.fullName || 'User'}
                              width={40}
                              height={40}
                              className="rounded-full object-cover border border-card-border"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center text-white font-bold text-sm">
                              {(user.fullName || user.email).charAt(0).toUpperCase()}
                            </div>
                          )
                      )}
                      {isEditing ? (
                          <input 
                            type="text" 
                            value={editForm.fullName || ''} 
                            onChange={e => setEditForm({...editForm, fullName: e.target.value})}
                            className="bg-foreground/[0.03] border border-card-border rounded px-2 py-1 text-foreground text-sm w-full focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
                          />
                      ) : (
                        <div className="text-sm font-bold text-foreground">{user.fullName || 'Unknown User'}</div>
                      )}
                    </div>
                  </td>

                  {/* Email */}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-text-muted">
                    {isEditing ? (
                        <input 
                            type="email" 
                            value={editForm.email || ''} 
                            onChange={e => setEditForm({...editForm, email: e.target.value})}
                            className="bg-foreground/[0.03] border border-card-border rounded px-2 py-1 text-foreground text-sm w-full focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
                        />
                    ) : user.email}
                  </td>

                  {/* Roles */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    {isEditing ? (
                        <div className="flex flex-wrap gap-2">
                            {AVAILABLE_ROLES.map(role => (
                                <label key={role} className="flex items-center gap-1 text-xs text-text-muted cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        checked={editForm.roles?.includes(role)}
                                        onChange={e => handleRoleChange(role, e.target.checked)}
                                        className="rounded border-card-border bg-foreground/[0.03] text-indigo-500 focus:ring-indigo-500/20"
                                    />
                                    <span className="capitalize">{role.replace('_', ' ')}</span>
                                </label>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-wrap gap-1">
                            {user.roles?.map(role => (
                                <span key={role} className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-tight bg-foreground/[0.06] text-text-muted border border-card-border">
                                {role.replace('_', ' ')}
                                </span>
                            ))}
                        </div>
                    )}
                  </td>

                  {/* Avatar URL */}
                   <td className="px-6 py-4 whitespace-nowrap text-sm text-text-muted">
                    {isEditing ? (
                        <input 
                            type="text" 
                            value={editForm.avatarUrl || ''} 
                            onChange={e => setEditForm({...editForm, avatarUrl: e.target.value})}
                            className="bg-foreground/[0.03] border border-card-border rounded px-2 py-1 text-foreground text-sm w-full focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
                            placeholder="https://..."
                        />
                    ) : (
                        <span className="truncate max-w-[150px] block opacity-50" title={user.avatarUrl || ''}>{user.avatarUrl || '-'}</span>
                    )}
                  </td>

                  {/* Time Off Summary */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    {!isEditing && (() => {
                        const userRequests = timeOffRequests.filter(r => r.user_id === user.id);
                        const approved = userRequests.filter(r => r.status === 'approved').length;
                        const pending = userRequests.filter(r => r.status === 'pending').length;
                        if (approved === 0 && pending === 0) return <span className="text-xs text-zinc-600">—</span>;
                        return (
                            <div className="flex items-center gap-2">
                                <FiSun className="w-3 h-3 text-amber-400" />
                                <div className="flex gap-1.5">
                                    {approved > 0 && (
                                        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-numbers">
                                            {approved} approved
                                        </span>
                                    )}
                                    {pending > 0 && (
                                        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 font-numbers">
                                            {pending} pending
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })()}
                  </td>

                  {/* Productivity Link */}
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    {!isEditing && (
                      <Link
                        href={orgPath(`/users/${user.id}`)}
                        onClick={e => e.stopPropagation()}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 hover:text-indigo-300 border border-indigo-500/20 text-[11px] font-medium uppercase tracking-wider transition-all"
                      >
                        <FiClock className="w-3 h-3" />
                        Timesheet
                        <FiChevronRight className="w-3 h-3" />
                      </Link>
                    )}
                  </td>

                  {/* Actions */}
                  {(canEdit || canDelete) && (
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        {isEditing ? (
                            <>
                                <button
                                    onClick={saveUser}
                                    className="p-1.5 rounded-lg hover:bg-emerald-500/10 text-emerald-500 hover:text-emerald-400 transition-colors"
                                    title="Save"
                                >
                                    <FiCheck className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={cancelEditing}
                                    className="p-1.5 rounded-lg hover:bg-foreground/[0.06] text-text-muted hover:text-foreground transition-colors"
                                    title="Cancel"
                                >
                                    <FiX className="w-4 h-4" />
                                </button>
                            </>
                        ) : (
                            <>
                                {canEdit && (
                                 <button
                                    onClick={() => startEditing(user)}
                                    className="p-1.5 rounded-lg hover:bg-foreground/[0.06] text-text-muted hover:text-foreground transition-colors"
                                    title="Edit"
                                >
                                    <FiEdit2 className="w-4 h-4" />
                                </button>
                                )}
                                {canDelete && (
                                <button
                                    onClick={() => handleDelete(user)}
                                    className="p-1.5 rounded-lg hover:bg-rose-500/10 text-text-muted hover:text-rose-400 transition-colors"
                                    title="Delete"
                                >
                                    <FiTrash2 className="w-4 h-4" />
                                </button>
                                )}
                            </>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              );
              })}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-24 text-center">
                    <EmptyState icon={FiUser} title="No users found" description="No users match your search criteria." />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
