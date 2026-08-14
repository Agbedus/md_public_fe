'use client';

import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import useSWR, { useSWRConfig } from 'swr';
import { fetchMyAttendanceLive } from '@/app/(dashboard)/[orgSlug]/attendance/actions';
import type { AttendanceRecord } from '@/types/attendance';
import { presenceStateLabels, presenceStateColors, attendanceStateLabels, attendanceStateColors } from '@/types/attendance';
import { useLocation } from '@/providers/location-provider';
import { getDistanceInMeters, formatDistance } from '@/lib/distance-utils';
import { FiMapPin, FiClock, FiTarget, FiActivity, FiNavigation, FiZap, FiChevronDown, FiChevronUp, FiX, FiCheck, FiAlertTriangle } from 'react-icons/fi';
import { useIsClient } from '@/hooks/use-is-client';

export default function AttendanceStatusCard({ record: initialRecord }: { record: AttendanceRecord | null }) {
    const mounted = useIsClient();
    const [showMetadata, setShowMetadata] = useState(false);

    const { data: liveRecord, mutate, isValidating } = useSWR('my-attendance-today', fetchMyAttendanceLive, {
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
        globalMutate('my-attendance-today');
        globalMutate('my-attendance-history');
        globalMutate('team-attendance-today');
        globalMutate('team-attendance-history');
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
        globalMutate('my-attendance-today');
        globalMutate('my-attendance-history');
        globalMutate('team-attendance-today');
        globalMutate('team-attendance-history');
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

    return (
        <div className="glass p-6 rounded-2xl border border-card-border flex flex-col gap-6 relative overflow-hidden">
            {/* Background Gradient */}
            <div className={`absolute -top-10 -right-10 w-40 h-40 rounded-full blur-[80px] opacity-20 ${pColors.bg}`} />
            
            {/* LAYER 1: Header (Icon + Labels + Controls) */}
            <div className="flex items-center justify-between z-10">
                <div className="flex items-center gap-4">
                    {/* Pulsing Presence Icon */}
                    <div className="relative">
                        <div className={`w-12 h-12 rounded-2xl ${pColors.bg} flex items-center justify-center transition-colors border border-card-border`}>
                            <FiMapPin className={`text-xl ${pColors.text}`} />
                        </div>
                        <div className={`absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full ${pColors.dot} ring-4 ring-card`}>
                            {currentAttendance === 'CLOCKED_IN' && (
                                <div className={`absolute inset-0 rounded-full ${pColors.dot} animate-ping opacity-75`} />
                            )}
                        </div>
                    </div>

                    <div className="flex flex-col gap-0.5">
                        <h2 className="text-sm font-bold text-foreground leading-none tracking-tight">
                            {presenceStateLabels[currentPresence]}
                        </h2>
                        <span className={`inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest ${aColors.text} opacity-80 mt-1`}>
                            {attendanceStateLabels[currentAttendance]}
                        </span>
                    </div>
                </div>

                {/* Top Right Controls */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={refreshLocation}
                        disabled={isLoading}
                        title="Refresh your GPS location"
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${
                            isPolling || isLoading 
                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500 animate-pulse' 
                                : 'text-text-muted hover:text-foreground bg-foreground/[0.03] border border-card-border hover:bg-foreground/[0.08]'
                        }`}
                    >
                        <FiTarget className={`text-xs ${isLoading ? 'animate-pulse text-emerald-500' : ''}`} />
                        Sync
                    </button>
                    {isSupported && (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={toggleTracking}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[10px] font-bold uppercase tracking-widest transition-all ${
                                    isTracking 
                                        ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' 
                                        : 'bg-foreground/[0.03] border-card-border text-text-muted hover:text-foreground'
                                }`}
                            >
                                <FiZap className={`w-3 h-3 ${isTracking ? 'animate-pulse text-emerald-400' : ''}`} />
                                <span className="hidden sm:inline">GPS</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Location Permission Alert */}
            {permissionState === 'denied' && (
                <div className="z-10 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between gap-3 backdrop-blur-md">
                    <div className="flex items-center gap-2.5">
                        <FiAlertTriangle className="text-amber-400 shrink-0 w-4 h-4" />
                        <span className="text-[11px] font-medium leading-tight">
                            Location access is blocked. Allow location access in browser settings to check in.
                        </span>
                    </div>
                    <button
                        onClick={() => requestPermission()}
                        className="px-2.5 py-1.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-200 text-[9px] font-bold uppercase tracking-wider shrink-0 hover:bg-amber-500/30 transition-all active:scale-95"
                    >
                        Allow
                    </button>
                </div>
            )}

            {currentAttendance !== 'CLOCKED_IN'
                && autoCheckStatus in autoCheckCopy
                && !(autoCheckStatus === 'permission_required' && permissionState === 'denied') && (
                <div className={`z-10 rounded-xl border p-3.5 flex items-center justify-between gap-3 ${
                    autoCheckStatus === 'waiting_for_signal'
                        ? 'bg-amber-500/10 border-amber-500/30'
                        : 'bg-emerald-500/10 border-emerald-500/30'
                }`}>
                    <div className="flex items-start gap-3 min-w-0">
                        <FiActivity className={`w-4 h-4 mt-0.5 shrink-0 ${
                            autoCheckStatus === 'waiting_for_signal'
                                ? 'text-amber-400'
                                : 'text-emerald-500'
                        }`} />
                        <div className="min-w-0">
                            <p className="text-xs font-semibold text-foreground">
                                {autoCheckCopy[autoCheckStatus as keyof typeof autoCheckCopy].title}
                            </p>
                            <p className="text-[11px] text-text-muted mt-0.5 leading-relaxed">
                                {autoCheckCopy[autoCheckStatus as keyof typeof autoCheckCopy].detail}
                            </p>
                        </div>
                    </div>
                    {autoCheckStatus === 'permission_required' && (
                        <button
                            type="button"
                            onClick={() => requestPermission()}
                            className="min-h-11 px-3 rounded-md bg-emerald-500 text-emerald-950 text-xs font-semibold hover:bg-emerald-400 active:bg-emerald-600 transition-colors shrink-0"
                        >
                            Enable GPS
                        </button>
                    )}
                </div>
            )}

            {/* LAYER 2: Hero Action (Full-width button) */}
            <div className="w-full z-10">
                {currentAttendance !== 'CLOCKED_IN' ? (
                    <button
                        onClick={handleClockIn}
                        disabled={isLoading}
                        className="group relative w-full flex items-center justify-center gap-3 py-3.5 rounded-2xl bg-emerald-500 text-emerald-950 hover:bg-emerald-400 active:scale-[0.96] transition-all duration-500 shadow-lg shadow-emerald-500/20"
                    >
                        <FiClock className="w-4 h-4" />
                        <span className="text-sm font-bold uppercase tracking-wide leading-none">
                            {isLoading ? 'Locating...' : 'Clock In'}
                        </span>
                    </button>
                ) : (
                    <div className="relative h-[60px] w-full">
                        <AnimatePresence mode="wait">
                            {!showConfirm ? (
                                <motion.button
                                    key="clock-out-btn"
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    onClick={handleClockOut}
                                    disabled={isLoading}
                                    className="group w-full h-full flex items-center justify-center gap-3 rounded-2xl bg-foreground/[0.03] border border-card-border text-foreground hover:bg-foreground/[0.06] active:scale-[0.98] transition-all duration-300"
                                >
                                    <FiX className="w-4 h-4 group-hover:text-rose-400 transition-colors" />
                                    <span className="text-sm font-bold uppercase tracking-wide leading-none">
                                        {isLoading ? 'Syncing...' : 'Clock Out'}
                                    </span>
                                </motion.button>
                            ) : (
                                <motion.div
                                    key="confirm-banner"
                                    initial={{ opacity: 0, y: 10, filter: 'blur(10px)' }}
                                    animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                                    exit={{ opacity: 0, y: -10, filter: 'blur(10px)' }}
                                    className="w-full h-full flex items-center justify-between gap-4 px-5 rounded-2xl bg-rose-500/10 border border-rose-500/30 backdrop-blur-xl relative overflow-hidden group shadow-md shadow-rose-500/5"
                                >
                                    {/* Accent line */}
                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-rose-500/50" />
                                    
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <div className="p-2 rounded-lg bg-rose-500/20">
                                            <FiAlertTriangle className="text-rose-400 w-4 h-4 animate-pulse" />
                                        </div>
                                        <p className="text-[11px] font-bold text-rose-300/90 leading-tight uppercase tracking-wide truncate pr-2">
                                            {confirmReason || "Manual override required"}
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0">
                                        <button
                                            onClick={handleConfirmClockOut}
                                            disabled={isLoading}
                                            className="w-10 h-10 rounded-xl bg-rose-500 text-white flex items-center justify-center hover:bg-rose-600 active:scale-90 transition-all shadow-sm shadow-rose-500/10"
                                            title="Confirm Override"
                                        >
                                            <FiCheck className="w-5 h-5" />
                                        </button>
                                        <button
                                            onClick={() => {
                                                setShowConfirm(false);
                                                setConfirmReason(null);
                                            }}
                                            className="w-10 h-10 rounded-xl bg-foreground/5 border border-card-border text-text-muted flex items-center justify-center hover:text-foreground hover:bg-foreground/10 active:scale-90 transition-all"
                                            title="Cancel"
                                        >
                                            <FiX className="w-5 h-5" />
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                )}
            </div>

            {/* LAYER 3: Metrics Strip */}
            <div className="grid grid-cols-3 gap-1 bg-foreground/[0.01] rounded-2xl border border-card-border overflow-hidden z-10">
                <div className="flex flex-col items-center justify-center py-4 bg-foreground/[0.02]">
                    <span className="text-[8px] font-bold text-text-muted uppercase tracking-widest flex items-center gap-1.5 mb-1">
                        <FiActivity className="text-emerald-500/60 w-2.5 h-2.5" />
                        Last update
                    </span>
                    <p className="text-2xl font-numbers font-black text-foreground tracking-tighter" suppressHydrationWarning>
                        {mounted && latestPulse ? latestPulse.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                    </p>
                </div>
                
                <div className="flex flex-col items-center justify-center py-4 bg-foreground/[0.02] border-x border-card-border">
                    <span className="text-[8px] font-bold text-text-muted uppercase tracking-widest flex items-center gap-1.5 mb-1">
                        <FiNavigation className="text-sky-500/60 w-2.5 h-2.5" />
                        Distance
                    </span>
                    <p className="text-2xl font-numbers font-black text-foreground tracking-tighter">
                        {distance !== null ? formatDistance(distance) : '—'}
                    </p>
                </div>

                <div className="flex flex-col items-center justify-center py-4 bg-foreground/[0.02]">
                    <span className="text-[8px] font-bold text-text-muted uppercase tracking-widest flex items-center gap-1.5 mb-1">
                        <FiTarget className="text-rose-500/60 w-2.5 h-2.5" />
                        Accuracy
                    </span>
                    <p className="text-2xl font-numbers font-black text-foreground tracking-tighter">
                        {location?.accuracy ? `${Math.round(location.accuracy)}m` : '—'}
                    </p>
                </div>
            </div>

            {/* LAYER 4: Technical Metadata Toggle */}
            <div className="z-10">
                <button
                    onClick={() => setShowMetadata(!showMetadata)}
                    className="w-full flex items-center justify-between text-[10px] font-bold text-text-muted uppercase tracking-widest hover:text-foreground transition-colors group px-1"
                >
                    <span className="flex items-center gap-2">
                        <div className={`w-1 h-1 rounded-full ${isLoading || isPolling ? 'bg-emerald-500 animate-pulse' : 'bg-text-muted'}`} />
                        More details
                    </span>
                    {showMetadata ? <FiChevronUp /> : <FiChevronDown />}
                </button>
                
                <AnimatePresence>
                    {showMetadata && (
                        <motion.div 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                        >
                            <div className="pt-4 grid grid-cols-2 gap-y-4">
                                <div className="flex flex-col gap-0.5">
                                    <span className="text-[8px] font-bold text-text-muted uppercase tracking-tighter">Time today</span>
                                    <span className="text-xs font-numbers text-foreground font-medium tracking-tight">
                                        {mounted ? (
                                            (() => {
                                                const cumulativeSeconds = liveRecord?.total_seconds || initialRecord?.total_seconds || 0;
                                                let totalSec = cumulativeSeconds;
                                                
                                                if (currentAttendance === 'CLOCKED_IN' && clockInTime) {
                                                    const start = new Date(clockInTime);
                                                    const now = new Date();
                                                    const sessionSec = Math.max(0, Math.floor((now.getTime() - start.getTime()) / 1000));
                                                    totalSec += sessionSec;
                                                }

                                                const h = Math.floor(totalSec / 3600);
                                                const m = Math.floor((totalSec % 3600) / 60);
                                                return `${h}h ${m}m`;
                                            })()
                                        ) : '0h 0m'}
                                    </span>
                                </div>
                                <div className="flex flex-col gap-0.5 items-end">
                                    <span className="text-[8px] font-bold text-text-muted uppercase tracking-tighter">Clocked in at</span>
                                    <span className="text-xs font-numbers text-foreground font-medium tracking-tight" suppressHydrationWarning>
                                        {mounted && liveRecord?.first_seen_in_office_at ? new Date(liveRecord.first_seen_in_office_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Waiting...'}
                                    </span>
                                </div>
                                <div className="flex flex-col gap-0.5">
                                    <span className="text-[8px] font-bold text-text-muted uppercase tracking-tighter">Coordinates</span>
                                    <span className="text-[10px] font-numbers text-text-secondary font-medium tracking-tight">
                                        {location ? `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}` : 'Locating...'}
                                    </span>
                                </div>
                                <div className="flex flex-col gap-0.5 items-end">
                                    <span className="text-[8px] font-bold text-text-muted uppercase tracking-tighter">Connection</span>
                                    <span className="text-[10px] font-bold text-emerald-500/80 uppercase tracking-widest flex items-center gap-1.5">
                                        Encrypted
                                        <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                                    </span>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
