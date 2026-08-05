'use client';

import { useState } from 'react';
import {
    FiAlertCircle,
    FiCheckCircle,
    FiLoader,
    FiMapPin,
    FiNavigation,
} from 'react-icons/fi';
import { toast } from '@/lib/toast';

interface OfficeLocationFieldsProps {
    name: string;
    latitude: string;
    longitude: string;
    onChange: (location: { name: string; latitude: string; longitude: string }) => void;
}

function getLocationErrorMessage(error: GeolocationPositionError) {
    if (error.code === error.PERMISSION_DENIED) {
        return 'Location access was denied. Allow it in your browser settings or enter coordinates manually.';
    }
    if (error.code === error.POSITION_UNAVAILABLE) {
        return 'Your current location is unavailable. Try again or enter coordinates manually.';
    }
    if (error.code === error.TIMEOUT) {
        return 'Finding your location took too long. Try again or enter coordinates manually.';
    }
    return 'We could not find your current location.';
}

export function OfficeLocationFields({
    name,
    latitude,
    longitude,
    onChange,
}: OfficeLocationFieldsProps) {
    const [isLocating, setIsLocating] = useState(false);
    const [error, setError] = useState('');

    const handleUseCurrentLocation = () => {
        if (!navigator.geolocation) {
            const message = 'Geolocation is not supported by this browser. Enter coordinates manually.';
            setError(message);
            toast.error(message);
            return;
        }

        setIsLocating(true);
        setError('');

        navigator.geolocation.getCurrentPosition(
            (position) => {
                onChange({
                    name,
                    latitude: position.coords.latitude.toFixed(6),
                    longitude: position.coords.longitude.toFixed(6),
                });
                setIsLocating(false);
                toast.success('Current coordinates added');
            },
            (locationError) => {
                const message = getLocationErrorMessage(locationError);
                setError(message);
                setIsLocating(false);
                toast.error(message);
            },
            {
                enableHighAccuracy: true,
                timeout: 15000,
                maximumAge: 0,
            },
        );
    };

    const inputClass = 'w-full px-3 py-2.5 rounded-md bg-input-bg border border-card-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-colors placeholder:text-text-muted/60';
    const labelClass = 'block text-sm font-medium text-foreground mb-1.5';

    return (
        <div className="space-y-4">
            <div>
                <label htmlFor="office-location-name" className={labelClass}>Office name</label>
                <div className="relative">
                    <FiMapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                    <input
                        id="office-location-name"
                        value={name}
                        onChange={(event) => onChange({ name: event.target.value, latitude, longitude })}
                        className={`${inputClass} pl-9`}
                        placeholder="Headquarters"
                        required
                    />
                </div>
                <p className="mt-1.5 text-xs text-text-muted">
                    Give this office a name your team will recognize.
                </p>
            </div>

            <div className="rounded-xl border border-card-border bg-foreground/[0.02] p-4">
                <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h4 className="text-sm font-medium text-foreground">Office coordinates</h4>
                        <p className="mt-0.5 text-xs text-text-muted">
                            Enter coordinates or get them from this device.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={handleUseCurrentLocation}
                        aria-busy={isLocating}
                        disabled={isLocating}
                        className="flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-sm font-medium text-emerald-500 transition-colors hover:bg-emerald-500/20 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:cursor-wait disabled:opacity-60"
                    >
                        {isLocating ? <FiLoader className="h-4 w-4 animate-spin" /> : <FiNavigation className="h-4 w-4" />}
                        {isLocating ? 'Finding location…' : 'Use my current location'}
                    </button>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                        <label htmlFor="office-location-latitude" className={labelClass}>Latitude</label>
                        <input
                            id="office-location-latitude"
                            type="number"
                            step="any"
                            min="-90"
                            max="90"
                            value={latitude}
                            onChange={(event) => onChange({ name, latitude: event.target.value, longitude })}
                            className={inputClass}
                            placeholder="5.603700"
                            required
                        />
                    </div>
                    <div>
                        <label htmlFor="office-location-longitude" className={labelClass}>Longitude</label>
                        <input
                            id="office-location-longitude"
                            type="number"
                            step="any"
                            min="-180"
                            max="180"
                            value={longitude}
                            onChange={(event) => onChange({ name, latitude, longitude: event.target.value })}
                            className={inputClass}
                            placeholder="-0.187000"
                            required
                        />
                    </div>
                </div>

                {error && (
                    <p role="alert" className="mt-3 flex items-start gap-2 text-xs text-rose-500">
                        <FiAlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        <span>{error}</span>
                    </p>
                )}
                {!error && latitude && longitude && (
                    <p className="mt-3 flex items-center gap-2 text-xs text-text-muted">
                        <FiCheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                        Coordinates ready
                    </p>
                )}
            </div>
        </div>
    );
}
