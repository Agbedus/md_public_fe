'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import useSWR, { useSWRConfig } from 'swr';
import { fetchMyAttendanceLive } from '@/app/(dashboard)/[orgSlug]/attendance/actions';
import type { AttendanceRecord } from '@/types/attendance';
import { presenceStateLabels, presenceStateColors, attendanceStateLabels, attendanceStateColors } from '@/types/attendance';
import { useLocation } from '@/providers/location-provider';
import { getDistanceInMeters, formatDistance } from '@/lib/distance-utils';
import { FiMapPin, FiClock, FiTarget, FiActivity, FiNavigation, FiZap, FiChevronDown, FiX, FiCheck, FiAlertTriangle, FiLoader, FiLogOut } from 'react-icons/fi';
import { useIsClient } from '@/hooks/use-is-client';
import { useOrgSlug } from '@/hooks/use-org-slug';
import { workspaceCacheKey } from '@/lib/workspace-cache';

import { BusyIcon } from '@/components/ui/busy-icon';
interface AttendanceStatusCardProps {
    record: AttendanceRecord | null;
    /** Starts open; the compact row is enough for most visits. */
    defaultExpanded?: boolean;
    className?: string;
}

export default function AttendanceStatusCard({ record: initialRecord, defaultExpanded = false, className = '' }: AttendanceStatusCardProps) {
    const mounted = useIsClient();
    const orgSlug = useOrgSlug();
    const [isExpanded, setIsExpanded] = useState(defaultExpanded);
    // Ticks so "time today" stays live while clocked in.
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        const id = window.setInterval(() => setNow(Date.now()), 30_000);
        return () => window.clearInterval(id);
    }, []);

    const { data: liveRecord } = useSWR(workspaceCacheKey('my-attendance-today', orgSlug), fetchMyAttendanceLive, {
        fallbackData: initialRecord,
        revalidateOnFocus: true,
    });

    const {
        isTracking,
        isSupported,
        permissionState,
        permissionError,
        requestPermission,
        presenceState: manualPresence,
        attendanceState: manualAttendance,
        clockInTime: manualClockInTime,
        clockOutTime: manualClockOutTime,
        lastUpdate,
        toggleTracking,
        manualClockIn,
        manualClockOut,
        isLoading,
        clockInPhase,
        isPolling,
        refreshLocation,
        lastPulse,
        location,
        officeLocation,
        autoCheckStatus,
    } = useLocation();
    
    const { mutate: globalMutate } = useSWRConfig();

    const [showConfirm, setShowConfirm] = React.useState(false);
    const [confirmReason, setConfirmReason] = React.useState<string | null>(null);

    const handleClockIn = async () => {
        await manualClockIn();
        
        // Global Sync
        globalMutate(workspaceCacheKey('my-attendance-today', orgSlug));
        globalMutate(workspaceCacheKey('my-attendance-history', orgSlug));
        globalMutate(workspaceCacheKey('team-attendance-today', orgSlug));
        globalMutate(workspaceCacheKey('team-attendance-history', orgSlug));
    };

    const handleClockOut = async () => {
        const result = await manualClockOut();
        if (result?.confirmRequired) {
            setConfirmReason(result.message || "Manual override requested.");
            setShowConfirm(true);
        } else {
            setShowConfirm(false);
            setConfirmReason(null);
        }
    };

    const handleConfirmClockOut = async () => {
        await manualClockOut(true);
        setShowConfirm(false);
        setConfirmReason(null);
        
        // Global Sync
        globalMutate(workspaceCacheKey('my-attendance-today', orgSlug));
        globalMutate(workspaceCacheKey('my-attendance-history', orgSlug));
        globalMutate(workspaceCacheKey('team-attendance-today', orgSlug));
        globalMutate(workspaceCacheKey('team-attendance-history', orgSlug));
    };

    const rawPresence = manualPresence || liveRecord?.presence_state || initialRecord?.presence_state || null;
    const currentAttendance = manualAttendance || liveRecord?.attendance_state || initialRecord?.attendance_state || 'NOT_CLOCKED_IN';

    let currentPresence: import('@/types/attendance').PresenceState;
    if (rawPresence) {
        currentPresence = rawPresence;
    } else if (currentAttendance === 'CLOCKED_IN') {
        currentPresence = 'IN_OFFICE';
    } else {
        currentPresence = 'OUT_OF_OFFICE';
    }

    const clockInTime = manualClockInTime || liveRecord?.clock_in_at || liveRecord?.clock_in || initialRecord?.clock_in_at || initialRecord?.clock_in;
    const clockOutTime = manualClockOutTime || liveRecord?.clock_out_at || liveRecord?.clock_out || initialRecord?.clock_out_at || initialRecord?.clock_out;
    const latestPulse = lastPulse || lastUpdate;
    const pColors = presenceStateColors[currentPresence];
    const aColors = attendanceStateColors[currentAttendance];
    const autoCheckCopy = {
        permission_required: {
            title: 'Auto clock-in needs location access',
            detail: 'Allow GPS so checks can run throughout the clock-in window.',
        },
        monitoring: {
            title: 'Auto clock-in is monitoring',
            detail: 'Your location is checked every minute during the clock-in window.',
        },
        checking: {
            title: 'Checking your office location',
            detail: 'Confirming continuous presence for automatic clock-in.',
        },
        waiting_for_signal: {
            title: 'Waiting for a reliable GPS signal',
            detail: 'Checks will continue automatically when location becomes available.',
        },
    } as const;

    const distance = useMemo(() => {
        if (!location || !officeLocation) return null;
        return getDistanceInMeters(location.latitude, location.longitude, officeLocation.latitude, officeLocation.longitude);
    }, [location, officeLocation]);

    const timeToday = (() => {
        if (!mounted) return '0h 0m';
        let totalSec = liveRecord?.total_seconds || initialRecord?.total_seconds || 0;
        if (currentAttendance === 'CLOCKED_IN' && clockInTime) {
            totalSec += Math.max(0, Math.floor((now - new Date(clockInTime).getTime()) / 1000));
        }
        return `${Math.floor(totalSec / 3600)}h ${Math.floor((totalSec % 3600) / 60)}m`;
    })();

    const isClockedIn = currentAttendance === 'CLOCKED_IN';
    const busyLabel = clockInPhase === 'locating'
        ? 'Finding your location…'
        : clockInPhase === 'checking_server'
            ? 'Checking with server…'
            : null;
    const autoCheck = !isClockedIn
        && autoCheckStatus in autoCheckCopy
        && !(autoCheckStatus === 'permission_required' && permissionState === 'denied')
        ? autoCheckCopy[autoCheckStatus as keyof typeof autoCheckCopy]
        : null;

    const metrics = [
        { label: 'Last update', icon: FiActivity, value: mounted && latestPulse ? latestPulse.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--' },
        { label: 'Distance', icon: FiNavigation, value: distance !== null ? formatDistance(distance) : '—' },
        { label: 'Accuracy', icon: FiTarget, value: location?.accuracy ? `${Math.round(location.accuracy)}m` : '—' },
    ];

    const pill = 'inline-flex min-h-9 items-center gap-2 rounded-full px-3.5 text-xs font-medium transition-colors active:scale-[0.97]';

    return (
        <div className={`rounded-[28px] border border-card-border bg-background p-3 ${className}`}>
            {/* Compact row: always visible */}
            <div className="flex items-center gap-3">
                <button
                    type="button"
                    onClick={() => setIsExpanded((open) => !open)}
                    aria-expanded={isExpanded}
                    className="flex min-w-0 flex-1 items-center gap-3 rounded-full p-1 pr-2 text-left transition-colors hover:bg-foreground/[0.04]"
                >
                    <span className="relative shrink-0">
                        <span className={`grid h-11 w-11 place-items-center rounded-full ${pColors.bg}`}>
                            <FiMapPin className={`h-[18px] w-[18px] ${pColors.text}`} />
                        </span>
                        <span className={`absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full ${pColors.dot} ring-2 ring-background`}>
                            {isClockedIn && <span className={`absolute inset-0 rounded-full ${pColors.dot} animate-ping opacity-60`} />}
                        </span>
                    </span>
                    <span className="min-w-0 flex-1">
                        <span className="block truncate text-[15px] font-semibold text-foreground">{presenceStateLabels[currentPresence]}</span>
                        <span className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-text-muted">
                            <span className={aColors.text}>{attendanceStateLabels[currentAttendance]}</span>
                            <span aria-hidden="true">·</span>
                            <span className="font-numbers" suppressHydrationWarning>{timeToday} today</span>
                        </span>
                    </span>
                    <FiChevronDown className={`h-4 w-4 shrink-0 text-text-muted transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} aria-hidden="true" />
                </button>

                {!isClockedIn ? (
                    <button
                        type="button"
                        onClick={handleClockIn}
                        disabled={isLoading}
                        aria-busy={clockInPhase !== 'idle'}
                        data-tooltip={busyLabel ?? 'Clock in'} aria-label={busyLabel ?? 'Clock in'}
                        className="md-btn md-btn-primary md-btn-sm shrink-0 disabled:cursor-wait"
                    >
                        <span className="hidden sm:inline">{busyLabel ?? 'Clock in'}</span>
                        <span className="md-btn-chip"><BusyIcon state={clockInPhase !== 'idle' ? 'loading' : 'idle'} icon={<FiClock />} /></span>
                    </button>
                ) : (
                    <button
                        type="button"
                        onClick={handleClockOut}
                        disabled={isLoading || showConfirm}
                        className="md-btn md-btn-secondary md-btn-sm shrink-0"
                    >
                        <FiLogOut className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">{isLoading ? 'Syncing…' : 'Clock out'}</span>
                    </button>
                )}
            </div>

            {/* Clock-out override confirmation */}
            <AnimatePresence initial={false}>
                {showConfirm && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
                        className="overflow-hidden"
                    >
                        <div className="mt-3 flex items-center gap-3 rounded-[22px] bg-danger/10 p-2 pl-4">
                            <FiAlertTriangle className="h-4 w-4 shrink-0 text-danger-text" />
                            <p className="min-w-0 flex-1 text-xs text-foreground">{confirmReason || 'Manual override required'}</p>
                            <button
                                type="button"
                                onClick={handleConfirmClockOut}
                                disabled={isLoading}
                                className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-danger text-on-danger transition-transform active:scale-95"
                                data-tooltip="Confirm override"
                                aria-label="Confirm clock out"
                            >
                                <FiCheck className="h-4 w-4" />
                            </button>
                            <button
                                type="button"
                                onClick={() => { setShowConfirm(false); setConfirmReason(null); }}
                                className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-foreground/[0.06] text-text-muted transition-colors hover:text-foreground active:scale-95"
                                data-tooltip="Cancel"
                                aria-label="Cancel clock out"
                            >
                                <FiX className="h-4 w-4" />
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Expanded details */}
            <AnimatePresence initial={false}>
                {isExpanded && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.24, ease: [0.23, 1, 0.32, 1] }}
                        className="overflow-hidden"
                    >
                        <div className="space-y-3 px-1 pb-1 pt-3">
                            {permissionState === 'denied' && (
                                <div className="flex items-center gap-3 rounded-[22px] bg-warning/12 p-2 pl-4">
                                    <FiAlertTriangle className="h-4 w-4 shrink-0 text-warning-text" />
                                    <p className="min-w-0 flex-1 text-xs text-foreground">Location access is blocked. Allow it in your browser settings to check in.</p>
                                    <button type="button" onClick={() => requestPermission()} className={`${pill} shrink-0 bg-warning text-on-warning`}>Allow</button>
                                </div>
                            )}

                            {autoCheck && (
                                <div className={`flex items-center gap-3 rounded-[22px] p-2 pl-4 ${autoCheckStatus === 'waiting_for_signal' ? 'bg-warning/12' : 'bg-success/12'}`}>
                                    <FiActivity className={`h-4 w-4 shrink-0 ${autoCheckStatus === 'waiting_for_signal' ? 'text-warning-text' : 'text-success-text'}`} />
                                    <div className="min-w-0 flex-1 py-1">
                                        <p className="text-xs font-semibold text-foreground">{autoCheck.title}</p>
                                        <p className="mt-0.5 text-[11px] leading-relaxed text-text-muted">{autoCheck.detail}</p>
                                    </div>
                                    {autoCheckStatus === 'permission_required' && (
                                        <button type="button" onClick={() => requestPermission()} className={`${pill} shrink-0 bg-ink text-on-ink`}>Enable GPS</button>
                                    )}
                                </div>
                            )}

                            <div className="grid grid-cols-3 gap-2">
                                {metrics.map(({ label, icon: Icon, value }) => (
                                    <div key={label} className="rounded-[20px] bg-foreground/[0.04] px-3 py-2.5">
                                        <span className="flex items-center gap-1.5 text-[11px] text-text-muted">
                                            <Icon className="h-3 w-3" /> {label}
                                        </span>
                                        <p className="mt-1 font-numbers text-lg font-semibold leading-none text-foreground" suppressHydrationWarning>{value}</p>
                                    </div>
                                ))}
                            </div>

                            <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 px-1 text-xs">
                                <div>
                                    <dt className="text-text-muted">Clocked in at</dt>
                                    <dd className="font-numbers text-foreground" suppressHydrationWarning>
                                        {mounted && liveRecord?.first_seen_in_office_at ? new Date(liveRecord.first_seen_in_office_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Waiting…'}
                                    </dd>
                                </div>
                                <div className="text-right">
                                    <dt className="text-text-muted">Clocked out at</dt>
                                    <dd className="font-numbers text-foreground" suppressHydrationWarning>
                                        {mounted && clockOutTime ? new Date(clockOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-text-muted">Coordinates</dt>
                                    <dd className="font-numbers text-text-secondary">
                                        {location ? `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}` : 'Locating…'}
                                    </dd>
                                </div>
                                <div className="text-right">
                                    <dt className="text-text-muted">Connection</dt>
                                    <dd className="inline-flex items-center gap-1.5 text-success-text">
                                        Encrypted <span className="h-1.5 w-1.5 rounded-full bg-success" />
                                    </dd>
                                </div>
                            </dl>

                            <div className="flex flex-wrap items-center gap-2 border-t border-card-border pt-3">
                                <button
                                    type="button"
                                    onClick={refreshLocation}
                                    disabled={isLoading}
                                    data-tooltip="Refresh your GPS location" aria-label="Refresh your GPS location"
                                    className={`${pill} ${isPolling || isLoading ? 'bg-accent/12 text-accent-text' : 'bg-foreground/[0.05] text-text-secondary hover:text-foreground'}`}
                                >
                                    <FiTarget className={`h-3.5 w-3.5 ${isLoading ? 'animate-pulse' : ''}`} /> Sync location
                                </button>
                                {isSupported && (
                                    <button
                                        type="button"
                                        onClick={toggleTracking}
                                        aria-pressed={isTracking}
                                        className={`${pill} ${isTracking ? 'bg-success/15 text-success-text' : 'bg-foreground/[0.05] text-text-secondary hover:text-foreground'}`}
                                    >
                                        <FiZap className={`h-3.5 w-3.5 ${isTracking ? 'animate-pulse' : ''}`} /> GPS {isTracking ? 'on' : 'off'}
                                    </button>
                                )}
                                {permissionError && <span className="text-[11px] text-danger-text">{permissionError}</span>}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
