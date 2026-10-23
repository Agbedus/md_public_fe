'use client';

import { StatTile } from '@/components/ui/stat-tile';
import React, { useState, useMemo, useTransition, Fragment } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FiSearch, FiCheck, FiClock, FiX, FiSun, FiCalendar, FiTrash2, FiPlus } from 'react-icons/fi';
import { format, differenceInDays } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from '@/lib/toast';
import { useOrgSlug } from '@/hooks/use-org-slug';

import type { TimeOffRequest, TimeOffStatus, TimeOffType } from '@/types/time-off';
import type { User } from '@/types/user';
import { approveTimeOffRequest, rejectTimeOffRequest, deleteTimeOffRequest } from '@/app/(dashboard)/[orgSlug]/time-off/actions';
import { useConfirm } from '@/providers/confirmation-provider';
import TimeOffDetailModal from './time-off-detail-modal';
import TimeOffModal from '@/components/ui/calendar/TimeOffModal';
import { avatarStyle } from '@/lib/avatar-color';
import { TabPill } from '@/components/ui/tab-pill';
import { formatStatus } from '@/lib/format-status';

import { Spinner } from '@/components/ui/busy-icon';
interface TimeOffAdminClientProps {
    initialRequests: TimeOffRequest[];
    users: User[];
}

const statusColors: Record<string, string> = {
    pending: 'bg-warning/15 text-warning-text',
    approved: 'bg-success/15 text-success-text',
    rejected: 'bg-danger/12 text-danger-text',
};

const typeColors: Record<string, string> = {
    leave: 'bg-accent/12 text-accent-text',
    off: 'bg-[color-mix(in_oklab,var(--status-qa)_15%,transparent)] text-[var(--status-qa)]',
    sick: 'bg-danger/12 text-danger-text',
    other: 'bg-warning/15 text-warning-text',
};

const typeLabels: Record<string, string> = {
    leave: 'Leave',
    off: 'Day off',
    sick: 'Sick',
    other: 'Other',
};

export default function TimeOffAdminClient({ initialRequests, users }: TimeOffAdminClientProps) {
    const confirm = useConfirm();
    const router = useRouter();
    const orgSlug = useOrgSlug();
    const orgPath = (path: string) => orgSlug ? `/${orgSlug}${path}` : path;
    const [requests, setRequests] = useState(initialRequests);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState<string>('');
    const [filterType, setFilterType] = useState<string>('');
    const [actionLoading, setActionLoading] = useState<{ id: number; type: 'approve' | 'reject' | 'delete' } | null>(null);
    const [selectedRequest, setSelectedRequest] = useState<TimeOffRequest | null>(null);
    const [requestModalOpen, setRequestModalOpen] = useState(false);
    const [, startTransition] = useTransition();

    // Server-refetched data (e.g. after submitting a new request via
    // router.refresh()) lands here as a new `initialRequests` prop — sync it
    // in, since useState's initial value only applies on mount.
    React.useEffect(() => {
        const frame = window.requestAnimationFrame(() => setRequests(initialRequests));
        return () => window.cancelAnimationFrame(frame);
    }, [initialRequests]);

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
        const snapshot = requests;
        setActionLoading({ id, type: 'approve' });
        setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'approved' as const } : r));
        setSelectedRequest(prev => prev?.id === id ? { ...prev, status: 'approved' as const } : prev);
        try {
            const result = await approveTimeOffRequest(id);
            if (!result.success) {
                toast.error(result.error || 'Failed to approve');
                setRequests(snapshot);
                setSelectedRequest(snapshot.find(request => request.id === id) ?? null);
            } else {
                toast.success('Request approved');
            }
        } catch {
            toast.error('An error occurred');
            setRequests(snapshot);
            setSelectedRequest(snapshot.find(request => request.id === id) ?? null);
        } finally {
            setActionLoading(null);
        }
    };

    const handleReject = async (id: number) => {
        const snapshot = requests;
        setActionLoading({ id, type: 'reject' });
        setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'rejected' as const } : r));
        setSelectedRequest(prev => prev?.id === id ? { ...prev, status: 'rejected' as const } : prev);
        try {
            const result = await rejectTimeOffRequest(id);
            if (!result.success) {
                toast.error(result.error || 'Failed to reject');
                setRequests(snapshot);
                setSelectedRequest(snapshot.find(request => request.id === id) ?? null);
            } else {
                toast.success('Request rejected');
            }
        } catch {
            toast.error('An error occurred');
            setRequests(snapshot);
            setSelectedRequest(snapshot.find(request => request.id === id) ?? null);
        } finally {
            setActionLoading(null);
        }
    };

    const handleDelete = async (id: number) => {
        const confirmed = await confirm({
            title: 'Delete time-off request',
            message: 'Are you sure you want to delete this time-off request permanently? This action cannot be undone.',
            confirmText: 'Delete request',
            type: 'danger'
        });

        if (!confirmed) return;
        const snapshot = requests;
        setActionLoading({ id, type: 'delete' });
        setRequests(prev => prev.filter(r => r.id !== id));
        setSelectedRequest(null);
        try {
            const result = await deleteTimeOffRequest(id);
            if (!result.success) {
                toast.error(result.error || 'Failed to delete');
                setRequests(snapshot);
            } else {
                toast.success('Request deleted');
            }
        } catch {
            toast.error('An error occurred');
            setRequests(snapshot);
        } finally {
            setActionLoading(null);
        }
    };

    return (
        <>
        <div className="md-zen space-y-5 md:space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6">
                <div>
                    <h1 className="m-1 text-3xl font-bold tracking-tight text-foreground">
                        Time off
                    </h1>
                    <p className="m-1 text-sm text-text-muted">Review and manage your team’s requests.</p>
                </div>
                <button
                    onClick={() => setRequestModalOpen(true)}
                    className="md-btn md-btn-primary self-start md:self-auto"
                >
                    Request time off
                    <span className="md-btn-chip"><FiPlus /></span>
                </button>
            </div>

            {/* Stats: click one to filter the list */}
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {[
                    { key: '', label: 'All requests', value: requests.length, icon: FiCalendar, tone: 'var(--accent)' },
                    { key: 'pending', label: 'Pending', value: pending, icon: FiClock, tone: 'var(--warning)' },
                    { key: 'approved', label: 'Approved', value: approved, icon: FiCheck, tone: 'var(--success)' },
                    { key: 'rejected', label: 'Rejected', value: rejected, icon: FiX, tone: 'var(--danger)' },
                ].map(({ key, ...stat }) => (
                    <StatTile key={stat.label} {...stat} isActive={filterStatus === key} onClick={() => setFilterStatus(key)} />
                ))}
            </div>

            {/* Filters */}
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="relative w-full lg:max-w-sm">
                    <FiSearch className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                    <input
                        type="text"
                        placeholder="Search by name or reason"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="h-11 w-full border border-card-border bg-input-bg pl-10 pr-11 text-sm text-foreground placeholder:text-text-muted"
                    />
                    {searchQuery && (
                        <button type="button" onClick={() => setSearchQuery('')} aria-label="Clear time-off search" className="absolute right-1 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full text-text-muted transition-colors hover:bg-foreground/[0.05] hover:text-foreground">
                            <FiX className="h-4 w-4" />
                        </button>
                    )}
                </div>

                <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 py-1 scrollbar-hide" role="group" aria-label="Filter by type">
                    {([['', 'All types'], ['leave', 'Leave'], ['off', 'Day off'], ['sick', 'Sick'], ['other', 'Other']] as const).map(([value, label]) => (
                        <button
                            key={value || 'all'}
                            type="button"
                            onClick={() => setFilterType(value)}
                            aria-pressed={filterType === value}
                            className={`relative isolate inline-flex min-h-9 shrink-0 items-center whitespace-nowrap rounded-full px-3.5 text-sm transition-colors active:scale-[0.97] ${filterType === value ? 'text-on-ink' : 'bg-foreground/[0.04] text-text-secondary hover:bg-foreground/[0.07] hover:text-foreground'}`}
                        >
                            {filterType === value && <TabPill />}
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Table */}
            <div className="overflow-hidden rounded-[28px] bg-card">
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        <caption className="sr-only">Time-off requests</caption>
                        <thead>
                            <tr className="border-b border-card-border text-left">
                                <th scope="col" className="px-6 py-4 whitespace-nowrap text-xs font-medium text-text-muted">Employee</th>
                                <th scope="col" className="px-6 py-4 whitespace-nowrap text-xs font-medium text-text-muted">Type</th>
                                <th scope="col" className="px-6 py-4 whitespace-nowrap text-xs font-medium text-text-muted">Period</th>
                                <th scope="col" className="px-6 py-4 whitespace-nowrap text-xs font-medium text-text-muted">Days</th>
                                <th scope="col" className="px-6 py-4 whitespace-nowrap text-xs font-medium text-text-muted">Justification</th>
                                <th scope="col" className="px-6 py-4 whitespace-nowrap text-xs font-medium text-text-muted">Status</th>
                                <th scope="col" className="px-6 py-4 whitespace-nowrap text-xs font-medium text-text-muted">Requested</th>
                                <th scope="col" className="px-6 py-4 text-right whitespace-nowrap text-xs font-medium text-text-muted">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-card-border">
                            <AnimatePresence initial={false}>
                                {filteredRequests.length === 0 && (
                                    <tr>
                                        <td colSpan={8} className="px-6 py-16 text-center">
                                            <span className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-foreground/[0.05]"><FiSun className="h-5 w-5 text-text-muted" /></span>
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
                                            className={`cursor-pointer transition-colors hover:bg-foreground/[0.03] ${req.status === 'pending' ? 'bg-warning/[0.05]' : ''}`}
                                        >
                                            {/* Employee */}
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-3">
                                                    {user?.avatarUrl ? (
                                                        <Image src={user.avatarUrl} alt={user.fullName || ''} width={32} height={32} className="rounded-full object-cover border border-card-border" />
                                                    ) : (
                                                        <div style={avatarStyle(user?.fullName || user?.email)} className="w-8 h-8 rounded-full bg-foreground/[0.06] flex items-center justify-center text-foreground font-bold text-xs">
                                                            {(user?.fullName || user?.email || '?').charAt(0).toUpperCase()}
                                                        </div>
                                                    )}
                                                    <div>
                                                        <Link href={orgPath(`/users/${req.user_id}`)} className="text-sm font-medium text-foreground transition-colors hover:text-accent-text" onClick={e => e.stopPropagation()}>
                                                            {user?.fullName || 'Unknown'}
                                                        </Link>
                                                        <p className="text-xs text-text-muted">{user?.email}</p>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Type */}
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${typeColors[req.type] || typeColors.other}`}>
                                                    {typeLabels[req.type] || req.type}
                                                </span>
                                            </td>

                                            {/* Period */}
                                            <td className="px-6 py-4 whitespace-nowrap text-xs text-text-muted tabular-nums">
                                                {format(new Date(req.start_date), 'MMM dd')} — {format(new Date(req.end_date), 'MMM dd, yyyy')}
                                            </td>
                                            {/* Days */}
                                            <td className="px-6 py-4 whitespace-nowrap font-numbers text-sm font-semibold text-foreground">
                                                {days}d
                                            </td>

                                            {/* Justification */}
                                            <td className="px-6 py-4 text-xs text-text-muted max-w-[200px] truncate">
                                                {req.justification || '—'}
                                            </td>

                                            {/* Status */}
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusColors[req.status]}`}>
                                                    {formatStatus(req.status)}
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
                                                                disabled={actionLoading?.id === req.id}
                                                                className="grid h-9 w-9 place-items-center bg-success/10 hover:bg-success/20 text-success-text transition-[transform,opacity,background-color] duration-150 active:scale-[0.96] disabled:cursor-wait disabled:opacity-50 rounded-full"
                                                                data-tooltip="Approve" aria-label="Approve"
                                                            >
                                                                {actionLoading?.id === req.id && actionLoading.type === 'approve' ? (
                                                                    <Spinner className="h-4 w-4" />
                                                                ) : (
                                                                    <FiCheck className="w-3.5 h-3.5" />
                                                                )}
                                                            </button>
                                                            <button
                                                                onClick={e => { e.stopPropagation(); handleReject(req.id); }}
                                                                disabled={actionLoading?.id === req.id}
                                                                className="grid h-9 w-9 place-items-center bg-danger/10 hover:bg-danger/20 text-danger-text transition-[transform,opacity,background-color] duration-150 active:scale-[0.96] disabled:cursor-wait disabled:opacity-50 rounded-full"
                                                                data-tooltip="Reject" aria-label="Reject"
                                                            >
                                                                {actionLoading?.id === req.id && actionLoading.type === 'reject' ? <Spinner className="h-4 w-4" /> : <FiX className="w-3.5 h-3.5" />}
                                                            </button>
                                                        </>
                                                    )}
                                                    <button
                                                        onClick={e => { e.stopPropagation(); handleDelete(req.id); }}
                                                        disabled={actionLoading?.id === req.id}
                                                        className="grid h-9 w-9 place-items-center hover:bg-danger/10 text-text-muted hover:text-danger-text transition-[transform,opacity,background-color] duration-150 active:scale-[0.96] disabled:cursor-wait disabled:opacity-50 rounded-full"
                                                        data-tooltip="Delete" aria-label="Delete"
                                                    >
                                                        {actionLoading?.id === req.id && actionLoading.type === 'delete' ? <Spinner className="h-4 w-4" /> : <FiTrash2 className="w-3.5 h-3.5" />}
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
                actionLoading={actionLoading && actionLoading.id === selectedRequest?.id ? actionLoading.type : null}
            />

            <TimeOffModal
                open={requestModalOpen}
                onClose={() => setRequestModalOpen(false)}
                onCreated={(request) => {
                    if (request) setRequests((current) => [request, ...current.filter((item) => item.id !== request.id)]);
                    startTransition(() => router.refresh());
                }}
            />
        </>
    );
}
