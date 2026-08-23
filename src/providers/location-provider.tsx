'use client';

/* eslint-disable react-hooks/immutability */

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef, startTransition } from 'react';
import { useSWRConfig } from 'swr';
import { updateLocation, getOfficeLocations, clockOutManual } from '@/app/(dashboard)/[orgSlug]/attendance/actions';
import { getDistanceInMeters } from '@/lib/distance-utils';
import { toast } from '@/lib/toast';
import type { PresenceState, AttendanceState, AttendancePolicy, OfficeLocation, AttendanceRecord } from '@/types/attendance';
import { workspaceCacheKey, workspaceStorageKey } from '@/lib/workspace-cache';

const STORAGE_KEY = 'md_location_tracking_enabled';
const CONFIG_CACHE_KEY = 'md_attendance_config_cache';
const SYNC_THROTTLE_MS = 5 * 60 * 1000; // Throttle backend sync to once per 5 minutes unless state changes
const GEOLOCATION_RETRY_DELAYS_MS = [5000, 10000, 30000, 60000];
const AUTO_CLOCK_IN_CHECK_INTERVAL_MS = 60 * 1000;
const POLICY_CLOCK_INTERVAL_MS = 30 * 1000;

import { isTimeInWindow, isAfterTime, isAutoClockInWindowOpen } from '@/lib/attendance-utils';

export type LocationPermissionState = 'granted' | 'prompt' | 'denied' | 'unsupported' | 'checking';
export type AutoCheckStatus = 'inactive' | 'permission_required' | 'monitoring' | 'checking' | 'waiting_for_signal' | 'completed';
export type ClockInPhase = 'idle' | 'locating' | 'checking_server';

interface LocationContextType {
    isTracking: boolean;
    isSupported: boolean;
    permissionState: LocationPermissionState;
    permissionError: string | null;
    presenceState: PresenceState | null;
    attendanceState: AttendanceState | null;
    lastUpdate: Date | null;
    clockInTime: string | null;
    clockOutTime: string | null;
    toggleTracking: () => void;
    requestPermission: () => Promise<boolean>;
    manualClockIn: () => Promise<void>;
    manualClockOut: (force?: boolean) => Promise<{ success?: boolean; confirmRequired?: boolean; message?: string }>;
    isLoading: boolean;
    clockInPhase: ClockInPhase;
    isPolling: boolean;
    refreshLocation: () => Promise<void>;
    lastPulse: Date | null;
    location: { latitude: number; longitude: number; accuracy: number | null } | null;
    officeLocation: { latitude: number; longitude: number } | null;
    autoCheckStatus: AutoCheckStatus;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);



function getAccuratePosition(timeoutMs = 15000, desiredAccuracy = 35): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
        let watchId: number;
        let bestPosition: GeolocationPosition | null = null;
        let timeoutId: NodeJS.Timeout;

        const cleanup = () => {
            navigator.geolocation.clearWatch(watchId);
            clearTimeout(timeoutId);
        };

        watchId = navigator.geolocation.watchPosition(
            (pos) => {
                if (!bestPosition || pos.coords.accuracy < bestPosition.coords.accuracy) {
                    bestPosition = pos;
                }
                if (pos.coords.accuracy <= desiredAccuracy) {
                    cleanup();
                    resolve(pos);
                }
            },
            (err) => {
                if (!bestPosition) {
                    cleanup();
                    reject(err);
                }
            },
            { enableHighAccuracy: true, maximumAge: 0, timeout: timeoutMs }
        );

        timeoutId = setTimeout(() => {
            cleanup();
            if (bestPosition) {
                resolve(bestPosition);
            } else {
                reject(new Error("Timeout waiting for location"));
            }
        }, timeoutMs);
    });
}

export function LocationProvider({ 
    children,
    initialRecord,
    workspaceScope,
}: { 
    children: React.ReactNode;
    initialRecord?: AttendanceRecord | null;
    workspaceScope?: string | null;
}) {
    const { mutate } = useSWRConfig();
    const trackingStorageKey = workspaceStorageKey(STORAGE_KEY, workspaceScope);
    const configurationStorageKey = workspaceStorageKey(CONFIG_CACHE_KEY, workspaceScope);
    const [isTracking, setIsTracking] = useState(false);
    const [isSupported, setIsSupported] = useState(true);
    const [permissionState, setPermissionState] = useState<LocationPermissionState>('checking');
    const [permissionError, setPermissionError] = useState<string | null>(null);

    // Check browser geolocation permissions
    const checkPermission = useCallback(async () => {
        if (typeof window === 'undefined' || !navigator.geolocation) {
            setPermissionState('unsupported');
            setIsSupported(false);
            setPermissionError('Geolocation is not supported by your browser.');
            return;
        }

        if (navigator.permissions && navigator.permissions.query) {
            try {
                const status = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
                setPermissionState(status.state as LocationPermissionState);
                if (status.state === 'denied') {
                    setPermissionError('Location access is blocked in your browser settings.');
                } else {
                    setPermissionError(null);
                }

                status.onchange = () => {
                    const newState = status.state as LocationPermissionState;
                    setPermissionState(newState);
                    if (newState === 'denied') {
                        setPermissionError('Location access is blocked in your browser settings.');
                        setIsTracking(false);
                    } else if (newState === 'granted') {
                        setPermissionError(null);
                        const stored = localStorage.getItem(trackingStorageKey);
                        if (stored === 'true') {
                            setIsTracking(true);
                        }
                    }
                };
            } catch (e) {
                setPermissionState('prompt');
            }
        } else {
            setPermissionState('prompt');
        }
    }, [trackingStorageKey]);

    const requestPermission = useCallback(async (): Promise<boolean> => {
        if (!navigator.geolocation) {
            setPermissionState('unsupported');
            setIsSupported(false);
            toast.error('Geolocation is not supported by your browser.');
            return false;
        }

        return new Promise((resolve) => {
            navigator.geolocation.getCurrentPosition(
                () => {
                    setPermissionState('granted');
                    setPermissionError(null);
                    resolve(true);
                },
                (error) => {
                    if (error.code === error.PERMISSION_DENIED) {
                        setPermissionState('denied');
                        setPermissionError('Location permission denied. Please allow location access in your browser site settings.');
                        toast.error('Location permission denied. Please allow location access in browser site settings.');
                    } else {
                        toast.error(`Location error: ${error.message}`);
                    }
                    resolve(false);
                },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            );
        });
    }, []);

    // Policy-aligned initial presence: if clocked in but no presence_state on the initial record,
    // assume IN_OFFICE since the backend auto-clocks in when IN_OFFICE is first confirmed.
    const deriveInitialPresence = (record: AttendanceRecord | null | undefined): PresenceState | null => {
        if (!record) return null;
        if (record.presence_state) return record.presence_state;
        if (record.attendance_state === 'CLOCKED_IN') return 'IN_OFFICE';
        return null;
    };

    const [confirmedPresenceState, setConfirmedPresenceState] = useState<PresenceState | null>(deriveInitialPresence(initialRecord));
    const [attendanceState, setAttendanceState] = useState<AttendanceState | null>(initialRecord?.attendance_state || null);
    const [clockInTime, setClockInTime] = useState<string | null>(initialRecord?.clock_in_at || initialRecord?.clock_in || null);
    const [clockOutTime, setClockOutTime] = useState<string | null>(initialRecord?.clock_out_at || initialRecord?.clock_out || null);
    const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [clockInPhase, setClockInPhase] = useState<ClockInPhase>('idle');
    const [location, setLocation] = useState<{ latitude: number; longitude: number; accuracy: number | null } | null>(null);
    const [officeLocationState, setOfficeLocationState] = useState<{ latitude: number; longitude: number } | null>(null);
    
    const [offices, setOffices] = useState<OfficeLocation[]>([]);
    const officesRef = useRef<OfficeLocation[]>([]);
    const [policies, setPolicies] = useState<Record<number, AttendancePolicy>>({});
    const policiesRef = useRef<Record<number, AttendancePolicy>>({});
    const [isInitialized, setIsInitialized] = useState(false);
    const isInitializedRef = useRef(false);
    const [isPolling, setIsPolling] = useState(false);
    const [lastPulse, setLastPulse] = useState<Date | null>(null);
    const [policyClock, setPolicyClock] = useState(() => new Date());
    const [autoCheckActivityStatus, setAutoCheckActivityStatus] = useState<
        'monitoring' | 'checking' | 'waiting_for_signal'
    >('monitoring');

    // ── Local Presence Derivation ──
    const presenceState = useMemo(() => {
        if (!location || offices.length === 0) return confirmedPresenceState;

        let activeOffice: OfficeLocation | null = null;
        let minDistance = Infinity;
        
        for (const o of offices) {
            const dist = getDistanceInMeters(location.latitude, location.longitude, o.latitude, o.longitude);
            if (dist < minDistance) {
                minDistance = dist;
                activeOffice = o;
            }
        }
        
        if (!activeOffice) return confirmedPresenceState;

        if (minDistance <= activeOffice.in_office_radius_meters) {
            return 'IN_OFFICE';
        } else if (minDistance <= (activeOffice.temporarily_out_radius_meters || activeOffice.in_office_radius_meters * 2.5)) {
            return 'TEMPORARILY_OUT';
        }
        return 'OUT_OF_OFFICE';
    }, [location, confirmedPresenceState, offices]);

    useEffect(() => {
        if (initialRecord) {
            attendanceStateRef.current = initialRecord.attendance_state;
            const initPres = deriveInitialPresence(initialRecord);
            presenceStateRef.current = initPres;
            const frame = window.requestAnimationFrame(() => setConfirmedPresenceState(initPres));
            return () => window.cancelAnimationFrame(frame);
        }
    }, [initialRecord]);
    
    const watchIdRef = useRef<number | null>(null);
    const lastSyncTimeRef = useRef<number>(0);
    const presenceStateRef = useRef<PresenceState | null>(null);
    const attendanceStateRef = useRef<AttendanceState | null>(null);
    const suppressSyncToastRef = useRef(false);
    const isTrackingRef = useRef(false);
    const trackingRetryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const trackingRetryAttemptRef = useRef(0);
    const hasShownUnavailableToastRef = useRef(false);
    const syncInFlightRef = useRef(false);
    const autoCheckRequestInFlightRef = useRef(false);

    // Keep ref in sync for callbacks
    useEffect(() => {
        presenceStateRef.current = presenceState;
    }, [presenceState]);

    const syncConfiguration = useCallback(async (force = false) => {
        try {
            // If not forced, try to load from localStorage first for immediate UI hydration
            const cached = localStorage.getItem(configurationStorageKey);
            if (cached && !force) {
                const cachedConfig = JSON.parse(cached) as {
                    offices?: OfficeLocation[];
                    policies?: Record<number, AttendancePolicy>;
                };
                const cachedOffices = cachedConfig.offices ?? [];
                const cachedPolicies = cachedConfig.policies ?? {};
                officesRef.current = cachedOffices;
                policiesRef.current = cachedPolicies;
                setOffices(cachedOffices);
                setPolicies(cachedPolicies);
                if (cachedOffices.length > 0) {
                    setOfficeLocationState({
                        latitude: cachedOffices[0].latitude,
                        longitude: cachedOffices[0].longitude,
                    });
                }
                isInitializedRef.current = true;
                setIsInitialized(true);
            }

            console.debug('[LocationProvider] Syncing configuration with server...');
            const fetchedOffices = await getOfficeLocations();
            officesRef.current = fetchedOffices;
            setOffices(fetchedOffices);
            if (fetchedOffices.length > 0) {
                setOfficeLocationState({ latitude: fetchedOffices[0].latitude, longitude: fetchedOffices[0].longitude });
            }
            
            const { getAttendancePolicy } = await import('@/app/(dashboard)/[orgSlug]/attendance/actions');
            const newPolicies: Record<number, AttendancePolicy> = {};
            for (const office of fetchedOffices) {
                const p = await getAttendancePolicy(office.id);
                if (p) newPolicies[office.id] = p;
            }
            policiesRef.current = newPolicies;
            setPolicies(newPolicies);
            
            // Update Cache
            localStorage.setItem(configurationStorageKey, JSON.stringify({
                offices: fetchedOffices,
                policies: newPolicies,
                timestamp: Date.now()
            }));

            isInitializedRef.current = true;
            setIsInitialized(true);
        } catch (err) {
            console.error('Failed to sync location config:', err);
            isInitializedRef.current = true;
            setIsInitialized(true); 
        }
    }, [configurationStorageKey]);

    useEffect(() => {
        const initData = async () => {
            await syncConfiguration();
            await checkPermission();
        };

        // Check browser support and restore preference
        startTransition(() => {
            if (typeof window !== 'undefined' && !navigator.geolocation) {
                setIsSupported(false);
                setPermissionState('unsupported');
                return;
            }
            const stored = localStorage.getItem(trackingStorageKey);
            if (stored === 'true') {
                setIsTracking(true);
            }
        });

        initData();
    }, [syncConfiguration, checkPermission, trackingStorageKey]);


    const handlePositionUpdate = useCallback(async (
        position: GeolocationPosition,
        forceSync = false,
    ): Promise<boolean> => {
        const { latitude, longitude, accuracy } = position.coords;
        
        // 1. Instant UI Update
        setLocation({ latitude, longitude, accuracy });
        setLastPulse(new Date());

        const offices = officesRef.current;
        if (!offices || offices.length === 0) return false;

        // 2. Instant Local Evaluation
        let activeOffice: OfficeLocation | null = null;
        let minDistance = Infinity;
        
        for (const o of offices) {
            const dist = getDistanceInMeters(latitude, longitude, o.latitude, o.longitude);
            if (dist < minDistance) {
                minDistance = dist;
                activeOffice = o;
            }
        }
        
        if (!activeOffice) return false;

        let localPresence: PresenceState = 'OUT_OF_OFFICE';
        if (minDistance <= activeOffice.in_office_radius_meters) {
            localPresence = 'IN_OFFICE';
        } else if (minDistance <= (activeOffice.temporarily_out_radius_meters || activeOffice.in_office_radius_meters * 2.5)) {
            localPresence = 'TEMPORARILY_OUT';
        }

        const prevPres = presenceStateRef.current;
        const stateChanged = prevPres !== localPresence;
        
        if (stateChanged) {
            presenceStateRef.current = localPresence;
        }

        // 3. Dynamic Sync (throttled)
        const timeSinceLastSync = Date.now() - lastSyncTimeRef.current;
        const shouldSync = forceSync || stateChanged || timeSinceLastSync >= SYNC_THROTTLE_MS;

        if (
            shouldSync
            && Number.isFinite(accuracy)
            && accuracy > 0
            && isInitializedRef.current
            && !syncInFlightRef.current
        ) {
            syncInFlightRef.current = true;
            setIsPolling(true);
            try {
                const result = await updateLocation(latitude, longitude, accuracy, activeOffice.id);
                if (result.success && result.record) {
                    const newAtt = result.record.attendance_state;
                    const backendPres = result.record.presence_state ?? null;
                    
                    lastSyncTimeRef.current = Date.now();
                    
                    // Sync attendance state (always from backend)
                    const prevAtt = attendanceStateRef.current;
                    attendanceStateRef.current = newAtt;
                    setAttendanceState(newAtt);
                    
                    // Sync presence state (confirming local guess)
                    if (backendPres && backendPres !== localPresence) {
                        presenceStateRef.current = backendPres;
                        setConfirmedPresenceState(backendPres);
                    }

                    setClockInTime(result.record.clock_in_at || result.record.clock_in || null);
                    setClockOutTime(result.record.clock_out_at || result.record.clock_out || null);
                    setLastUpdate(new Date());
                    
                    mutate(workspaceCacheKey('my-attendance-today', workspaceScope));
                    if (prevAtt !== newAtt || (stateChanged && backendPres !== prevPres)) {
                        mutate(workspaceCacheKey('team-attendance-today', workspaceScope));
                        if (prevAtt && prevAtt !== newAtt && !suppressSyncToastRef.current) {
                            if (newAtt === 'CLOCKED_IN') toast.success('Confirmed in office!');
                            else if (newAtt === 'CLOCKED_OUT') toast.info('Attendance finalized.');
                        }
                    }
                    suppressSyncToastRef.current = false;
                    return true;
                }
                console.warn('Attendance location sync was rejected:', result.error);
                return false;
            } catch (err) {
                console.error('Backend sync failed:', err);
                return false;
            } finally {
                syncInFlightRef.current = false;
                setIsPolling(false);
            }
        }
        return false;
    }, [mutate, workspaceScope]);

    const startTrackingRef = useRef<(enableHighAccuracy?: boolean) => void>(() => {});

    const startTracking = useCallback((enableHighAccuracy = true) => {
        if (!navigator.geolocation) return;

        if (trackingRetryTimeoutRef.current !== null) {
            clearTimeout(trackingRetryTimeoutRef.current);
            trackingRetryTimeoutRef.current = null;
        }
        
        if (watchIdRef.current !== null) {
            navigator.geolocation.clearWatch(watchIdRef.current);
        }

        watchIdRef.current = navigator.geolocation.watchPosition(
            (position) => {
                trackingRetryAttemptRef.current = 0;
                hasShownUnavailableToastRef.current = false;
                void handlePositionUpdate(position);
            },
            (error) => {
                if (error.code === error.PERMISSION_DENIED) {
                    if (watchIdRef.current !== null) {
                        navigator.geolocation.clearWatch(watchIdRef.current);
                        watchIdRef.current = null;
                    }
                    setPermissionState('denied');
                    setPermissionError('Location access is blocked in your browser settings.');
                    toast.error('Location permission denied. Tracking disabled.');
                    setIsTracking(false);
                    localStorage.setItem(trackingStorageKey, 'false');
                    return;
                }

                // POSITION_UNAVAILABLE and TIMEOUT are commonly transient on
                // laptops and when a tab resumes. Keep tracking enabled, fall
                // back to network-assisted positioning, and retry with bounded
                // backoff instead of creating a rapid error loop.
                if (watchIdRef.current !== null) {
                    navigator.geolocation.clearWatch(watchIdRef.current);
                    watchIdRef.current = null;
                }

                if (!hasShownUnavailableToastRef.current) {
                    toast.warning('Current position is temporarily unavailable. Retrying in the background.');
                    hasShownUnavailableToastRef.current = true;
                }

                const retryIndex = Math.min(
                    trackingRetryAttemptRef.current,
                    GEOLOCATION_RETRY_DELAYS_MS.length - 1,
                );
                const retryDelay = GEOLOCATION_RETRY_DELAYS_MS[retryIndex];
                trackingRetryAttemptRef.current += 1;

                trackingRetryTimeoutRef.current = setTimeout(() => {
                    trackingRetryTimeoutRef.current = null;
                    if (isTrackingRef.current) {
                        startTrackingRef.current(false);
                    }
                }, retryDelay);
            },
            {
                enableHighAccuracy,
                timeout: enableHighAccuracy ? 20000 : 30000,
                maximumAge: enableHighAccuracy ? 0 : 60000,
            }
        );
    }, [handlePositionUpdate, trackingStorageKey]);

    useEffect(() => {
        startTrackingRef.current = startTracking;
    }, [startTracking]);

    const stopTracking = useCallback(() => {
        if (trackingRetryTimeoutRef.current !== null) {
            clearTimeout(trackingRetryTimeoutRef.current);
            trackingRetryTimeoutRef.current = null;
        }
        if (watchIdRef.current !== null) {
            navigator.geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
        }
        trackingRetryAttemptRef.current = 0;
        hasShownUnavailableToastRef.current = false;
    }, []);

    // Keep ref in sync for callbacks
    useEffect(() => {
        isTrackingRef.current = isTracking;
    }, [isTracking]);

    // Start/stop watch when tracking changes (wait for initialization)
    useEffect(() => {
        if (isTracking && isInitialized) {
            startTracking();
        } else if (!isTracking) {
            stopTracking();
        }
        return () => stopTracking();
    }, [isTracking, isInitialized, startTracking, stopTracking]);

    // Keep policy-window evaluation moving even when the device is stationary
    // and watchPosition does not emit another reading.
    useEffect(() => {
        const updatePolicyClock = () => setPolicyClock(new Date());
        const intervalId = window.setInterval(updatePolicyClock, POLICY_CLOCK_INTERVAL_MS);
        const handleVisibility = () => {
            if (document.visibilityState === 'visible') updatePolicyClock();
        };

        window.addEventListener('focus', updatePolicyClock);
        document.addEventListener('visibilitychange', handleVisibility);
        return () => {
            window.clearInterval(intervalId);
            window.removeEventListener('focus', updatePolicyClock);
            document.removeEventListener('visibilitychange', handleVisibility);
        };
    }, []);

    const activeAutoClockInPolicy = useMemo(() => {
        if (attendanceState === 'CLOCKED_IN') return null;

        for (const office of offices) {
            const policy = policies[office.id];
            if (policy && isAutoClockInWindowOpen(policyClock, policy)) {
                return policy;
            }
        }
        return null;
    }, [attendanceState, offices, policies, policyClock]);

    const autoCheckStatus: AutoCheckStatus = attendanceState === 'CLOCKED_IN'
        ? 'completed'
        : !activeAutoClockInPolicy || !isInitialized
            ? 'inactive'
            : permissionState !== 'granted'
                ? 'permission_required'
                : autoCheckActivityStatus;

    const runAutoClockInCheck = useCallback(() => {
        if (!activeAutoClockInPolicy || attendanceStateRef.current === 'CLOCKED_IN') {
            return;
        }

        if (!navigator.geolocation) {
            setAutoCheckActivityStatus('waiting_for_signal');
            return;
        }
        if (autoCheckRequestInFlightRef.current) return;

        autoCheckRequestInFlightRef.current = true;
        setAutoCheckActivityStatus('checking');
        navigator.geolocation.getCurrentPosition(
            (position) => {
                setPermissionState('granted');
                setPermissionError(null);
                void handlePositionUpdate(position, true).then((didSync) => {
                    setAutoCheckActivityStatus(
                        didSync ? 'monitoring' : 'waiting_for_signal',
                    );
                }).finally(() => {
                    autoCheckRequestInFlightRef.current = false;
                });
            },
            (error) => {
                autoCheckRequestInFlightRef.current = false;
                if (error.code === error.PERMISSION_DENIED) {
                    setPermissionState('denied');
                    setPermissionError('Location access is blocked in your browser settings.');
                    return;
                }
                setAutoCheckActivityStatus('waiting_for_signal');
            },
            {
                enableHighAccuracy: true,
                timeout: 20000,
                maximumAge: 60000,
            },
        );
    }, [activeAutoClockInPolicy, handlePositionUpdate]);

    // Automatic clock-in needs periodic evidence of continuous presence. Run
    // immediately when the policy window opens, every minute during the
    // window, and again whenever a suspended tab becomes active or reconnects.
    useEffect(() => {
        if (attendanceState === 'CLOCKED_IN') {
            return;
        }
        if (!activeAutoClockInPolicy || !isInitialized) {
            return;
        }
        if (
            permissionState === 'checking'
            || permissionState === 'denied'
            || permissionState === 'unsupported'
        ) {
            return;
        }

        const initialCheckId = window.setTimeout(runAutoClockInCheck, 0);
        const intervalId = window.setInterval(
            runAutoClockInCheck,
            AUTO_CLOCK_IN_CHECK_INTERVAL_MS,
        );
        const runWhenVisible = () => {
            if (document.visibilityState === 'visible') runAutoClockInCheck();
        };

        window.addEventListener('focus', runAutoClockInCheck);
        window.addEventListener('online', runAutoClockInCheck);
        document.addEventListener('visibilitychange', runWhenVisible);
        return () => {
            window.clearTimeout(initialCheckId);
            window.clearInterval(intervalId);
            window.removeEventListener('focus', runAutoClockInCheck);
            window.removeEventListener('online', runAutoClockInCheck);
            document.removeEventListener('visibilitychange', runWhenVisible);
        };
    }, [
        activeAutoClockInPolicy,
        attendanceState,
        isInitialized,
        permissionState,
        runAutoClockInCheck,
    ]);

    const toggleTracking = useCallback(() => {
        const next = !isTracking;
        setIsTracking(next);
        localStorage.setItem(trackingStorageKey, String(next));
        if (next) {
            toast.success('Location tracking enabled');
        } else {
            toast.info('Location tracking paused');
        }
    }, [isTracking, trackingStorageKey]);

    const manualClockIn = useCallback(async () => {
        setIsLoading(true);
        setClockInPhase('locating');
        suppressSyncToastRef.current = true;
        try {
            if (!navigator.geolocation) {
                toast.error('Geolocation not supported');
                return;
            }
            toast.loading("Acquiring accurate GPS signal...", { id: 'gps-lock' });
            try {
                const position = await getAccuratePosition(15000, 35);
                toast.dismiss('gps-lock');
                const { latitude, longitude, accuracy } = position.coords;
                
                // Manual Accuracy Gate: Lenient up to 100m for intended actions
                if (accuracy > 100) {
                    toast.error('GPS signal too unstable for secure clock-in.');
                    return;
                }

                const offices = officesRef.current;
                if (!offices || offices.length === 0) {
                    toast.error('No office locations configured.');
                    return;
                }

                let validOfficeId: number | null = null;
                for (const office of offices) {
                    const dist = getDistanceInMeters(latitude, longitude, office.latitude, office.longitude);
                    // strict geofence check
                    if (dist <= office.in_office_radius_meters) {
                        validOfficeId = office.id;
                        break;
                    }
                }

                if (validOfficeId === null) {
                    toast.error('Not strictly in the office geofence.');
                    return;
                }

                // ── Policy window checks ──
                const policy = policiesRef.current[validOfficeId];
                if (policy) {
                    const now = new Date();
                    
                    // 1. Arrival Window
                    const inArrivalWindow = isTimeInWindow(
                        now,
                        policy.check_in_open_time,
                        policy.check_in_close_time
                    );
                    if (!inArrivalWindow) {
                        toast.error(`Arrival window is closed (${policy.check_in_open_time?.slice(0,5)} - ${policy.check_in_close_time?.slice(0,5)}).`);
                        return;
                    }

                    // 2. Auto-Out Check
                    if (policy.auto_clock_out_time && isAfterTime(now, policy.auto_clock_out_time)) {
                        toast.error(`Automatic checkout period has started (${policy.auto_clock_out_time.slice(0,5)}).`);
                        return;
                    }
                }

                // Keep the existing attendance state visible until the backend
                // validates the location and confirms the clock-in.
                setClockInPhase('checking_server');
                const result = await updateLocation(latitude, longitude, accuracy, validOfficeId || undefined, true);
                
                if (result.success && result.record) {
                    // Sync with backend confirmed record
                    setConfirmedPresenceState(result.record.presence_state ?? null);
                    setAttendanceState(result.record.attendance_state);
                    attendanceStateRef.current = result.record.attendance_state;
                    presenceStateRef.current = result.record.presence_state ?? null;
                    
                    const actualClockIn = result.record.clock_in_at || result.record.clock_in || null;
                    setClockInTime(actualClockIn);
                    setClockOutTime(result.record.clock_out_at || result.record.clock_out || null);
                    
                    mutate(workspaceCacheKey('my-attendance-today', workspaceScope));
                    mutate(workspaceCacheKey('team-attendance-today', workspaceScope));
                    
                    if (result.record.attendance_state === 'CLOCKED_IN') {
                        toast.success('Clocked in!');
                    } else {
                        toast.info('Location updated, but clock-in was not confirmed by the server.');
                    }
                } else {
                    toast.error(result.error || 'Failed to clock in');
                }
            } catch (error) {
                toast.dismiss('gps-lock');
                toast.error('GPS error or timeout.');
            }
        } catch {
            toast.error('An unexpected error occurred while clocking in.');
        } finally {
            setIsLoading(false);
            setClockInPhase('idle');
        }
    }, [mutate, workspaceScope]);

    const manualClockOut = useCallback(async (force = false) => {
        setIsLoading(true);
        suppressSyncToastRef.current = true;
        try {
            const now = new Date();
            // ── 2. Optimistic Update ──
            const previousAttendance = attendanceStateRef.current;
            const previousPresence = presenceStateRef.current;
            const previousClockOut = clockOutTime;
            const previousTracking = isTracking;

            setAttendanceState('CLOCKED_OUT');
            attendanceStateRef.current = 'CLOCKED_OUT';
            setClockOutTime(new Date().toISOString());
            setLastUpdate(new Date());
            
            // Stop tracking immediately for snappy feel
            setIsTracking(false);
            localStorage.setItem(trackingStorageKey, 'false');
            stopTracking();

            toast.loading("Clocking out...", { id: 'clock-out' });
            
            const result = await clockOutManual(force);
            
            toast.dismiss('clock-out');
            if (result.success && result.record) {
                setConfirmedPresenceState(result.record.presence_state ?? null);
                setAttendanceState(result.record.attendance_state);
                attendanceStateRef.current = result.record.attendance_state;
                presenceStateRef.current = result.record.presence_state ?? null;
                
                setClockInTime(result.record.clock_in_at || result.record.clock_in || null);
                setClockOutTime(result.record.clock_out_at || result.record.clock_out || null);
                
                mutate(workspaceCacheKey('my-attendance-today', workspaceScope));
                mutate(workspaceCacheKey('team-attendance-today', workspaceScope));
                toast.success('Clocked out successfully!');
                setIsLoading(false);
                return { success: true };
            } else if (result.conflict) {
                // Rollback
                setAttendanceState(previousAttendance);
                attendanceStateRef.current = previousAttendance;
                setClockOutTime(previousClockOut);
                setIsTracking(previousTracking);
                localStorage.setItem(trackingStorageKey, String(previousTracking));
                if (previousTracking) startTracking();
                
                setIsLoading(false);
                return { confirmRequired: true, message: result.error };
            } else {
                // ── Rollback on Failure ──
                setAttendanceState(previousAttendance);
                setConfirmedPresenceState(previousPresence);
                attendanceStateRef.current = previousAttendance;
                presenceStateRef.current = previousPresence;
                setClockOutTime(previousClockOut);
                
                setIsTracking(previousTracking);
                localStorage.setItem(trackingStorageKey, String(previousTracking));
                if (previousTracking) startTracking();

                toast.error(result.error || 'Failed to clock out');
                setIsLoading(false);
                return { success: false };
            }
        } catch {
            toast.dismiss('clock-out');
            toast.error('An unexpected error occurred while clocking out.');
            setIsLoading(false);
            return { success: false };
        }
    }, [mutate, clockOutTime, isTracking, startTracking, stopTracking, trackingStorageKey, workspaceScope]);

    const refreshLocation = useCallback(async () => {
        setIsLoading(true);
        toast.loading("Acquiring high-precision GPS...", { id: 'gps-sync' });
        try {
            const position = await getAccuratePosition(15000, 35);
            toast.dismiss('gps-sync');
            const { latitude, longitude, accuracy } = position.coords;
            setLocation({ latitude, longitude, accuracy });
            
            // Sync with backend
            const offices = officesRef.current;
            const resolvedId = offices.length > 0 ? offices[0].id : undefined;
            await updateLocation(latitude, longitude, accuracy, resolvedId);
            
            setLastUpdate(new Date());
            mutate(workspaceCacheKey('my-attendance-today', workspaceScope));
            mutate(workspaceCacheKey('team-attendance-today', workspaceScope));
            toast.success('Position Synchronized');
        } catch (err) {
            toast.dismiss('gps-sync');
            toast.error('Sync Timeout — poor signal');
        } finally {
            setIsLoading(false);
        }
    }, [mutate, workspaceScope]);

    const contextValue = React.useMemo(() => ({
        isTracking,
        isSupported,
        permissionState,
        permissionError,
        presenceState,
        attendanceState,
        clockInTime,
        clockOutTime,
        lastUpdate,
        toggleTracking,
        requestPermission,
        manualClockIn,
        manualClockOut,
        isLoading,
        clockInPhase,
        isPolling,
        refreshLocation,
        lastPulse,
        location,
        officeLocation: officeLocationState,
        autoCheckStatus,
    }), [
        isTracking,
        isSupported,
        permissionState,
        permissionError,
        presenceState,
        attendanceState,
        clockInTime,
        clockOutTime,
        lastUpdate,
        toggleTracking,
        requestPermission,
        manualClockIn,
        manualClockOut,
        isLoading,
        clockInPhase,
        isPolling,
        refreshLocation,
        lastPulse,
        location,
        officeLocationState,
        autoCheckStatus,
    ]);

    return (
        <LocationContext.Provider value={contextValue}>
            {children}
        </LocationContext.Provider>
    );
}

export function useLocation() {
    const context = useContext(LocationContext);
    if (!context) {
        throw new Error('useLocation must be used within a LocationProvider');
    }
    return context;
}
