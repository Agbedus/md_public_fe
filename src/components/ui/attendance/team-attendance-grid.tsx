'use client';

import React, { useEffect, useState } from 'react';
import useSWR from 'swr';
import type { AttendanceRecord, PresenceState, AttendanceState } from '@/types/attendance';
import { presenceStateLabels, presenceStateColors, attendanceStateLabels, attendanceStateColors } from '@/types/attendance';
import { fetchTeamAttendanceLive, overrideAttendance, getTeamAttendanceHistory } from '@/app/(dashboard)/[orgSlug]/attendance/actions';
import OverrideModal from './override-modal';
import TeamAttendanceTable from './team-attendance-table';
import { FiUsers, FiEdit2, FiRefreshCw, FiMapPin, FiCheckCircle, FiCoffee } from 'react-icons/fi';
import { StatTile } from '@/components/ui/stat-tile';
import { avatarStyle } from '@/lib/avatar-color';
import Image from 'next/image';
import { useLocation } from '@/providers/location-provider';
import { useOrgSlug } from '@/hooks/use-org-slug';
import { workspaceCacheKey } from '@/lib/workspace-cache';

import { TabPill } from '@/components/ui/tab-pill';
type PresenceFilter = 'all' | PresenceState;

interface Props {
    initialRecords: AttendanceRecord[];
    initialHistory?: AttendanceRecord[];
    users: any[];
    /** Read-all tier (OWNER/ADMIN/MANAGER) — may view team history. */
    isManager?: boolean;
    /** Admin tier (OWNER/ADMIN) — may additionally override a record. */
    isAdmin?: boolean;
    currentUserId?: string;
}

export default function TeamAttendanceGrid({ initialRecords, initialHistory = [], users, isManager = false, isAdmin = false, currentUserId }: Props) {
    const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
    const [filter, setFilter] = useState<PresenceFilter>('all');
    // Ticks so duty time stays live for anyone still clocked in.
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        const id = window.setInterval(() => setNow(Date.now()), 60_000);
        return () => window.clearInterval(id);
    }, []);
    const orgSlug = useOrgSlug();

    const { data: records, mutate, isValidating } = useSWR(
        workspaceCacheKey('team-attendance-today', orgSlug),
        () => fetchTeamAttendanceLive(),
        {
            fallbackData: initialRecords,
            refreshInterval: 30000,
            revalidateOnFocus: true,
        }
    );

    const { data: history } = useSWR(
        isManager ? workspaceCacheKey('team-attendance-history', orgSlug) : null,
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

    const rows = hydratedRecords.map((record) => {
        const isMe = String(record.user_id) === String(currentUserId);
        // Use local presence for 'Me', otherwise use backend record presence
        const rawPresence = isMe ? (manualPresence || record.presence_state) : record.presence_state;
        const pState = (rawPresence || (record.attendance_state === 'CLOCKED_IN' ? 'IN_OFFICE' : 'OUT_OF_OFFICE')) as PresenceState;
        const aState = (record.attendance_state || 'NOT_CLOCKED_IN') as AttendanceState;
        const start = record.clock_in_at ? new Date(record.clock_in_at) : null;
        const end = record.clock_out_at ? new Date(record.clock_out_at) : (aState === 'CLOCKED_IN' ? new Date(now) : null);
        const diffMs = start && end ? end.getTime() - start.getTime() : 0;
        const h = Math.floor(diffMs / 3600000);
        const m = Math.floor((diffMs % 3600000) / 60000);
        return { record, isMe, pState, aState, duty: !start || !end ? '0h' : h > 0 ? `${h}h ${m}m` : `${m}m` };
    });

    const counts = {
        all: rows.length,
        clockedIn: rows.filter((r) => r.aState === 'CLOCKED_IN').length,
        IN_OFFICE: rows.filter((r) => r.pState === 'IN_OFFICE').length,
        TEMPORARILY_OUT: rows.filter((r) => r.pState === 'TEMPORARILY_OUT').length,
        OUT_OF_OFFICE: rows.filter((r) => r.pState === 'OUT_OF_OFFICE').length,
    };
    const visibleRows = filter === 'all' ? rows : rows.filter((r) => r.pState === filter);
    const time = (iso?: string | null) => iso ? new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : '—';

    const filters: { id: PresenceFilter; label: string; count: number; dot?: string }[] = [
        { id: 'all', label: 'Everyone', count: counts.all },
        { id: 'IN_OFFICE', label: presenceStateLabels.IN_OFFICE, count: counts.IN_OFFICE, dot: presenceStateColors.IN_OFFICE.dot },
        { id: 'TEMPORARILY_OUT', label: presenceStateLabels.TEMPORARILY_OUT, count: counts.TEMPORARILY_OUT, dot: presenceStateColors.TEMPORARILY_OUT.dot },
        { id: 'OUT_OF_OFFICE', label: presenceStateLabels.OUT_OF_OFFICE, count: counts.OUT_OF_OFFICE, dot: presenceStateColors.OUT_OF_OFFICE.dot },
    ];

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <StatTile icon={FiUsers} label="Active today" value={counts.all} tone="var(--accent)" onClick={() => setFilter('all')} isActive={filter === 'all'} />
                <StatTile icon={FiCheckCircle} label="In office" value={counts.IN_OFFICE} tone="var(--success)" hint={`${counts.clockedIn} clocked in`} onClick={() => setFilter('IN_OFFICE')} isActive={filter === 'IN_OFFICE'} />
                <StatTile icon={FiCoffee} label="Temporarily out" value={counts.TEMPORARILY_OUT} tone="var(--warning)" onClick={() => setFilter('TEMPORARILY_OUT')} isActive={filter === 'TEMPORARILY_OUT'} />
                <StatTile icon={FiMapPin} label="Out of office" value={counts.OUT_OF_OFFICE} tone="var(--danger)" onClick={() => setFilter('OUT_OF_OFFICE')} isActive={filter === 'OUT_OF_OFFICE'} />
            </div>

            <section className="rounded-[28px] border border-card-border bg-card">
                <div className="flex flex-col gap-3 border-b border-card-border p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                    <div>
                        <h3 className="flex items-center gap-2 text-base font-semibold text-foreground">
                            Live presence
                            <span className="relative flex h-2 w-2">
                                <span className="absolute inset-0 rounded-full bg-success opacity-60 motion-safe:animate-ping" />
                                <span className="relative h-2 w-2 rounded-full bg-success" />
                            </span>
                        </h3>
                        <p className="mt-0.5 text-xs text-text-muted">Updates every 30 seconds</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                        {filters.map((f) => (
                            <button
                                key={f.id}
                                type="button"
                                onClick={() => setFilter(f.id)}
                                className={`relative isolate inline-flex min-h-9 items-center gap-2 rounded-full px-3 text-xs transition-colors active:scale-[0.97] ${
                                    filter === f.id ? 'font-medium text-on-ink' : 'bg-foreground/[0.05] text-text-secondary hover:text-foreground'
                                }`}
                            >
                                {filter === f.id && <TabPill id="presence-filter" />}
                                {f.dot && <span className={`h-1.5 w-1.5 rounded-full ${f.dot}`} />}
                                {f.label}
                                <span className="font-numbers opacity-70">{f.count}</span>
                            </button>
                        ))}
                        <button
                            type="button"
                            onClick={() => mutate()}
                            disabled={isValidating}
                            aria-label="Refresh presence"
                            title="Refresh"
                            className="grid h-9 w-9 place-items-center rounded-full bg-foreground/[0.05] text-text-muted transition-colors hover:text-foreground"
                        >
                            <FiRefreshCw className={`h-3.5 w-3.5 ${isValidating ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>

                {visibleRows.length === 0 ? (
                    <div className="px-5 py-14 text-center">
                        <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-foreground/[0.05]">
                            <FiUsers className="text-text-secondary" />
                        </div>
                        <p className="text-sm font-medium text-text-muted">{rows.length === 0 ? 'No team activity yet today.' : 'Nobody here right now.'}</p>
                        <p className="mt-1 text-xs text-text-muted">Presence updates will appear here in real time.</p>
                    </div>
                ) : (
                    <ul className="divide-y divide-card-border">
                        {visibleRows.map(({ record, isMe, pState, aState, duty }) => {
                            const pColors = presenceStateColors[pState] || presenceStateColors.OUT_OF_OFFICE;
                            const aColors = attendanceStateColors[aState] || attendanceStateColors.NOT_CLOCKED_IN;
                            return (
                                <li key={record.id} className="flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3 transition-colors hover:bg-foreground/[0.02] sm:px-5">
                                    <div className="flex min-w-0 flex-1 basis-56 items-center gap-3">
                                        <span className="relative shrink-0">
                                            {record.userAvatar ? (
                                                <Image src={record.userAvatar} alt={record.userName} width={40} height={40} className="h-10 w-10 rounded-full object-cover" />
                                            ) : (
                                                <span style={avatarStyle(record.userName)} className="grid h-10 w-10 place-items-center rounded-full text-sm font-semibold">
                                                    {record.userName?.[0]?.toUpperCase()}
                                                </span>
                                            )}
                                            <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-card ${pColors.dot}`}>
                                                {aState === 'CLOCKED_IN' && <span className={`absolute inset-0 rounded-full ${pColors.dot} opacity-60 motion-safe:animate-ping`} />}
                                            </span>
                                        </span>
                                        <div className="min-w-0">
                                            <p className="flex items-center gap-1.5 truncate text-sm font-medium text-foreground">
                                                {record.userName}
                                                {isMe && <span className="rounded-full bg-accent/12 px-1.5 py-px text-[10px] font-medium text-accent-text">You</span>}
                                            </p>
                                            <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${aColors.bg} ${aColors.text}`}>
                                                {attendanceStateLabels[aState]}
                                            </span>
                                        </div>
                                    </div>

                                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${pColors.bg} ${pColors.text}`}>
                                        <span className={`h-1.5 w-1.5 rounded-full ${pColors.dot}`} />
                                        {presenceStateLabels[pState]}
                                    </span>

                                    <dl className="flex items-center gap-1 rounded-full bg-foreground/[0.04] p-1 text-xs">
                                        {[['In', time(record.clock_in_at)], ['Out', time(record.clock_out_at)], ['Duty', duty]].map(([label, value]) => (
                                            <div key={label} className="flex items-baseline gap-1.5 rounded-full px-2.5 py-1">
                                                <dt className="text-text-muted">{label}</dt>
                                                <dd className={`font-numbers font-medium ${label === 'Duty' ? 'text-accent-text' : 'text-foreground'}`}>{value}</dd>
                                            </div>
                                        ))}
                                    </dl>

                                    {isAdmin && (
                                        <button
                                            type="button"
                                            onClick={() => setSelectedRecord(record)}
                                            aria-label={`Adjust ${record.userName}'s times`}
                                            title="Adjust times"
                                            className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-text-muted transition-colors hover:bg-accent/12 hover:text-accent-text"
                                        >
                                            <FiEdit2 className="h-3.5 w-3.5" />
                                        </button>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                )}
            </section>

            {selectedRecord && (
                <OverrideModal
                    record={selectedRecord}
                    onClose={() => setSelectedRecord(null)}
                    onOverride={handleOverride}
                />
            )}

            {isManager && <TeamAttendanceTable records={hydratedHistory} />}
        </div>
    );
}
