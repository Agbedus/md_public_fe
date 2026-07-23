'use client';

import React from 'react';
import type { AttendanceRecord, AttendanceState } from '@/types/attendance';
import { attendanceStateLabels, attendanceStateColors } from '@/types/attendance';
import { FiClock, FiEye, FiCheckCircle } from 'react-icons/fi';

function computeHours(start: string | null | undefined, end: string | null | undefined): number | null {
    if (!start || !end) return null;
    const diff = new Date(end).getTime() - new Date(start).getTime();
    if (isNaN(diff) || diff < 0) return null;
    return diff / (1000 * 60 * 60);
}

function formatTime(iso: string | null | undefined): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function AttendanceHistoryTable({ records }: { records: AttendanceRecord[] }) {
    if (records.length === 0) {
        return (
            <div className="glass p-12 rounded-2xl border border-card-border text-center">
                <FiClock className="text-4xl text-(--text-muted) mx-auto mb-4" />
                <p className="text-text-secondary text-sm font-medium">No activity logged yet.</p>
                <p className="text-(--text-muted) text-xs mt-1">Your location history will appear here once you clock in.</p>
            </div>
        );
    }

    return (
        <div className="glass rounded-2xl border border-card-border overflow-hidden flex flex-col">
            <div className="p-4 lg:px-6 py-4 border-b border-card-border bg-background/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <FiCheckCircle className="text-emerald-500 w-4 h-4" />
                    <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Activity History</h3>
                </div>
                <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest bg-foreground/[0.05] px-2 py-0.5 rounded-md border border-card-border">
                    {records.length} Logs
                </span>
            </div>
            <div className="overflow-x-auto scrollbar-hide">
                <table className="w-full text-sm border-collapse">
                    <thead>
                        <tr className="border-b border-card-border bg-background/30">
                            <th className="px-6 py-3 text-left text-[10px] font-bold text-text-muted uppercase tracking-wider">Date</th>
                            <th className="px-6 py-3 text-left text-[10px] font-bold text-text-muted uppercase tracking-wider">In</th>
                            <th className="px-6 py-3 text-left text-[10px] font-bold text-text-muted uppercase tracking-wider">Out</th>
                            <th className="px-6 py-3 text-left text-[10px] font-bold text-text-muted uppercase tracking-wider">First Seen</th>
                            <th className="px-6 py-3 text-left text-[10px] font-bold text-text-muted uppercase tracking-wider">Last Seen</th>
                            <th className="px-6 py-3 text-left text-[10px] font-bold text-text-muted uppercase tracking-wider">Hours</th>
                            <th className="px-6 py-3 text-left text-[10px] font-bold text-text-muted uppercase tracking-wider">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-card-border">
                        {records.map((r, i) => {
                            const dateStr = r.work_date || r.date;
                            const clockIn = r.clock_in_at ?? r.clock_in ?? null;
                            const clockOut = r.clock_out_at ?? r.clock_out ?? null;
                            const firstSeen = r.first_seen_in_office_at ?? null;
                            const lastSeen = r.last_seen_in_office_at ?? null;
                            const hours = r.total_hours ?? computeHours(clockIn, clockOut);
                            const aState = r.attendance_state || 'NOT_CLOCKED_IN';
                            const aColors = attendanceStateColors[aState as AttendanceState] || attendanceStateColors['NOT_CLOCKED_IN'];

                            return (
                                <tr key={r.id || i} className="hover:bg-foreground/[0.05] transition-colors group">
                                    <td className="px-6 py-3 text-text-secondary font-medium whitespace-nowrap" suppressHydrationWarning>
                                        <span className="font-numbers text-xs">
                                            {dateStr
                                                ? new Date(dateStr + (dateStr.includes('T') ? '' : 'T00:00:00')).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
                                                : '—'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-3 text-text-muted whitespace-nowrap font-numbers text-xs" suppressHydrationWarning>
                                        {formatTime(clockIn)}
                                    </td>
                                    <td className="px-6 py-3 text-text-muted whitespace-nowrap font-numbers text-xs" suppressHydrationWarning>
                                        {formatTime(clockOut)}
                                    </td>
                                    <td className="px-6 py-3 whitespace-nowrap">
                                        {firstSeen ? (
                                            <span className="inline-flex items-center gap-1.5 text-text-muted font-numbers text-xs" suppressHydrationWarning>
                                                <div className="w-1 h-1 rounded-full bg-emerald-500/40" />
                                                {formatTime(firstSeen)}
                                            </span>
                                        ) : '—'}
                                    </td>
                                    <td className="px-6 py-3 whitespace-nowrap">
                                        {lastSeen ? (
                                            <span className="inline-flex items-center gap-1.5 text-text-muted font-numbers text-xs" suppressHydrationWarning>
                                                <div className="w-1 h-1 rounded-full bg-amber-500/40" />
                                                {formatTime(lastSeen)}
                                            </span>
                                        ) : '—'}
                                    </td>
                                    <td className="px-6 py-3 text-foreground font-bold whitespace-nowrap font-numbers text-xs">
                                        {hours != null ? `${hours.toFixed(1)}h` : '—'}
                                    </td>
                                    <td className="px-6 py-3 whitespace-nowrap">
                                        <span className={`text-[9px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider ${aColors.bg} ${aColors.text} border border-card-border`}>
                                            {attendanceStateLabels[aState as AttendanceState] || 'Unknown'}
                                        </span>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
