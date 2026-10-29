/** Acquire a fresh browser location, allowing network-assisted positioning
 * while high-accuracy positioning warms up. Never invent or average a fix. */
export function getAccuratePosition(
    timeoutMs = 15000,
    desiredAccuracy = 35,
    geolocation: Geolocation = navigator.geolocation,
): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
        let watchId: number | null = null;
        let best: GeolocationPosition | null = null;
        let settled = false;
        let lastError: GeolocationPositionError | undefined;
        const cleanup = () => {
            if (watchId !== null) geolocation.clearWatch(watchId);
            clearTimeout(deadline);
            clearTimeout(fallback);
        };
        const finish = (error?: unknown) => {
            if (settled) return;
            settled = true;
            cleanup();
            if (error) reject(error);
            else if (best) resolve(best);
            else reject(lastError ?? new Error('No fresh location was available. Check location access and try again.'));
        };
        const receive = (position: GeolocationPosition) => {
            if (settled) return;
            const { latitude, longitude, accuracy } = position.coords;
            if (!Number.isFinite(latitude) || Math.abs(latitude) > 90
                || !Number.isFinite(longitude) || Math.abs(longitude) > 180
                || !Number.isFinite(accuracy) || accuracy <= 0
                || !Number.isFinite(position.timestamp)
                || Math.abs(Date.now() - position.timestamp) > 30000) return;
            if (!best || accuracy < best.coords.accuracy) best = position;
            if (accuracy <= desiredAccuracy) finish();
        };
        const failed = (error: GeolocationPositionError) => {
            if (settled) return;
            lastError = error;
            // A transient provider error must not abort the other acquisition path.
            if (error.code === 1) finish(error);
        };
        const deadline = setTimeout(() => finish(), timeoutMs);
        const fallback = setTimeout(() => {
            if (!settled) geolocation.getCurrentPosition(receive, failed, {
                enableHighAccuracy: false, maximumAge: 0, timeout: Math.max(1000, timeoutMs - 3000),
            });
        }, Math.min(3000, timeoutMs / 2));
        try {
            watchId = geolocation.watchPosition(receive, failed, {
                enableHighAccuracy: true, maximumAge: 0, timeout: timeoutMs,
            });
            if (settled) cleanup();
        } catch (error) { finish(error); }
    });
}

export function locationErrorMessage(error: unknown): string {
    const code = typeof error === 'object' && error !== null && 'code' in error ? error.code : null;
    if (code === 1) return 'Allow location access for this site and your browser in your computer’s location settings.';
    if (code === 2) return 'Your computer could not determine its location. Enable Wi-Fi and Location Services, then try again.';
    return 'Could not obtain a fresh location. Check Location Services and Wi-Fi, then try again.';
}
