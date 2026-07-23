'use client';

/* eslint-disable react-hooks/immutability */

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef, startTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useSWRConfig } from 'swr';
import { updateLocation, getOfficeLocations, clockOutManual } from '@/app/(dashboard)/[orgSlug]/attendance/actions';
import { getDistanceInMeters } from '@/lib/distance-utils';
import { toast } from '@/lib/toast';
import type { PresenceState, AttendanceState, AttendancePolicy, OfficeLocation, AttendanceRecord } from '@/types/attendance';

const STORAGE_KEY = 'md_location_tracking_enabled';
const CONFIG_CACHE_KEY = 'md_attendance_config_cache';
const SYNC_THROTTLE_MS = 5 * 60 * 1000; // Throttle backend sync to once per 5 minutes unless state changes

import { isTimeInWindow, isAfterTime, isBeforeTime, isWithinRadius } from '@/lib/attendance-utils';

export type LocationPermissionState = 'granted' | 'prompt' | 'denied' | 'unsupported' | 'checking';

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
    isPolling: boolean;
    refreshLocation: () => Promise<void>;
    lastPulse: Date | null;
    location: { latitude: number; longitude: number; accuracy: number | null } | null;
    officeLocation: { latitude: number; longitude: number } | null;
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
    initialRecord 
}: { 
    children: React.ReactNode;
    initialRecord?: AttendanceRecord | null;
}) {
    const router = useRouter();
    const { mutate } = useSWRConfig();
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
                        const stored = localStorage.getItem(STORAGE_KEY);
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
    }, []);

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
    const [location, setLocation] = useState<{ latitude: number; longitude: number; accuracy: number | null } | null>(null);
    const [officeLocationState, setOfficeLocationState] = useState<{ latitude: number; longitude: number } | null>(null);
    
    const [offices, setOffices] = useState<OfficeLocation[]>([]);
    const officesRef = useRef<OfficeLocation[]>([]);
    const policiesRef = useRef<Record<number, AttendancePolicy>>({});
    const [isInitialized, setIsInitialized] = useState(false);
    const [isPolling, setIsPolling] = useState(false);
    const [lastPulse, setLastPulse] = useState<Date | null>(null);

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
            setConfirmedPresenceState(initPres);
        }
    }, [initialRecord]);
    
    const watchIdRef = useRef<number | null>(null);
    const lastSyncTimeRef = useRef<number>(0);
    const presenceStateRef = useRef<PresenceState | null>(null);
    const attendanceStateRef = useRef<AttendanceState | null>(null);
    const suppressSyncToastRef = useRef(false);
    const isTrackingRef = useRef(false);

    // Keep ref in sync for callbacks
    useEffect(() => {
        presenceStateRef.current = presenceState;
    }, [presenceState]);

    const syncConfiguration = useCallback(async (force = false) => {
        try {
            // If not forced, try to load from localStorage first for immediate UI hydration
            const cached = localStorage.getItem(CONFIG_CACHE_KEY);
            if (cached && !force) {
                const { offices, policies } = JSON.parse(cached);
                officesRef.current = offices;
                policiesRef.current = policies;
                if (offices.length > 0) {
                    setOfficeLocationState({ latitude: offices[0].latitude, longitude: offices[0].longitude });
                }
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
            for (const office of offices) {
                const p = await getAttendancePolicy(office.id);
                if (p) newPolicies[office.id] = p;
            }
            policiesRef.current = newPolicies;
            
            // Update Cache
            localStorage.setItem(CONFIG_CACHE_KEY, JSON.stringify({
                offices,
                policies: newPolicies,
                timestamp: Date.now()
            }));

            setIsInitialized(true);
        } catch (err) {
            console.error('Failed to sync location config:', err);
            setIsInitialized(true); 
        }
    }, []);

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
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored === 'true') {
                setIsTracking(true);
            }
        });

        initData();
    }, [syncConfiguration, checkPermission]);


    const handlePositionUpdate = useCallback(async (position: GeolocationPosition) => {
        const { latitude, longitude, accuracy } = position.coords;
        
        // 1. Instant UI Update
        setLocation({ latitude, longitude, accuracy });
        setLastPulse(new Date());

        const offices = officesRef.current;
        if (!offices || offices.length === 0) return;

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
        
        if (!activeOffice) return;

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
        const shouldSync = stateChanged || timeSinceLastSync >= SYNC_THROTTLE_MS;

        if (shouldSync && accuracy <= 50 && isInitialized) {
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
                    
                    mutate('my-attendance-today');
                    if (prevAtt !== newAtt || (stateChanged && backendPres !== prevPres)) {
                        mutate('team-attendance-today');
                        if (prevAtt && prevAtt !== newAtt && !suppressSyncToastRef.current) {
                            if (newAtt === 'CLOCKED_IN') toast.success('Confirmed in office!');
                            else if (newAtt === 'CLOCKED_OUT') toast.info('Attendance finalized.');
                        }
                    }
                    suppressSyncToastRef.current = false;
                }
            } catch (err) {
                console.error('Backend sync failed:', err);
            } finally {
                setIsPolling(false);
            }
        }
    }, [mutate]);

    const startTrackingRef = useRef<() => void>(() => {});

    const startTracking = useCallback(() => {
        if (!navigator.geolocation) return;
        
        if (watchIdRef.current !== null) {
            navigator.geolocation.clearWatch(watchIdRef.current);
        }

        watchIdRef.current = navigator.geolocation.watchPosition(
            handlePositionUpdate,
            (error) => {
                console.error('Geolocation watch error:', error.message);
                if (error.code === error.PERMISSION_DENIED) {
                    toast.error('Location permission denied. Tracking disabled.');
                    setIsTracking(false);
                    localStorage.setItem(STORAGE_KEY, 'false');
                } else {
                    // Restart watch on transient errors (POSITION_UNAVAILABLE, TIMEOUT)
                    navigator.geolocation.clearWatch(watchIdRef.current!);
                    watchIdRef.current = null;
                    setTimeout(() => {
                        if (isTrackingRef.current) startTrackingRef.current();
                    }, 3000);
                }
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    }, [handlePositionUpdate]);

    useEffect(() => {
        startTrackingRef.current = startTracking;
    }, [startTracking]);

    const stopTracking = useCallback(() => {
        if (watchIdRef.current !== null) {
            navigator.geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
        }
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

    const toggleTracking = useCallback(() => {
        const next = !isTracking;
        setIsTracking(next);
        localStorage.setItem(STORAGE_KEY, String(next));
        if (next) {
            toast.success('Location tracking enabled');
        } else {
            toast.info('Location tracking paused');
        }
    }, [isTracking]);

    const manualClockIn = useCallback(async () => {
        setIsLoading(true);
        suppressSyncToastRef.current = true;
        try {
            if (!navigator.geolocation) {
                toast.error('Geolocation not supported');
                setIsLoading(false);
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
                    setIsLoading(false);
                    return;
                }

                const offices = officesRef.current;
                if (!offices || offices.length === 0) {
                    toast.error('No office locations configured.');
                    setIsLoading(false);
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
                    setIsLoading(false);
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
                        setIsLoading(false);
                        return;
                    }

                    // 2. Auto-Out Check
                    if (policy.auto_clock_out_time && isAfterTime(now, policy.auto_clock_out_time)) {
                        toast.error(`Automatic checkout period has started (${policy.auto_clock_out_time.slice(0,5)}).`);
                        setIsLoading(false);
                        return;
                    }
                }

                // ── 3. Optimistic Update (Instant Feedback) ──
                const previousAttendance = attendanceStateRef.current;
                const previousPresence = presenceStateRef.current;
                const previousClockIn = clockInTime;

                setAttendanceState('CLOCKED_IN');
                setConfirmedPresenceState('IN_OFFICE');
                attendanceStateRef.current = 'CLOCKED_IN';
                presenceStateRef.current = 'IN_OFFICE';
                setClockInTime(new Date().toISOString());
                setLastUpdate(new Date());

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
                    
                    mutate('my-attendance-today');
                    mutate('team-attendance-today');
                    
                    if (result.record.attendance_state === 'CLOCKED_IN') {
                        toast.success('Clocked in!');
                    } else {
                        toast.info('Location updated, but clock-in was not confirmed by the server.');
                    }
                } else {
                    // ── Rollback on Failure ──
                    setAttendanceState(previousAttendance);
                    setConfirmedPresenceState(previousPresence);
                    attendanceStateRef.current = previousAttendance;
                    presenceStateRef.current = previousPresence;
                    setClockInTime(previousClockIn);
                    toast.error(result.error || 'Failed to clock in');
                }
                setIsLoading(false);
            } catch (error) {
                toast.dismiss('gps-lock');
                toast.error('GPS error or timeout.');
                setIsLoading(false);
            }
        } catch {
            setIsLoading(false);
        }
    }, [mutate, clockInTime]);

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
            localStorage.setItem(STORAGE_KEY, 'false');
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
                
                mutate('my-attendance-today');
                mutate('team-attendance-today');
                toast.success('Clocked out successfully!');
                setIsLoading(false);
                return { success: true };
            } else if (result.conflict) {
                // Rollback
                setAttendanceState(previousAttendance);
                attendanceStateRef.current = previousAttendance;
                setClockOutTime(previousClockOut);
                setIsTracking(previousTracking);
                localStorage.setItem(STORAGE_KEY, String(previousTracking));
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
                localStorage.setItem(STORAGE_KEY, String(previousTracking));
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
    }, [mutate, clockOutTime, isTracking, startTracking, stopTracking]);

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
            mutate('my-attendance-today');
            mutate('team-attendance-today');
            toast.success('Position Synchronized');
        } catch (err) {
            toast.dismiss('gps-sync');
            toast.error('Sync Timeout — poor signal');
        } finally {
            setIsLoading(false);
        }
    }, [mutate]);

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
        isPolling,
        refreshLocation,
        lastPulse,
        location,
        officeLocation: officeLocationState,
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
        isPolling,
        refreshLocation,
        lastPulse,
        location,
        officeLocationState
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
