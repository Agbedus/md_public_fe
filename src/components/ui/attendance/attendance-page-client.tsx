'use client';

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useMotionValue, useTransform } from 'framer-motion';
import type { AttendanceRecord, AttendanceState, OfficeLocation } from '@/types/attendance';
import { attendanceStateColors, attendanceStateLabels } from '@/types/attendance';
import AttendanceStatusCard from './attendance-status-card';
import AttendanceHistoryTable from './attendance-history-table';
import TeamAttendanceGrid from './team-attendance-grid';
import OfficeSettings from './office-settings';
import { AttendanceMap } from './attendance-map';
import type { MapIdentity } from './attendance-map-internals';
import useSWR from 'swr';
import { getMyAttendanceHistory, getTeamAttendanceToday, getTeamAttendanceHistory } from '@/app/(dashboard)/[orgSlug]/attendance/actions';
import { FiUser, FiUsers, FiSettings, FiX, FiClock, FiArrowDown, FiMousePointer } from 'react-icons/fi';
import { useOrgSlug } from '@/hooks/use-org-slug';
import { workspaceCacheKey } from '@/lib/workspace-cache';

import { TabPill } from '@/components/ui/tab-pill';
export interface AttendancePageClientProps {
    myToday: AttendanceRecord | null;
    myHistory: AttendanceRecord[];
    teamToday: AttendanceRecord[];
    teamHistory: AttendanceRecord[];
    officeLocations: OfficeLocation[];
    users: any[];
    isManager: boolean;
    isAdmin: boolean;
    /** Platform SUPER_ADMIN — the raw-record endpoints are not org-scoped. */
    canReadRawRecords?: boolean;
    currentUserId: string;
    cartoApiLink?: string;
    /** Faces for the map markers. */
    me: MapIdentity;
    organization: MapIdentity;
}

type ViewId = 'my' | 'team';

const ease = [0.23, 1, 0.32, 1] as const;

function shortTime(iso?: string | null) {
    return iso ? new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';
}

function recordHours(r: AttendanceRecord): string {
    const start = r.clock_in_at ?? r.clock_in;
    const end = r.clock_out_at ?? r.clock_out;
    const hours = r.total_hours ?? (start && end ? (new Date(end).getTime() - new Date(start).getTime()) / 3_600_000 : null);
    return hours !== null && hours !== undefined && !isNaN(hours) && hours >= 0 ? `${hours.toFixed(1)}h` : '—';
}

/**
 * Scroll-linked collapse for the map. Once the map reaches the top of the
 * scroll area it pins there and its height follows the scroll, closing to
 * about half; a spacer grows by the same amount so the history below moves
 * exactly with the map's bottom edge. When the map is fully closed it stays
 * pinned and the history scrolls underneath it.
 */
function useCollapsingMap(enabled: boolean) {
    // A zero-height marker before the pinned map: unlike the map, it never sticks.
    const [anchor, setAnchor] = useState<HTMLDivElement | null>(null);
    const collapse = useMotionValue(0);
    const bounds = useRef({ start: 0, range: 0 });
    const fullHeight = useMotionValue(640);
    const height = useTransform(() => fullHeight.get() - collapse.get());

    useLayoutEffect(() => {
        if (!enabled) return;
        const scroller = document.querySelector<HTMLElement>('[data-dashboard-scroll]');
        if (!scroller || !anchor) return;

        const pinTop = 12;

        const measure = () => {
            const isMd = window.matchMedia('(min-width: 768px)').matches;
            const full = Math.max(isMd ? 560 : 480, scroller.clientHeight - (isMd ? 128 : 170));
            const min = Math.max(Math.round(full / 2), isMd ? 340 : 360);
            fullHeight.set(full);
            // Distance scrolled before the map's top meets its pinned position.
            const offset = anchor.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop;
            bounds.current = { start: Math.max(0, offset - pinTop), range: full - min };
            onScroll();
        };
        const onScroll = () => {
            const { start, range } = bounds.current;
            collapse.set(Math.min(range, Math.max(0, scroller.scrollTop - start)));
        };

        measure();
        scroller.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', measure);
        return () => {
            scroller.removeEventListener('scroll', onScroll);
            window.removeEventListener('resize', measure);
        };
    }, [enabled, anchor, collapse, fullHeight]);

    /** Scrolls to the point where the map has fully closed. */
    const scrollToHistory = () => {
        const { start, range } = bounds.current;
        document.querySelector<HTMLElement>('[data-dashboard-scroll]')?.scrollTo({ top: start + range, behavior: 'smooth' });
    };

    return { anchorRef: setAnchor, height, spacer: collapse, scrollToHistory };
}

/** A dismissable pop-up for the settings and policy editors. */
function SettingsDialog({ isOpen, onClose, children }: { isOpen: boolean; onClose: () => void; children: React.ReactNode }) {
    useEffect(() => {
        if (!isOpen) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [isOpen, onClose]);

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[1200] flex items-center justify-center p-3 sm:p-6">
                    <motion.div
                        className="absolute inset-0 bg-white/60 backdrop-blur-md dark:bg-black/60"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                    />
                    <motion.div
                        role="dialog"
                        aria-modal="true"
                        aria-label="Office settings"
                        initial={{ opacity: 0, scale: 0.97, y: 8 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.98, y: 4 }}
                        transition={{ duration: 0.22, ease }}
                        className="relative flex max-h-[calc(100dvh-1.5rem)] w-full max-w-6xl flex-col overflow-hidden rounded-[28px] border border-card-border bg-background sm:max-h-[calc(100dvh-3rem)]"
                    >
                        <div className="flex items-center justify-between gap-3 border-b border-card-border px-5 py-4">
                            <div className="flex items-center gap-3">
                                <span className="grid h-10 w-10 place-items-center rounded-full bg-accent/12 text-accent-text">
                                    <FiSettings className="h-4 w-4" />
                                </span>
                                <div>
                                    <h2 className="text-base font-semibold text-foreground">Office settings</h2>
                                    <p className="text-xs text-text-muted">Locations, radii and attendance policies</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={onClose}
                                aria-label="Close office settings"
                                className="grid h-10 w-10 place-items-center rounded-full text-text-muted transition-colors hover:bg-foreground/[0.06] hover:text-foreground"
                            >
                                <FiX className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="custom-scrollbar flex-1 overflow-y-auto p-4 sm:p-6">{children}</div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}

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
    cartoApiLink,
    me,
    organization,
}: AttendancePageClientProps) {
    const [view, setView] = useState<ViewId>('my');
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isRecentOpen, setIsRecentOpen] = useState(false);
    const { anchorRef, height: mapHeight, spacer, scrollToHistory } = useCollapsingMap(view === 'my');
    const orgSlug = useOrgSlug();

    // SWR Synchronization
    const { data: liveMyHistory } = useSWR(workspaceCacheKey('my-attendance-history', orgSlug), getMyAttendanceHistory, {
        fallbackData: myHistory,
        revalidateOnFocus: true
    });

    const { data: liveTeamToday } = useSWR(isManager ? workspaceCacheKey('team-attendance-today', orgSlug) : null, getTeamAttendanceToday, {
        fallbackData: teamToday,
        revalidateOnFocus: true
    });

    const { data: liveTeamHistory } = useSWR(isManager ? workspaceCacheKey('team-attendance-history', orgSlug) : null, getTeamAttendanceHistory, {
        fallbackData: teamHistory,
        revalidateOnFocus: true
    });

    const recent = (liveMyHistory || []).slice(0, 6);
    const views: { id: ViewId; label: string; icon: React.ElementType }[] = [
        { id: 'my', label: 'My attendance', icon: FiUser },
        { id: 'team', label: 'Team presence', icon: FiUsers },
    ];

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                    <h1 className="m-1 text-3xl font-bold tracking-tight text-foreground">Attendance</h1>
                    <p className="m-1 text-sm text-text-muted">Your day on the map, and who is in right now.</p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {isManager && (
                        <div className="flex items-center gap-1 rounded-full bg-foreground/[0.05] p-1">
                            {views.map((v) => (
                                <button
                                    key={v.id}
                                    type="button"
                                    onClick={() => setView(v.id)}
                                    aria-pressed={view === v.id}
                                    className={`relative isolate inline-flex min-h-9 items-center gap-2 rounded-full px-3.5 text-sm transition-colors active:scale-[0.97] ${
                                        view === v.id ? 'font-medium text-on-ink' : 'text-text-secondary hover:text-foreground'
                                    }`}
                                >
                                    {view === v.id && <TabPill id="attendance-view" />}
                                    <v.icon className="h-3.5 w-3.5" />
                                    {v.label}
                                </button>
                            ))}
                        </div>
                    )}
                    {/* Office settings are administration, so a MANAGER sees team presence but not this. */}
                    {isAdmin && (
                        <button type="button" onClick={() => setIsSettingsOpen(true)} className="md-btn md-btn-secondary md-btn-sm">
                            <FiSettings className="h-4 w-4" />
                            Office settings
                        </button>
                    )}
                </div>
            </div>

            <AnimatePresence mode="wait" initial={false}>
                {view === 'my' && (
                    <motion.div
                        key="my"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.18 }}
                    >
                        {/* Map hero with the attendance card floating on it. It pins to the
                            top and closes as you scroll; the page colour behind it hides the
                            history passing underneath. */}
                        <div ref={anchorRef} aria-hidden="true" />
                        <div
                            className="sticky top-3 z-20 bg-background before:absolute before:inset-x-0 before:-top-3 before:h-3 before:bg-background"
                        >
                        <motion.section
                            className="relative overflow-hidden rounded-[28px] border border-card-border bg-card"
                            style={{ isolation: 'isolate', height: mapHeight }}
                        >
                            <AttendanceMap
                                officeLocations={officeLocations}
                                cartoApiLink={cartoApiLink}
                                user={me}
                                organization={organization}
                                onMapClick={() => setIsRecentOpen((open) => !open)}
                            />

                            <div className="absolute inset-x-3 bottom-3 z-[1000] max-h-[calc(100%-4.5rem)] overflow-y-auto rounded-[28px] sm:inset-x-auto sm:bottom-4 sm:left-4 sm:w-[400px]">
                                <AttendanceStatusCard record={myToday} />
                            </div>

                            {!isRecentOpen && (
                                <span className="pointer-events-none absolute bottom-4 right-4 z-[1000] hidden items-center gap-2 rounded-full border border-card-border bg-background px-3 py-1.5 text-xs text-text-muted lg:inline-flex">
                                    <FiMousePointer className="h-3.5 w-3.5" /> Click the map for recent days
                                </span>
                            )}

                            <AnimatePresence>
                                {isRecentOpen && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 12, scale: 0.98 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 8, scale: 0.98 }}
                                        transition={{ duration: 0.2, ease }}
                                        className="absolute inset-x-3 top-14 z-[1001] flex max-h-[calc(100%-4.5rem)] origin-bottom-right flex-col rounded-[28px] border border-card-border bg-background p-2 sm:inset-x-auto sm:bottom-4 sm:right-16 sm:top-auto sm:w-[360px] sm:max-h-[calc(100%-2rem)]"
                                    >
                                        <div className="flex items-center justify-between px-3 pb-1 pt-2">
                                            <h3 className="text-sm font-semibold text-foreground">Recent days</h3>
                                            <button
                                                type="button"
                                                onClick={() => setIsRecentOpen(false)}
                                                aria-label="Close recent days"
                                                className="grid h-8 w-8 place-items-center rounded-full text-text-muted transition-colors hover:bg-foreground/[0.06] hover:text-foreground"
                                            >
                                                <FiX className="h-4 w-4" />
                                            </button>
                                        </div>
                                        {recent.length === 0 ? (
                                            <p className="px-3 py-6 text-center text-xs text-text-muted">No activity logged yet.</p>
                                        ) : (
                                            <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto">
                                                {recent.map((r, i) => {
                                                    const state = (r.attendance_state || 'NOT_CLOCKED_IN') as AttendanceState;
                                                    const colors = attendanceStateColors[state] || attendanceStateColors.NOT_CLOCKED_IN;
                                                    const date = r.work_date || r.date;
                                                    return (
                                                        <li key={r.id ?? i} className="flex items-center gap-3 rounded-full px-3 py-2 transition-colors hover:bg-foreground/[0.04]">
                                                            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-foreground/[0.05] text-text-muted">
                                                                <FiClock className="h-3.5 w-3.5" />
                                                            </span>
                                                            <span className="min-w-0 flex-1">
                                                                <span className="block truncate text-sm text-foreground" suppressHydrationWarning>
                                                                    {date ? new Date(date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }) : '—'}
                                                                </span>
                                                                <span className="block font-numbers text-xs text-text-muted" suppressHydrationWarning>
                                                                    {shortTime(r.clock_in_at ?? r.clock_in)} – {shortTime(r.clock_out_at ?? r.clock_out)}
                                                                </span>
                                                            </span>
                                                            <span className="font-numbers text-sm font-semibold text-foreground">{recordHours(r)}</span>
                                                            <span className={`hidden rounded-full px-2 py-0.5 text-[11px] font-medium sm:inline ${colors.bg} ${colors.text}`}>
                                                                {attendanceStateLabels[state]}
                                                            </span>
                                                        </li>
                                                    );
                                                })}
                                            </ul>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => { setIsRecentOpen(false); scrollToHistory(); }}
                                            className="mt-1 flex min-h-10 w-full items-center justify-center gap-2 rounded-full text-sm text-accent-text transition-colors hover:bg-accent/10"
                                        >
                                            Full history <FiArrowDown className="h-3.5 w-3.5" />
                                        </button>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.section>
                        </div>
                        {/* Grows as the map closes, so the history tracks the map's edge. */}
                        <motion.div aria-hidden="true" style={{ height: spacer }} />

                        {/* History sheet: rises with the map's closing edge */}
                        <div className="relative z-10 pt-3">
                            <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-foreground/[0.12]" aria-hidden="true" />
                            <AttendanceHistoryTable records={liveMyHistory || []} />
                        </div>
                    </motion.div>
                )}

                {view === 'team' && isManager && (
                    <motion.div
                        key="team"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.18 }}
                    >
                        <TeamAttendanceGrid
                            initialRecords={liveTeamToday || []}
                            initialHistory={liveTeamHistory || []}
                            users={users}
                            isManager={isManager}
                            isAdmin={isAdmin}
                            currentUserId={currentUserId}
                        />
                    </motion.div>
                )}
            </AnimatePresence>

            {isAdmin && (
                <SettingsDialog isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)}>
                    <OfficeSettings initialLocations={officeLocations} organization={organization} cartoApiLink={cartoApiLink} />
                </SettingsDialog>
            )}
        </div>
    );
}
