'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { FiX, FiCheck, FiTrash2 } from 'react-icons/fi';
import { format, differenceInDays } from 'date-fns';
import { useOrgSlug } from '@/hooks/use-org-slug';

import type { TimeOffRequest } from '@/types/time-off';
import type { User } from '@/types/user';

interface TimeOffDetailModalProps {
    request: TimeOffRequest | null;
    user: User | undefined;
    onClose: () => void;
    onApprove: (id: number) => void;
    onReject: (id: number) => void;
    onDelete: (id: number) => void;
    actionLoading: boolean;
}

const statusColors: Record<string, string> = {
    pending: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    approved: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    rejected: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
};

const typeColors: Record<string, string> = {
    leave: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    off: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
    sick: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    other: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
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

            <div className="relative bg-background border border-card-border rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)]">
                {/* Header */}
                <div className="p-6 border-b border-card-border flex justify-between items-center bg-foreground/[0.03]">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                            <FiCheck className="w-5 h-5 text-amber-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-foreground">Time-Off Details</h2>
                            <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${statusColors[request.status]}`}>
                                {request.status}
                            </span>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-foreground/[0.05] rounded-xl transition-colors text-text-muted hover:text-foreground"
                    >
                        <FiX size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-8 space-y-6">
                    {/* Employee */}
                    <div className="flex items-center gap-4 pb-6 border-b border-card-border">
                        {user?.avatarUrl ? (
                            <Image src={user.avatarUrl} alt={user.fullName || ''} width={48} height={48} className="rounded-full object-cover border border-card-border" />
                        ) : (
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white font-bold text-lg">
                                {(user?.fullName || user?.email || '?').charAt(0).toUpperCase()}
                            </div>
                        )}
                        <div>
                            <Link href={orgPath(`/users/${request.user_id}`)} className="text-base font-bold text-foreground hover:text-amber-400 transition-colors">
                                {user?.fullName || 'Unknown'}
                            </Link>
                            <p className="text-sm text-text-muted">{user?.email}</p>
                        </div>
                    </div>

                    {/* Detail Grid */}
                    <div className="grid grid-cols-2 gap-6">
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

                    {/* ID */}
                    <p className="text-[10px] text-text-muted/30 font-mono">ID: {request.id}</p>
                </div>

                {/* Footer */}
                {request.status === 'pending' && (
                    <div className="flex items-center justify-between px-8 py-5 border-t border-card-border bg-foreground/[0.02]">
                        <button
                            onClick={() => onDelete(request.id)}
                            disabled={actionLoading}
                            className="px-4 py-2 rounded-xl border border-card-border text-text-muted hover:text-rose-400 hover:border-rose-500/20 hover:bg-rose-500/10 transition-all text-xs font-bold uppercase tracking-wider disabled:opacity-50 flex items-center gap-2"
                        >
                            <FiTrash2 className="w-3.5 h-3.5" /> Delete
                        </button>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => onReject(request.id)}
                                disabled={actionLoading}
                                className="px-5 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 transition-all text-xs font-bold uppercase tracking-wider disabled:opacity-50 flex items-center gap-2"
                            >
                                {actionLoading ? (
                                    <div className="w-3.5 h-3.5 border-2 border-rose-400 border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <FiX className="w-3.5 h-3.5" />
                                )}
                                Reject
                            </button>
                            <button
                                onClick={() => onApprove(request.id)}
                                disabled={actionLoading}
                                className="px-5 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 transition-all text-xs font-bold uppercase tracking-wider disabled:opacity-50 flex items-center gap-2"
                            >
                                {actionLoading ? (
                                    <div className="w-3.5 h-3.5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <FiCheck className="w-3.5 h-3.5" />
                                )}
                                Approve
                            </button>
                        </div>
                    </div>
                )}

                {request.status !== 'pending' && (
                    <div className="flex items-center justify-between px-8 py-5 border-t border-card-border bg-foreground/[0.02]">
                        <button
                            onClick={() => onDelete(request.id)}
                            disabled={actionLoading}
                            className="px-4 py-2 rounded-xl border border-card-border text-text-muted hover:text-rose-400 hover:border-rose-500/20 hover:bg-rose-500/10 transition-all text-xs font-bold uppercase tracking-wider disabled:opacity-50 flex items-center gap-2"
                        >
                            <FiTrash2 className="w-3.5 h-3.5" /> Delete
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
