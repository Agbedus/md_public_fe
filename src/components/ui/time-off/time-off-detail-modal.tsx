'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { FiX, FiCheck, FiTrash2, FiLoader, FiFileText, FiExternalLink } from 'react-icons/fi';
import { format, differenceInDays } from 'date-fns';
import { useOrgSlug } from '@/hooks/use-org-slug';

import type { TimeOffRequest } from '@/types/time-off';
import type { User } from '@/types/user';
import { avatarStyle } from '@/lib/avatar-color';
import { formatStatus } from '@/lib/format-status';

interface TimeOffDetailModalProps {
    request: TimeOffRequest | null;
    user: User | undefined;
    onClose: () => void;
    onApprove: (id: number) => void;
    onReject: (id: number) => void;
    onDelete: (id: number) => void;
    actionLoading: 'approve' | 'reject' | 'delete' | null;
}

const statusColors: Record<string, string> = {
    pending: 'bg-warning/10 text-warning-text border-warning/20',
    approved: 'bg-success/10 text-success-text border-success/20',
    rejected: 'bg-danger/10 text-danger-text border-danger/20',
};

const typeColors: Record<string, string> = {
    leave: 'bg-accent/10 text-accent-text border-accent/20',
    off: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
    sick: 'bg-danger/10 text-danger-text border-danger/20',
    other: 'bg-zinc-500/10 text-text-muted border-card-border',
};

const typeLabels: Record<string, string> = {
    leave: 'Leave',
    off: 'Day Off',
    sick: 'Sick Leave',
    other: 'Other',
};

export default function TimeOffDetailModal({
    request,
    user,
    onClose,
    onApprove,
    onReject,
    onDelete,
    actionLoading,
}: TimeOffDetailModalProps) {
    const orgSlug = useOrgSlug();
    const orgPath = (path: string) => orgSlug ? `/${orgSlug}${path}` : path;
    if (!request) return null;

    const days = differenceInDays(new Date(request.end_date), new Date(request.start_date)) + 1;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={e => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div className="absolute inset-0 bg-white/60 dark:bg-black/60 backdrop-blur-md transition-opacity" />

            <div className="relative bg-background border border-card-border rounded-[2.5rem] w-full max-w-lg overflow-hidden">
                {/* Header */}
                <div className="p-6 border-b border-card-border flex justify-between items-center bg-foreground/[0.03]">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-warning/10 border border-warning/20 flex items-center justify-center rounded-full">
                            <FiCheck className="w-5 h-5 text-warning-text" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-foreground">Time-Off Details</h2>
                            <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${statusColors[request.status]}`}>
                                {formatStatus(request.status)}
                            </span>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-foreground/[0.05] transition-colors text-text-muted hover:text-foreground rounded-full"
                    >
                        <FiX size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="space-y-5 p-4 sm:p-6 md:space-y-6 md:p-8">
                    {/* Employee */}
                    <div className="flex items-center gap-4 pb-6 border-b border-card-border">
                        {user?.avatarUrl ? (
                            <Image src={user.avatarUrl} alt={user.fullName || ''} width={48} height={48} className="rounded-full object-cover border border-card-border" />
                        ) : (
                            <div style={avatarStyle(user?.fullName || user?.email)} className="w-12 h-12 rounded-full bg-foreground/[0.06] flex items-center justify-center text-foreground font-bold text-lg">
                                {(user?.fullName || user?.email || '?').charAt(0).toUpperCase()}
                            </div>
                        )}
                        <div>
                            <Link href={orgPath(`/users/${request.user_id}`)} className="text-base font-bold text-foreground hover:text-warning-text transition-colors">
                                {user?.fullName || 'Unknown'}
                            </Link>
                            <p className="text-sm text-text-muted">{user?.email}</p>
                        </div>
                    </div>

                    {/* Detail Grid */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6">
                        <div>
                            <p className="text-[11px] font-bold text-text-muted uppercase tracking-wider mb-1">Type</p>
                            <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${typeColors[request.type] || typeColors.other}`}>
                                {typeLabels[request.type] || request.type}
                            </span>
                        </div>
                        <div>
                            <p className="text-[11px] font-bold text-text-muted uppercase tracking-wider mb-1">Duration</p>
                            <p className="text-sm font-bold text-foreground font-numbers">{days} {days === 1 ? 'day' : 'days'}</p>
                        </div>
                        <div>
                            <p className="text-[11px] font-bold text-text-muted uppercase tracking-wider mb-1">Start Date</p>
                            <p className="text-sm text-foreground">{format(new Date(request.start_date), 'MMM dd, yyyy')}</p>
                        </div>
                        <div>
                            <p className="text-[11px] font-bold text-text-muted uppercase tracking-wider mb-1">End Date</p>
                            <p className="text-sm text-foreground">{format(new Date(request.end_date), 'MMM dd, yyyy')}</p>
                        </div>
                        <div>
                            <p className="text-[11px] font-bold text-text-muted uppercase tracking-wider mb-1">Requested On</p>
                            <p className="text-sm text-foreground">
                                {request.requested_at ? format(new Date(request.requested_at), 'MMM dd, yyyy') : '—'}
                            </p>
                        </div>
                    </div>

                    {/* Justification */}
                    <div className="pt-6 border-t border-card-border">
                        <p className="text-[11px] font-bold text-text-muted uppercase tracking-wider mb-2">Justification</p>
                        <p className="text-sm text-foreground leading-relaxed">
                            {request.justification || <span className="italic text-text-muted/50">No justification provided.</span>}
                        </p>
                    </div>

                    {request.attachment_name && (
                        <div className="border-t border-card-border pt-5">
                            <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-text-muted">Attachment</p>
                            <a
                                href={`/api/time-off/${request.id}/attachment`}
                                target="_blank"
                                rel="noreferrer"
                                className="flex min-h-11 items-center gap-3 rounded-xl border border-card-border bg-input-bg px-3 py-2 transition-colors hover:border-foreground/15 hover:bg-foreground/[0.05]"
                            >
                                <FiFileText className="h-4 w-4 shrink-0 text-danger-text" />
                                <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{request.attachment_name}</span>
                                {request.attachment_size && (
                                    <span className="text-[10px] text-text-muted">{Math.ceil(request.attachment_size / 1024)} KB</span>
                                )}
                                <FiExternalLink className="h-3.5 w-3.5 text-text-muted" />
                            </a>
                        </div>
                    )}

                    {/* ID */}
                    <p className="text-[10px] text-text-muted/30 font-mono">ID: {request.id}</p>
                </div>

                {/* Footer */}
                {request.status === 'pending' && (
                    <div className="flex items-center justify-between border-t border-card-border bg-foreground/[0.02] px-4 py-4 sm:px-6 md:px-8 md:py-5">
                        <button
                            onClick={() => onDelete(request.id)}
                            disabled={actionLoading !== null}
                            className="px-4 py-2 rounded-xl border border-card-border text-text-muted hover:text-danger-text hover:border-danger/20 hover:bg-danger/10 transition-all text-xs font-bold uppercase tracking-wider disabled:opacity-50 flex items-center gap-2"
                        >
                            {actionLoading === 'delete' ? <FiLoader className="h-4 w-4 animate-spin" /> : <FiTrash2 className="w-3.5 h-3.5" />} Delete
                        </button>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => onReject(request.id)}
                                disabled={actionLoading !== null}
                                className="px-5 py-2.5 rounded-xl bg-danger/10 border border-danger/20 text-danger-text hover:bg-danger/20 transition-all text-xs font-bold uppercase tracking-wider disabled:opacity-50 flex items-center gap-2"
                            >
                                {actionLoading === 'reject' ? (
                                    <FiLoader className="h-4 w-4 animate-spin" />
                                ) : (
                                    <FiX className="w-3.5 h-3.5" />
                                )}
                                Reject
                            </button>
                            <button
                                onClick={() => onApprove(request.id)}
                                disabled={actionLoading !== null}
                                className="md-btn md-btn-primary md-btn-sm"
                            >
                                {actionLoading === 'approve' ? (
                                    <FiLoader className="h-4 w-4 animate-spin" />
                                ) : (
                                    <FiCheck className="w-3.5 h-3.5" />
                                )}
                                Approve
                            </button>
                        </div>
                    </div>
                )}

                {request.status !== 'pending' && (
                    <div className="flex items-center justify-between border-t border-card-border bg-foreground/[0.02] px-4 py-4 sm:px-6 md:px-8 md:py-5">
                        <button
                            onClick={() => onDelete(request.id)}
                            disabled={actionLoading !== null}
                            className="px-4 py-2 rounded-xl border border-card-border text-text-muted hover:text-danger-text hover:border-danger/20 hover:bg-danger/10 transition-all text-xs font-bold uppercase tracking-wider disabled:opacity-50 flex items-center gap-2"
                        >
                            {actionLoading === 'delete' ? <FiLoader className="h-4 w-4 animate-spin" /> : <FiTrash2 className="w-3.5 h-3.5" />} Delete
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
