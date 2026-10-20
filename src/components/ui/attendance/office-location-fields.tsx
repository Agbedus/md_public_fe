'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { AnimatePresence, motion } from 'framer-motion';
import type { LatLngTuple } from 'leaflet';
import {
    FiAlertCircle,
    FiCheck,
    FiCheckCircle,
    FiMap,
    FiMapPin,
    FiNavigation,
    FiX,
} from 'react-icons/fi';
import { toast } from '@/lib/toast';
import { Portal } from '@/components/ui/portal';
import type { MapIdentity } from './map-markers';

import { Spinner } from '@/components/ui/busy-icon';
const OfficeLocationPicker = dynamic(() => import('./office-location-picker'), {
    ssr: false,
    loading: () => <div className="h-full w-full animate-pulse bg-foreground/[0.04]" />,
});

interface OfficeLocationFieldsProps {
    name: string;
    latitude: string;
    longitude: string;
    onChange: (location: { name: string; latitude: string; longitude: string }) => void;
    /** Shown on the picker map so the zone can be placed by eye. */
    inOfficeRadius?: number;
    graceRadius?: number;
    /** The organization's face for the office pin. */
    organization?: MapIdentity;
    cartoApiLink?: string;
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
    inOfficeRadius,
    graceRadius,
    organization,
    cartoApiLink,
}: OfficeLocationFieldsProps) {
    const [isLocating, setIsLocating] = useState(false);
    const [error, setError] = useState('');
    const [isPickerOpen, setIsPickerOpen] = useState(false);
    const [draft, setDraft] = useState<LatLngTuple | null>(null);

    const current: LatLngTuple | null =
        latitude && longitude && !isNaN(Number(latitude)) && !isNaN(Number(longitude))
            ? [Number(latitude), Number(longitude)]
            : null;

    const openPicker = () => {
        setDraft(current);
        setIsPickerOpen(true);
    };
    const confirmPicker = () => {
        if (draft) onChange({ name, latitude: draft[0].toFixed(6), longitude: draft[1].toFixed(6) });
        setIsPickerOpen(false);
    };

    useEffect(() => {
        if (!isPickerOpen) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); setIsPickerOpen(false); } };
        window.addEventListener('keydown', onKey, true);
        return () => window.removeEventListener('keydown', onKey, true);
    }, [isPickerOpen]);

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

    const inputClass = 'h-11 w-full rounded-full border border-card-border bg-input-bg px-4 text-sm text-foreground transition-colors placeholder:text-text-muted/50';
    const labelClass = 'mb-1.5 ml-3 block text-xs font-medium text-text-muted';

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

            <div className="rounded-[24px] bg-foreground/[0.03] p-4">
                <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h4 className="text-sm font-medium text-foreground">Office coordinates</h4>
                        <p className="mt-0.5 text-xs text-text-muted">
                            Pick the spot on a map, use this device, or type them in.
                        </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={handleUseCurrentLocation}
                            aria-busy={isLocating}
                            disabled={isLocating}
                            className="md-btn md-btn-secondary md-btn-sm"
                        >
                            {isLocating ? <Spinner className="h-4 w-4" /> : <FiNavigation className="h-4 w-4" />}
                            {isLocating ? 'Finding…' : 'Use my location'}
                        </button>
                        <button type="button" onClick={openPicker} className="md-btn md-btn-primary md-btn-sm">
                            <FiMap className="h-4 w-4" />
                            Pick on map
                        </button>
                    </div>
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
                    <p role="alert" className="mt-3 flex items-start gap-2 text-xs text-danger-text">
                        <FiAlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        <span>{error}</span>
                    </p>
                )}
                {!error && latitude && longitude && (
                    <p className="mt-3 flex items-center gap-2 text-xs text-text-muted">
                        <FiCheckCircle className="h-3.5 w-3.5 text-success-text" />
                        Coordinates ready
                    </p>
                )}
            </div>

            <Portal>
                <AnimatePresence>
                    {isPickerOpen && (
                        <div className="fixed inset-0 z-[1300] flex items-center justify-center p-3 sm:p-6">
                            <motion.div
                                className="absolute inset-0 bg-white/60 backdrop-blur-md dark:bg-black/60"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setIsPickerOpen(false)}
                            />
                            <motion.div
                                role="dialog"
                                aria-modal="true"
                                aria-label="Pick the office location"
                                initial={{ opacity: 0, scale: 0.97, y: 8 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.98, y: 4 }}
                                transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
                                className="relative flex h-[min(44rem,calc(100dvh-1.5rem))] w-full max-w-4xl flex-col overflow-hidden rounded-[28px] border border-card-border bg-background"
                            >
                                <div className="flex items-center justify-between gap-3 px-5 py-4">
                                    <div className="flex items-center gap-3">
                                        <span className="grid h-10 w-10 place-items-center rounded-full bg-success/15 text-success-text">
                                            <FiMapPin className="h-4 w-4" />
                                        </span>
                                        <div>
                                            <h2 className="text-base font-semibold text-foreground">Office location</h2>
                                            <p className="text-xs text-text-muted">{name || 'This office'}</p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setIsPickerOpen(false)}
                                        aria-label="Close map"
                                        className="grid h-10 w-10 place-items-center rounded-full text-text-muted transition-colors hover:bg-foreground/[0.06] hover:text-foreground"
                                    >
                                        <FiX className="h-5 w-5" />
                                    </button>
                                </div>

                                <div className="relative mx-3 min-h-0 flex-1 overflow-hidden rounded-[22px] border border-card-border">
                                    <OfficeLocationPicker
                                        value={draft}
                                        onChange={setDraft}
                                        officeName={name}
                                        organization={organization}
                                        cartoApiLink={cartoApiLink}
                                        inOfficeRadius={inOfficeRadius}
                                        graceRadius={graceRadius}
                                    />
                                </div>

                                <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                                    <p className="font-numbers text-sm text-text-secondary">
                                        {draft ? `${draft[0].toFixed(6)}, ${draft[1].toFixed(6)}` : 'No spot chosen yet'}
                                    </p>
                                    <div className="flex gap-2">
                                        <button type="button" onClick={() => setIsPickerOpen(false)} className="md-btn md-btn-secondary flex-1 sm:flex-none">
                                            Cancel
                                        </button>
                                        <button type="button" onClick={confirmPicker} disabled={!draft} className="md-btn md-btn-primary flex-1 sm:flex-none">
                                            Set location <span className="md-btn-chip"><FiCheck /></span>
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
            </Portal>
        </div>
    );
}
