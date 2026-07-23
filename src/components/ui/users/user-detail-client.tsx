'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { User } from '@/types/user';
import { Task } from '@/types/task';
import { useOrgSlug } from '@/hooks/use-org-slug';
import { FiArrowLeft, FiClock, FiCheckSquare, FiActivity, FiUser, FiCalendar, FiSun, FiCheck, FiX } from 'react-icons/fi';
import { format, differenceInSeconds, parseISO, differenceInDays } from 'date-fns';
import { motion } from 'framer-motion';
import { ActivityHeatmap } from '@/components/ui/client-charts';
import type { TimeOffRequest } from '@/types/time-off';
import { approveTimeOffRequest, rejectTimeOffRequest } from '@/app/(dashboard)/[orgSlug]/time-off/actions';
import { toast } from '@/lib/toast';

interface TimeLog {
    id: number;
    task_id: number;
    user_id: string;
    start_time: string;
    end_time: string | null;
}

interface ActivityItem {
    date: string;
    count: number;
    level: number;
}

interface UserDetailClientProps {
    user: User;
    tasks: Task[];
    timeLogs: TimeLog[];
    timeOffRequests?: TimeOffRequest[];
    activityData?: ActivityItem[];
    isSuperAdmin?: boolean;
}

function formatDuration(seconds: number): string {
    if (seconds < 60) return `${seconds}s`;
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
}

function getLogDuration(log: TimeLog): number {
    if (!log.start_time || !log.end_time) return 0;
    try {
        return Math.max(0, differenceInSeconds(parseISO(log.end_time), parseISO(log.start_time)));
    } catch {
        return 0;
    }
}

const statusColors: Record<string, string> = {
    pending: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    approved: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    rejected: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
};

const typeLabels: Record<string, string> = {
    leave: 'Leave',
    off: 'Day Off',
    sick: 'Sick',
    other: 'Other',
};

export default function UserDetailClient({ 
    user, 
    tasks, 
    timeLogs, 
    timeOffRequests = [], 
    activityData = [], 
    isSuperAdmin = false 
}: UserDetailClientProps) {
    const orgSlug = useOrgSlug();
    const orgPath = (path: string) => orgSlug ? `/${orgSlug}${path}` : path;
    const [actionLoading, setActionLoading] = useState<number | null>(null);
    const [localTimeOff, setLocalTimeOff] = useState(timeOffRequests);

    const totalSeconds = timeLogs.reduce((sum, log) => sum + getLogDuration(log), 0);
    const totalHours = (totalSeconds / 3600).toFixed(1);
    const doneTasks = tasks.filter(t => t.status === 'DONE').length;
    const inProgressTasks = tasks.filter(t => t.status === 'IN_PROGRESS').length;
    const completionRate = tasks.length > 0 ? Math.round((doneTasks / tasks.length) * 100) : 0;

    // Group logs by task
    const logsByTask: Record<number, TimeLog[]> = {};
    timeLogs.forEach(log => {
        if (!logsByTask[log.task_id]) logsByTask[log.task_id] = [];
        logsByTask[log.task_id].push(log);
    });

    // Hours per task for chart
    const taskHours = Object.entries(logsByTask).map(([taskId, logs]) => {
        const task = tasks.find(t => t.id === Number(taskId));
        const secs = logs.reduce((s, l) => s + getLogDuration(l), 0);
        return { name: task?.name || `Task #${taskId}`, hours: secs / 3600 };
    }).sort((a, b) => b.hours - a.hours).slice(0, 8);

    const maxHours = Math.max(...taskHours.map(t => t.hours), 1);

    const roleColors: Record<string, string> = {
        super_admin: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
        manager: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
        staff: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
        client: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
        user: 'bg-zinc-700/50 text-zinc-400 border-white/5',
    };

    const handleApprove = async (id: number) => {
        setActionLoading(id);
        try {
            const result = await approveTimeOffRequest(id);
            if (result.success) {
                toast.success('Request approved');
                setLocalTimeOff(prev => prev.map(r => r.id === id ? { ...r, status: 'approved' as const } : r));
            } else {
                toast.error(result.error || 'Failed to approve');
            }
        } catch {
            toast.error('An error occurred');
        } finally {
            setActionLoading(null);
        }
    };

    const handleReject = async (id: number) => {
        setActionLoading(id);
        try {
            const result = await rejectTimeOffRequest(id);
            if (result.success) {
                toast.success('Request rejected');
                setLocalTimeOff(prev => prev.map(r => r.id === id ? { ...r, status: 'rejected' as const } : r));
            } else {
                toast.error(result.error || 'Failed to reject');
            }
        } catch {
            toast.error('An error occurred');
        } finally {
            setActionLoading(null);
        }
    };

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link href={orgPath('/users')} className="p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] text-zinc-400 hover:text-white transition-all border border-white/5">
                    <FiArrowLeft className="w-5 h-5" />
                </Link>
                <div className="flex items-center gap-4 flex-1">
                    {user.avatarUrl ? (
                        <Image src={user.avatarUrl} alt={user.fullName || 'User'} width={56} height={56} className="rounded-2xl object-cover border border-white/5" />
                    ) : (
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-medium text-xl">
                            {(user.fullName || user.email).charAt(0).toUpperCase()}
                        </div>
                    )}
                    <div>
                        <h1 className="text-3xl font-medium text-white tracking-tight">{user.fullName || 'Unknown User'}</h1>
                        <p className="text-zinc-500 text-sm">{user.email}</p>
                        <div className="flex gap-1 mt-1.5">
                            {user.roles?.map(role => (
                                <span key={role} className={`px-2 py-0.5 rounded-full text-[11px] font-medium uppercase tracking-wider border ${roleColors[role] || roleColors.user}`}>
                                    {role.replace('_', ' ')}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Activity Heatmap */}
            <div className="glass p-6 rounded-3xl border border-white/5 bg-zinc-900/50 space-y-4 overflow-hidden">
                <div className="flex justify-between items-center mb-1">
                    <h4 className="text-[11px] font-medium text-emerald-400 uppercase tracking-wider bg-emerald-500/10 px-2 py-0.5 rounded">Activity Engine</h4>
                    <span className="text-[11px] text-zinc-500 font-bold uppercase tracking-wider">Historical Performance</span>
                </div>
                <ActivityHeatmap data={activityData} variant="full" />
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { icon: FiClock, color: 'indigo', label: 'Total Hours', value: `${totalHours}h` },
                    { icon: FiCheckSquare, color: 'emerald', label: 'Tasks Completed', value: `${doneTasks}` },
                    { icon: FiActivity, color: 'amber', label: 'In Progress', value: `${inProgressTasks}` },
                    { icon: FiUser, color: 'rose', label: 'Completion Rate', value: `${completionRate}%` },
                ].map(({ icon: Icon, color, label, value }) => {
                    const c: Record<string, string> = {
                        indigo: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
                        emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
                        amber: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
                        rose: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
                    };
                    return (
                        <motion.div
                            key={label}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="glass rounded-2xl p-5 border border-white/5 bg-zinc-900/10"
                        >
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center border mb-3 ${c[color]}`}>
                                <Icon className="w-4 h-4" />
                            </div>
                            <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-1">{label}</p>
                            <p className="text-2xl font-medium text-white">{value}</p>
                        </motion.div>
                    );
                })}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* Hours Per Task Chart */}
                <div className="xl:col-span-1 glass rounded-2xl p-6 border border-white/5 bg-zinc-900/10 space-y-4">
                    <h2 className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                        <FiActivity className="text-indigo-400 w-4 h-4" />
                        Hours Per Task
                    </h2>
                    {taskHours.length === 0 ? (
                        <p className="text-sm text-zinc-600 italic">No time logged yet.</p>
                    ) : (
                        <div className="space-y-3">
                            {taskHours.map(({ name, hours }) => (
                                <div key={name} className="space-y-1">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[11px] font-bold text-zinc-400 truncate max-w-[160px]">{name}</span>
                                        <span className="text-[11px] font-medium text-white">{hours.toFixed(1)}h</span>
                                    </div>
                                    <div className="w-full h-1.5 bg-white/[0.03] rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${(hours / maxHours) * 100}%` }}
                                            transition={{ duration: 0.8, ease: 'circOut' }}
                                            className="h-full bg-indigo-500 rounded-full"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Timesheet Table */}
                <div className="xl:col-span-2 glass rounded-2xl border border-white/5 bg-zinc-900/10 overflow-hidden">
                    <div className="px-6 py-4 border-b border-white/5">
                        <h2 className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                            <FiCalendar className="text-emerald-400 w-4 h-4" />
                            Timesheet ({timeLogs.length} sessions)
                        </h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-white/5 bg-white/[0.02]">
                                    <th className="px-6 py-3 text-left text-[11px] font-medium text-zinc-600 uppercase tracking-wider">Task</th>
                                    <th className="px-6 py-3 text-left text-[11px] font-medium text-zinc-600 uppercase tracking-wider">Start</th>
                                    <th className="px-6 py-3 text-left text-[11px] font-medium text-zinc-600 uppercase tracking-wider">End</th>
                                    <th className="px-6 py-3 text-right text-[11px] font-medium text-zinc-600 uppercase tracking-wider">Duration</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {timeLogs.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-10 text-center text-zinc-600 text-sm italic">No sessions recorded yet.</td>
                                    </tr>
                                )}
                                {timeLogs.slice().reverse().map(log => {
                                    const task = tasks.find(t => t.id === log.task_id);
                                    const duration = getLogDuration(log);
                                    const isActive = !log.end_time;
                                    return (
                                        <tr key={log.id} className="hover:bg-white/[0.02] transition-colors">
                                            <td className="px-6 py-3">
                                                <span className="font-bold text-white text-xs truncate max-w-[200px] block">
                                                    {task?.name || `Task #${log.task_id}`}
                                                </span>
                                            </td>
                                            <td className="px-6 py-3 text-zinc-400 text-xs tabular-nums">
                                                {log.start_time ? format(parseISO(log.start_time), 'MMM dd, HH:mm') : '-'}
                                            </td>
                                            <td className="px-6 py-3 text-xs">
                                                {isActive ? (
                                                    <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                        Active
                                                    </span>
                                                ) : (
                                                    <span className="text-zinc-400 tabular-nums">
                                                        {log.end_time ? format(parseISO(log.end_time), 'MMM dd, HH:mm') : '-'}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-3 text-right">
                                                <span className="font-medium text-white text-xs tabular-nums">
                                                    {isActive ? (
                                                        <span className="text-emerald-400">—</span>
                                                    ) : formatDuration(duration)}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                            {timeLogs.length > 0 && (
                                <tfoot>
                                    <tr className="border-t border-white/5 bg-white/[0.02]">
                                        <td colSpan={3} className="px-6 py-3 text-right text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Total</td>
                                        <td className="px-6 py-3 text-right text-sm font-medium text-white">{totalHours}h</td>
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                    </div>
                </div>
            </div>

            {/* Time Off Section */}
            {localTimeOff.length > 0 && (
                <div className="glass rounded-2xl border border-white/5 bg-zinc-900/10 overflow-hidden">
                    <div className="px-6 py-4 border-b border-white/5">
                        <h2 className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                            <FiSun className="text-amber-400 w-4 h-4" />
                            Time Off Requests ({localTimeOff.length})
                        </h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-white/5 bg-white/[0.02]">
                                    <th className="px-6 py-3 text-left text-[11px] font-medium text-zinc-600 uppercase tracking-wider">Type</th>
                                    <th className="px-6 py-3 text-left text-[11px] font-medium text-zinc-600 uppercase tracking-wider">Period</th>
                                    <th className="px-6 py-3 text-left text-[11px] font-medium text-zinc-600 uppercase tracking-wider">Days</th>
                                    <th className="px-6 py-3 text-left text-[11px] font-medium text-zinc-600 uppercase tracking-wider">Justification</th>
                                    <th className="px-6 py-3 text-left text-[11px] font-medium text-zinc-600 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 text-left text-[11px] font-medium text-zinc-600 uppercase tracking-wider">Requested</th>
                                    {isSuperAdmin && (
                                        <th className="px-6 py-3 text-right text-[11px] font-medium text-zinc-600 uppercase tracking-wider">Actions</th>
                                    )}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {localTimeOff.map(req => {
                                    const days = differenceInDays(new Date(req.end_date), new Date(req.start_date)) + 1;
                                    return (
                                        <tr key={req.id} className="hover:bg-white/[0.02] transition-colors">
                                            <td className="px-6 py-3 text-xs font-bold text-white">
                                                {typeLabels[req.type] || req.type}
                                            </td>
                                            <td className="px-6 py-3 text-xs text-zinc-400 tabular-nums">
                                                {format(new Date(req.start_date), 'MMM dd')} — {format(new Date(req.end_date), 'MMM dd, yyyy')}
                                            </td>
                                            <td className="px-6 py-3 text-xs text-zinc-300 font-medium">
                                                {days}d
                                            </td>
                                            <td className="px-6 py-3 text-xs text-zinc-500 max-w-[200px] truncate">
                                                {req.justification || '—'}
                                            </td>
                                            <td className="px-6 py-3">
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${statusColors[req.status]}`}>
                                                    {req.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-3 text-xs text-zinc-500 tabular-nums">
                                                {req.requested_at ? format(new Date(req.requested_at), 'MMM dd, yyyy') : '—'}
                                            </td>
                                            {isSuperAdmin && (
                                                <td className="px-6 py-3 text-right">
                                                    {req.status === 'pending' && (
                                                        <div className="flex items-center justify-end gap-2">
                                                            <button
                                                                onClick={() => handleApprove(req.id)}
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
                                                                onClick={() => handleReject(req.id)}
                                                                disabled={actionLoading === req.id}
                                                                className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-all disabled:opacity-50"
                                                                title="Reject"
                                                            >
                                                                <FiX className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    )}
                                                </td>
                                            )}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
