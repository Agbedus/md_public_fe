'use client';

import React, { useState } from 'react';
import useSWR from 'swr';
import type { AttendanceRecord, PresenceState, AttendanceState } from '@/types/attendance';
import { presenceStateLabels, presenceStateColors, attendanceStateLabels, attendanceStateColors } from '@/types/attendance';
import { fetchTeamAttendanceLive, overrideAttendance, getTeamAttendanceHistory } from '@/app/(dashboard)/[orgSlug]/attendance/actions';
import OverrideModal from './override-modal';
import TeamAttendanceTable from './team-attendance-table';
import { FiUsers, FiEdit2, FiRefreshCw, FiMapPin } from 'react-icons/fi';
import Image from 'next/image';
import { useLocation } from '@/providers/location-provider';
import { useMemo } from 'react';

interface Props {
    initialRecords: AttendanceRecord[];
    initialHistory?: AttendanceRecord[];
    users: any[];
    isAdmin?: boolean;
    currentUserId?: string;
}

export default function TeamAttendanceGrid({ initialRecords, initialHistory = [], users, isAdmin = false, currentUserId }: Props) {
    const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);

    const { data: records, mutate, isValidating } = useSWR(
        'team-attendance-today',
        () => fetchTeamAttendanceLive(),
        {
            fallbackData: initialRecords,
            refreshInterval: 30000,
            revalidateOnFocus: true,
        }
    );

    const { data: history } = useSWR(
        isAdmin ? 'team-attendance-history' : null,
        () => getTeamAttendanceHistory(),
        {
            fallbackData: initialHistory,
            refreshInterval: 60000,
        }
    );

    const { presenceState: manualPresence } = useLocation();
    const teamRecords = records || [];

    // Hydrate with user info
    const hydratedRecords = teamRecords.map(r => {
        const user = users.find((u: any) => String(u.id) === String(r.user_id));
        return {
            ...r,
            userName: user?.name || user?.fullName || 'Unknown',
            userAvatar: user?.image || user?.avatarUrl || null,
        };
    });

    const hydratedHistory = (history || []).map(r => {
        const user = users.find((u: any) => String(u.id) === String(r.user_id));
        return {
            ...r,
            userName: user?.name || user?.fullName || 'Unknown',
            userAvatar: user?.image || user?.avatarUrl || null,
        };
    });

    const handleOverride = async (recordId: number, clockIn: string | null, clockOut: string | null) => {
        await overrideAttendance(recordId, clockIn, clockOut);
        mutate();
        setSelectedRecord(null);
    };

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                        <FiUsers className="w-4 h-4 text-indigo-400" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Live Presence</h3>
                        <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest mt-0.5">
                            {hydratedRecords.length} Members Active Today
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => mutate()}
                        disabled={isValidating}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-widest text-text-muted hover:text-foreground bg-foreground/[0.05] border border-card-border hover:bg-foreground/[0.1] transition-all"
                    >
                        <FiRefreshCw className={`w-3 h-3 ${isValidating ? 'animate-spin text-indigo-400' : ''}`} />
                        Refresh
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {hydratedRecords.map(record => {
                    const isMe = String(record.user_id) === String(currentUserId);
                    // Use local presence for 'Me', otherwise use backend record presence
                    const rawPresence = isMe ? (manualPresence || record.presence_state) : record.presence_state;
                    
                    const pState = rawPresence || (record.attendance_state === 'CLOCKED_IN' ? 'IN_OFFICE' : 'OUT_OF_OFFICE');
                    const aState = record.attendance_state || 'NOT_CLOCKED_IN';
                    
                    const pColors = presenceStateColors[pState as PresenceState] || presenceStateColors.OUT_OF_OFFICE;
                    const aColors = attendanceStateColors[aState as AttendanceState] || attendanceStateColors.NOT_CLOCKED_IN;

                    return (
                        <div
                            key={record.id}
                            className="bg-card p-5 rounded-[32px] border border-card-border hover:border-foreground/[0.1] transition-all group relative overflow-hidden"
                        >
                            {/* Glow effect on hover */}
                            <div className={`absolute -top-10 -right-10 w-32 h-32 rounded-full blur-[60px] opacity-0 group-hover:opacity-10 transition-opacity ${pColors.bg}`} />

                            <div className="flex items-start justify-between relative z-10 w-full">
                                <div className="flex items-center gap-4">
                                    {/* Pulsing Avatar Indicator */}
                                    <div className="relative">
                                        <div className={`w-12 h-12 rounded-2xl ${pColors.bg} flex items-center justify-center transition-colors border border-card-border overflow-hidden`}>
                                            {record.userAvatar ? (
                                                <Image 
                                                    src={record.userAvatar} 
                                                    alt={record.userName} 
                                                    width={48} 
                                                    height={48} 
                                                    className="w-full h-full object-cover opacity-90" 
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-sm font-black text-indigo-400">
                                                    {record.userName?.[0]?.toUpperCase()}
                                                </div>
                                            )}
                                        </div>
                                        <div className={`absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full ${pColors.dot} ring-4 ring-card`}>
                                            {record.attendance_state === 'CLOCKED_IN' && (
                                                <div className={`absolute inset-0 rounded-full ${pColors.dot} animate-ping opacity-75`} />
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex flex-col">
                                        <h4 className="text-base font-bold text-foreground leading-none mb-1">
                                            {record.userName}
                                        </h4>
                                        <span className={`inline-flex items-center text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md ${aColors.bg} ${aColors.text} border border-card-border/50 w-fit`}>
                                            {attendanceStateLabels[aState as AttendanceState]}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <h2 className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${pColors.bg} ${pColors.text} border border-card-border/50`}>
                                        {presenceStateLabels[pState as PresenceState]}
                                    </h2>
                                    {isAdmin && (
                                        <button
                                            onClick={() => setSelectedRecord(record)}
                                            className="p-1.5 rounded-lg bg-foreground/[0.05] border border-card-border text-text-muted hover:text-indigo-500 hover:bg-indigo-500/10 transition-all"
                                        >
                                            <FiEdit2 className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* LAYER 2: Metrics Strip (In, Out, Duty) - Minimalist Border Style */}
                            <div className="mt-5 grid grid-cols-3 rounded-xl border border-card-border divide-x divide-card-border overflow-hidden relative z-10">
                                <div className="flex flex-col items-center justify-center py-2.5">
                                    <span className="text-[7px] font-black text-text-muted uppercase tracking-[0.2em] mb-1 opacity-60">In</span>
                                    <span className="text-[10px] font-numbers font-bold text-foreground">
                                        {record.clock_in_at ? new Date(record.clock_in_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : '—'}
                                    </span>
                                </div>
                                <div className="flex flex-col items-center justify-center py-2.5">
                                    <span className="text-[7px] font-black text-text-muted uppercase tracking-[0.2em] mb-1 opacity-60">Out</span>
                                    <span className="text-[10px] font-numbers font-bold text-foreground">
                                        {record.clock_out_at ? new Date(record.clock_out_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : '—'}
                                    </span>
                                </div>
                                <div className="flex flex-col items-center justify-center py-2.5">
                                    <span className="text-[7px] font-black text-text-muted uppercase tracking-[0.2em] mb-1 opacity-60">Duty</span>
                                    <span className="text-[10px] font-numbers font-bold text-indigo-500">
                                        {(() => {
                                            const start = record.clock_in_at ? new Date(record.clock_in_at) : null;
                                            const end = record.clock_out_at ? new Date(record.clock_out_at) : (record.attendance_state === 'CLOCKED_IN' ? new Date() : null);
                                            if (!start || !end) return '0h';
                                            const diffMs = end.getTime() - start.getTime();
                                            const h = Math.floor(diffMs / 3600000);
                                            const m = Math.floor((diffMs % 3600000) / 60000);
                                            return h > 0 ? `${h}h ${m}m` : `${m}m`;
                                        })()}
                                    </span>
                                </div>
                            </div>
                        </div>
                    );
                })}

                {hydratedRecords.length === 0 && (
                    <div className="col-span-full bg-card p-12 rounded-[32px] border border-card-border text-center">
                        <div className="w-12 h-12 rounded-2xl bg-foreground/[0.05] flex items-center justify-center mx-auto mb-4 border border-card-border">
                            <FiUsers className="text-text-secondary" />
                        </div>
                        <p className="text-text-muted text-sm font-medium">No team activity yet today.</p>
                        <p className="text-text-muted text-xs mt-1">Presence updates will appear here in real-time.</p>
                    </div>
                )}
            </div>

            {selectedRecord && (
                <OverrideModal
                    record={selectedRecord}
                    onClose={() => setSelectedRecord(null)}
                    onOverride={handleOverride}
                />
            )}

            {isAdmin && (
                <div className="mt-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <TeamAttendanceTable records={hydratedHistory} />
                </div>
            )}
        </div>
    );
}
