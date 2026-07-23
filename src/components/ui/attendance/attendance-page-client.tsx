'use client';

import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { AttendanceRecord, OfficeLocation } from '@/types/attendance';
import AttendanceStatusCard from './attendance-status-card';
import AttendanceHistoryTable from './attendance-history-table';
import TeamAttendanceGrid from './team-attendance-grid';
import OfficeSettings from './office-settings';
import { AttendanceMap } from './attendance-map';
import useSWR from 'swr';
import { getMyAttendanceHistory, getTeamAttendanceToday, getTeamAttendanceHistory } from '@/app/(dashboard)/[orgSlug]/attendance/actions';
import { FiUser, FiUsers, FiSettings } from 'react-icons/fi';

export interface AttendancePageClientProps {
    myToday: AttendanceRecord | null;
    myHistory: AttendanceRecord[];
    teamToday: AttendanceRecord[];
    teamHistory: AttendanceRecord[];
    officeLocations: OfficeLocation[];
    users: any[];
    isManager: boolean;
    isAdmin: boolean;
    currentUserId: string;
}

type TabId = 'my' | 'team' | 'admin';

export default function AttendancePageClient({
    myToday,
    myHistory,
    teamToday,
    teamHistory,
    officeLocations,
    users,
    isManager,
    isAdmin,
    currentUserId,
}: AttendancePageClientProps) {
    const [activeTab, setActiveTab] = useState<TabId>('my');

    // SWR Synchronization
    const { data: liveMyHistory } = useSWR('my-attendance-history', getMyAttendanceHistory, {
        fallbackData: myHistory,
        revalidateOnFocus: true
    });

    const { data: liveTeamToday } = useSWR(isManager ? 'team-attendance-today' : null, getTeamAttendanceToday, {
        fallbackData: teamToday,
        revalidateOnFocus: true
    });

    const { data: liveTeamHistory } = useSWR(isAdmin ? 'team-attendance-history' : null, getTeamAttendanceHistory, {
        fallbackData: teamHistory,
        revalidateOnFocus: true
    });

    const tabs: { id: TabId; label: string; icon: React.ElementType; visible: boolean }[] = [
        { id: 'my', label: 'My Attendance', icon: FiUser, visible: true },
        { id: 'team', label: 'Team Presence', icon: FiUsers, visible: isManager },
        { id: 'admin', label: 'Office Settings', icon: FiSettings, visible: isManager },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-foreground tracking-tight">Attendance</h1>
                    <p className="text-text-muted text-sm mt-1">Daily tracking and real-time team presence.</p>
                </div>

                {/* Tabs */}
                <div className="flex items-center gap-1 p-1 rounded-xl bg-card border border-card-border w-fit backdrop-blur-md">
                    {tabs.filter(t => t.visible).map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all ${
                                activeTab === tab.id
                                    ? 'bg-foreground/[0.05] text-foreground border border-card-border'
                                    : 'text-text-muted hover:text-foreground hover:bg-foreground/[0.05]'
                            }`}
                        >
                            <tab.icon className="w-3.5 h-3.5" />
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Tab Content */}
            <AnimatePresence mode="wait">
                {activeTab === 'my' && (
                    <motion.div 
                        key="my"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-6"
                    >
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                            <AttendanceStatusCard record={myToday} />
                            <div className="h-full min-h-[400px] glass rounded-[32px] border border-card-border overflow-hidden relative" style={{ isolation: 'isolate' }}>
                                <AttendanceMap officeLocations={officeLocations} />
                            </div>
                        </div>
                        <AttendanceHistoryTable records={liveMyHistory || []} />
                    </motion.div>
                )}

                {activeTab === 'team' && isManager && (
                    <motion.div 
                        key="team"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                    >
                        <TeamAttendanceGrid
                            initialRecords={liveTeamToday || []}
                            initialHistory={liveTeamHistory || []}
                            users={users}
                            isAdmin={isAdmin}
                            currentUserId={currentUserId}
                        />
                    </motion.div>
                )}

                {activeTab === 'admin' && isAdmin && (
                    <motion.div 
                        key="admin"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                    >
                        <OfficeSettings initialLocations={officeLocations} />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
