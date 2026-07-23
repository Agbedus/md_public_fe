'use client';

import React, { useState, useMemo, useTransition, Fragment } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { FiSearch, FiCheck, FiX, FiSun, FiFilter, FiCalendar, FiTrash2 } from 'react-icons/fi';
import { format, differenceInDays } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from '@/lib/toast';
import { useOrgSlug } from '@/hooks/use-org-slug';

import type { TimeOffRequest, TimeOffStatus, TimeOffType } from '@/types/time-off';
import type { User } from '@/types/user';
import { approveTimeOffRequest, rejectTimeOffRequest, deleteTimeOffRequest } from '@/app/(dashboard)/[orgSlug]/time-off/actions';
import { useConfirm } from '@/providers/confirmation-provider';
import TimeOffDetailModal from './time-off-detail-modal';

interface TimeOffAdminClientProps {
    initialRequests: TimeOffRequest[];
    users: User[];
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
    sick: 'Sick',
    other: 'Other',
};

export default function TimeOffAdminClient({ initialRequests, users }: TimeOffAdminClientProps) {
    const confirm = useConfirm();
    const orgSlug = useOrgSlug();
    const orgPath = (path: string) => orgSlug ? `/${orgSlug}${path}` : path;
    const [requests, setRequests] = useState(initialRequests);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState<string>('');
    const [filterType, setFilterType] = useState<string>('');
    const [actionLoading, setActionLoading] = useState<number | null>(null);
    const [selectedRequest, setSelectedRequest] = useState<TimeOffRequest | null>(null);
    const [, startTransition] = useTransition();

    const getUserById = (id: string) => users.find(u => u.id === id);

    const filteredRequests = useMemo(() => {
        return requests.filter(r => {
            const user = users.find(u => u.id === r.user_id);
            const name = user?.fullName || user?.email || '';

            const matchesSearch = !searchQuery ||
                name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (r.justification || '').toLowerCase().includes(searchQuery.toLowerCase());

            const matchesStatus = !filterStatus || r.status === filterStatus;
            const matchesType = !filterType || r.type === filterType;

            return matchesSearch && matchesStatus && matchesType;
        });
    }, [requests, searchQuery, filterStatus, filterType, users]);

    // Stats
    const pending = requests.filter(r => r.status === 'pending').length;
    const approved = requests.filter(r => r.status === 'approved').length;
    const rejected = requests.filter(r => r.status === 'rejected').length;

    const handleApprove = async (id: number) => {
        setActionLoading(id);
        // Optimistic
        setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'approved' as const } : r));
        try {
            const result = await approveTimeOffRequest(id);
            if (!result.success) {
                toast.error(result.error || 'Failed to approve');
                setRequests(initialRequests); // revert
            } else {
                toast.success('Request approved');
            }
        } catch {
            toast.error('An error occurred');
            setRequests(initialRequests);
        } finally {
            setActionLoading(null);
        }
    };

    const handleReject = async (id: number) => {
        setActionLoading(id);
        setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'rejected' as const } : r));
        try {
            const result = await rejectTimeOffRequest(id);
            if (!result.success) {
                toast.error(result.error || 'Failed to reject');
                setRequests(initialRequests);
            } else {
                toast.success('Request rejected');
            }
        } catch {
            toast.error('An error occurred');
            setRequests(initialRequests);
        } finally {
            setActionLoading(null);
        }
    };

    const handleDelete = async (id: number) => {
        const confirmed = await confirm({
            title: 'Delete Time-Off Request',
            message: 'Are you sure you want to delete this time-off request permanently? This action cannot be undone.',
            confirmText: 'Delete Request',
            type: 'danger'
        });

        if (!confirmed) return;
        setActionLoading(id);
        setRequests(prev => prev.filter(r => r.id !== id));
        try {
            const result = await deleteTimeOffRequest(id);
            if (!result.success) {
                toast.error(result.error || 'Failed to delete');
                setRequests(initialRequests);
            } else {
                toast.success('Request deleted');
            }
        } catch {
            toast.error('An error occurred');
            setRequests(initialRequests);
        } finally {
            setActionLoading(null);
        }
    };

    return (
        <>
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6">
                <div>
                    <h1 className="text-3xl font-bold text-foreground mb-2 tracking-tight">
                        Time off requests
                    </h1>
                    <p className="text-text-muted text-lg">Review and manage team time-off requests.</p>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
                {[
                    { label: 'Pending', value: pending, color: 'amber' },
                    { label: 'Approved', value: approved, color: 'emerald' },
                    { label: 'Rejected', value: rejected, color: 'rose' },
                ].map(({ label, value, color }) => {
                    const colorClasses: Record<string, string> = {
                        amber: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
                        emerald: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
                        rose: 'bg-rose-500/10 border-rose-500/20 text-rose-400',
                    };
                    return (
                        <motion.div
                            key={label}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-card rounded-2xl p-5 border border-card-border"
                        >
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center border mb-3 ${colorClasses[color]}`}>
                                <FiSun className="w-4 h-4" />
                            </div>
                            <p className="text-[11px] font-bold text-text-muted uppercase tracking-wider mb-1">{label}</p>
                            <p className="text-3xl font-bold font-numbers text-foreground">{value}</p>
                        </motion.div>
                    );
                })}
            </div>

            {/* Filters */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                <div className="flex items-center gap-2 w-full overflow-x-auto pb-2 scrollbar-hide">
                    <div className="relative flex-1 min-w-[140px] max-w-sm group">
                        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-amber-400 transition-colors w-3.5 h-3.5" />
                        <input
                            type="text"
                            placeholder="Search by name or reason..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full h-11 pl-8 pr-4 bg-foreground/[0.03] border border-card-border rounded-xl focus:outline-none focus:bg-foreground/[0.06] focus:border-card-border text-foreground placeholder:text-text-muted/50 transition-all text-sm"
                        />
                    </div>

                    <div className="relative group flex-shrink-0">
                        <div className="h-11 w-36 bg-foreground/[0.03] border border-card-border rounded-xl flex items-center pl-3 relative overflow-hidden focus-within:outline-none focus-within:bg-foreground/[0.06] transition-all">
                            <FiFilter className="text-text-muted absolute left-3 top-1/2 -translate-y-1/2 z-10 w-3.5 h-3.5" />
                            <select
                                value={filterStatus}
                                onChange={e => setFilterStatus(e.target.value)}
                                className="bg-transparent border-none pl-8 pr-4 w-full h-full text-text-muted cursor-pointer text-[11px] font-bold uppercase tracking-wider appearance-none focus:outline-none"
                            >
                                <option value="" className="bg-card">All Status</option>
                                <option value="pending" className="bg-card">Pending</option>
                                <option value="approved" className="bg-card">Approved</option>
                                <option value="rejected" className="bg-card">Rejected</option>
                            </select>
                        </div>
                    </div>

                    <div className="relative group flex-shrink-0">
                        <div className="h-11 w-36 bg-foreground/[0.03] border border-card-border rounded-xl flex items-center pl-3 relative overflow-hidden focus-within:outline-none focus-within:bg-foreground/[0.06] transition-all">
                            <FiCalendar className="text-text-muted absolute left-3 top-1/2 -translate-y-1/2 z-10 w-3.5 h-3.5" />
                            <select
                                value={filterType}
                                onChange={e => setFilterType(e.target.value)}
                                className="bg-transparent border-none pl-8 pr-4 w-full h-full text-text-muted cursor-pointer text-[11px] font-bold uppercase tracking-wider appearance-none focus:outline-none"
                            >
                                <option value="" className="bg-card">All Types</option>
                                <option value="leave" className="bg-card">Leave</option>
                                <option value="off" className="bg-card">Day Off</option>
                                <option value="sick" className="bg-card">Sick</option>
                                <option value="other" className="bg-card">Other</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-card rounded-2xl overflow-hidden border border-card-border">
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        <caption className="sr-only">Time Off Requests</caption>
                        <thead>
                            <tr className="border-b border-card-border bg-foreground/[0.03] text-left">
                                <th scope="col" className="px-6 py-4 text-[11px] font-bold text-text-muted uppercase tracking-wider whitespace-nowrap">Employee</th>
                                <th scope="col" className="px-6 py-4 text-[11px] font-bold text-text-muted uppercase tracking-wider whitespace-nowrap">Type</th>
                                <th scope="col" className="px-6 py-4 text-[11px] font-bold text-text-muted uppercase tracking-wider whitespace-nowrap">Period</th>
                                <th scope="col" className="px-6 py-4 text-[11px] font-bold text-text-muted uppercase tracking-wider whitespace-nowrap">Days</th>
                                <th scope="col" className="px-6 py-4 text-[11px] font-bold text-text-muted uppercase tracking-wider whitespace-nowrap">Justification</th>
                                <th scope="col" className="px-6 py-4 text-[11px] font-bold text-text-muted uppercase tracking-wider whitespace-nowrap">Status</th>
                                <th scope="col" className="px-6 py-4 text-[11px] font-bold text-text-muted uppercase tracking-wider whitespace-nowrap">Requested</th>
                                <th scope="col" className="px-6 py-4 text-right text-[11px] font-bold text-text-muted uppercase tracking-wider whitespace-nowrap">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-card-border">
                            <AnimatePresence initial={false}>
                                {filteredRequests.length === 0 && (
                                    <tr>
                                        <td colSpan={8} className="px-6 py-16 text-center">
                                            <FiSun className="w-8 h-8 text-text-muted/20 mx-auto mb-3" />
                                            <p className="text-text-muted text-sm">No time-off requests found.</p>
                                        </td>
                                    </tr>
                                )}
                                {filteredRequests.map(req => {
                                    const user = getUserById(req.user_id);
                                    const days = differenceInDays(new Date(req.end_date), new Date(req.start_date)) + 1;
                                    return (
                                        <motion.tr
                                            key={req.id}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0, height: 0 }}
                                            onClick={() => setSelectedRequest(req)}
                                            className="hover:bg-white/[0.02] transition-colors cursor-pointer"
                                        >
                                            {/* Employee */}
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-3">
                                                    {user?.avatarUrl ? (
                                                        <Image src={user.avatarUrl} alt={user.fullName || ''} width={32} height={32} className="rounded-full object-cover border border-card-border" />
                                                    ) : (
                                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white font-bold text-xs">
                                                            {(user?.fullName || user?.email || '?').charAt(0).toUpperCase()}
                                                        </div>
                                                    )}
                                                    <div>
                                                        <Link href={orgPath(`/users/${req.user_id}`)} className="text-sm font-bold text-foreground hover:text-amber-400 transition-colors" onClick={e => e.stopPropagation()}>
                                                            {user?.fullName || 'Unknown'}
                                                        </Link>
                                                        <p className="text-[11px] text-text-muted/50">{user?.email}</p>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Type */}
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${typeColors[req.type] || typeColors.other}`}>
                                                    {typeLabels[req.type] || req.type}
                                                </span>
                                            </td>

                                            {/* Period */}
                                            <td className="px-6 py-4 whitespace-nowrap text-xs text-text-muted tabular-nums">
                                                {format(new Date(req.start_date), 'MMM dd')} — {format(new Date(req.end_date), 'MMM dd, yyyy')}
                                            </td>
                                            {/* Days */}
                                            <td className="px-6 py-4 whitespace-nowrap text-xs font-bold text-foreground font-numbers">
                                                {days}d
                                            </td>

                                            {/* Justification */}
                                            <td className="px-6 py-4 text-xs text-text-muted max-w-[200px] truncate">
                                                {req.justification || '—'}
                                            </td>

                                            {/* Status */}
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${statusColors[req.status]}`}>
                                                    {req.status}
                                                </span>
                                            </td>

                                            {/* Requested */}
                                            <td className="px-6 py-4 whitespace-nowrap text-xs text-text-muted tabular-nums">
                                                {req.requested_at ? format(new Date(req.requested_at), 'MMM dd, yyyy') : '—'}
                                            </td>

                                            {/* Actions */}
                                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    {req.status === 'pending' && (
                                                        <>
                                                            <button
                                                                onClick={e => { e.stopPropagation(); handleApprove(req.id); }}
                                                                disabled={actionLoading === req.id}
                                                                className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 transition-all disabled:opacity-50"
                                                                title="Approve"
                                                            >
                                                                {actionLoading === req.id ? (
                                                                    <div className="w-3.5 h-3.5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                                                                ) : (
                                                                    <FiCheck className="w-3.5 h-3.5" />
                                                                )}
                                                            </button>
                                                            <button
                                                                onClick={e => { e.stopPropagation(); handleReject(req.id); }}
                                                                disabled={actionLoading === req.id}
                                                                className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-all disabled:opacity-50"
                                                                title="Reject"
                                                            >
                                                                <FiX className="w-3.5 h-3.5" />
                                                            </button>
                                                        </>
                                                    )}
                                                    <button
                                                        onClick={e => { e.stopPropagation(); handleDelete(req.id); }}
                                                        disabled={actionLoading === req.id}
                                                        className="p-1.5 rounded-lg hover:bg-rose-500/10 text-text-muted hover:text-rose-400 transition-all disabled:opacity-50"
                                                        title="Delete"
                                                    >
                                                        <FiTrash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </td>
                                        </motion.tr>
                                    );
                                })}
                            </AnimatePresence>
                        </tbody>
                    </table>
                </div>
            </div>
            </div>

            <TimeOffDetailModal
                request={selectedRequest}
                user={selectedRequest ? getUserById(selectedRequest.user_id) : undefined}
                onClose={() => setSelectedRequest(null)}
                onApprove={handleApprove}
                onReject={handleReject}
                onDelete={handleDelete}
                actionLoading={actionLoading === selectedRequest?.id}
            />
        </>
    );
}
