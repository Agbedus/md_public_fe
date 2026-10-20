'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, Circle, Polygon, Marker, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import type { LatLngTuple, Marker as LeafletMarker } from 'leaflet';
import { FiCrosshair, FiMinus, FiPlus } from 'react-icons/fi';
import { useTheme } from '@/providers/theme-provider';
import { pinIcon, ringPositions, getCartoTileUrl, MAP_STYLES, type MapIdentity } from './map-markers';

interface OfficeLocationPickerProps {
    /** Where the pin starts; null when the office has no coordinates yet. */
    value: LatLngTuple | null;
    onChange: (position: LatLngTuple) => void;
    officeName: string;
    organization?: MapIdentity;
    /** Same basemap as the attendance map. */
    cartoApiLink?: string;
    inOfficeRadius?: number;
    graceRadius?: number;
}

const FALLBACK: LatLngTuple = [5.55602, -0.1969]; // Accra

/** Clicking anywhere on the map moves the pin there. */
function ClickToPlace({ onPlace }: { onPlace: (position: LatLngTuple) => void }) {
    useMapEvents({ click: (e) => onPlace([e.latlng.lat, e.latlng.lng]) });
    return null;
}

/** Keeps the pin in view when it is moved from outside the map. */
function FollowPin({ position, token }: { position: LatLngTuple; token: number }) {
    const map = useMap();
    useEffect(() => {
        if (token > 0) map.flyTo(position, Math.max(map.getZoom(), 18), { duration: 0.6 });
        // Only re-run for explicit jumps (token), not every drag or click.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token, map]);
    return null;
}

function ZoomControls() {
    const map = useMap();
    const btn = 'grid h-10 w-10 place-items-center text-text-muted transition-colors hover:text-foreground';
    return (
        <div className="absolute right-3 top-3 z-[400] flex flex-col overflow-hidden rounded-full border border-card-border bg-background">
            <button type="button" aria-label="Zoom in" className={btn} onClick={(e) => { e.stopPropagation(); map.zoomIn(); }}><FiPlus size={16} /></button>
            <button type="button" aria-label="Zoom out" className={btn} onClick={(e) => { e.stopPropagation(); map.zoomOut(); }}><FiMinus size={16} /></button>
        </div>
    );
}

export default function OfficeLocationPicker({ value, onChange, officeName, organization, cartoApiLink, inOfficeRadius = 0, graceRadius = 0 }: OfficeLocationPickerProps) {
    const { resolvedTheme } = useTheme();
    const position = value ?? FALLBACK;
    const [jump, setJump] = useState(0);
    const [isLocating, setIsLocating] = useState(false);
    const markerRef = useRef<LeafletMarker>(null);

    const icon = useMemo(() => pinIcon(organization ?? { name: officeName || 'Office' }, 'success'), [organization, officeName]);
    const band = useMemo(() => ringPositions(position, inOfficeRadius, graceRadius), [position, inOfficeRadius, graceRadius]);
    const tileUrl = getCartoTileUrl(cartoApiLink, resolvedTheme === 'dark');

    const useDeviceLocation = () => {
        if (!navigator.geolocation) return;
        setIsLocating(true);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                onChange([pos.coords.latitude, pos.coords.longitude]);
                setJump((n) => n + 1);
                setIsLocating(false);
            },
            () => setIsLocating(false),
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
        );
    };

    return (
        <div className="relative h-full w-full" style={{ isolation: 'isolate' }}>
            <style dangerouslySetInnerHTML={{ __html: MAP_STYLES }} />
            <MapContainer
                center={position}
                zoom={value ? 18 : 15}
                maxZoom={22}
                zoomControl={false}
                attributionControl={false}
                style={{ height: '100%', width: '100%', backgroundColor: 'transparent', cursor: 'crosshair' }}
            >
                <TileLayer key={tileUrl} url={tileUrl} maxZoom={22} maxNativeZoom={20} />
                <ClickToPlace onPlace={onChange} />
                <FollowPin position={position} token={jump} />
                <ZoomControls />

                {value && graceRadius > inOfficeRadius && (
                    <Polygon positions={band} pathOptions={{ className: 'md-geofence md-geofence--grace', stroke: false, fillOpacity: 0.14 }} interactive={false} />
                )}
                {value && inOfficeRadius > 0 && (
                    <Circle center={position} radius={inOfficeRadius} pathOptions={{ className: 'md-geofence md-geofence--office', stroke: false, fillOpacity: 0.2 }} interactive={false} />
                )}

                {value && (
                <Marker
                    ref={markerRef}
                    position={position}
                    icon={icon}
                    draggable
                    eventHandlers={{
                        dragend: () => {
                            const ll = markerRef.current?.getLatLng();
                            if (ll) onChange([ll.lat, ll.lng]);
                        },
                    }}
                />
                )}
            </MapContainer>

            <div className="pointer-events-none absolute inset-x-3 top-3 z-[400] flex justify-start">
                <span className="rounded-full border border-card-border bg-background px-3 py-1.5 text-xs text-text-secondary">
                    Click the map or drag the pin
                </span>
            </div>

            <button
                type="button"
                onClick={useDeviceLocation}
                disabled={isLocating}
                className="absolute bottom-3 right-3 z-[400] inline-flex min-h-10 items-center gap-2 rounded-full border border-card-border bg-background px-4 text-sm text-foreground transition-colors hover:bg-foreground/[0.04] disabled:cursor-wait"
            >
                <FiCrosshair className={`h-4 w-4 ${isLocating ? 'animate-spin' : ''}`} />
                {isLocating ? 'Locating…' : 'My location'}
            </button>
        </div>
    );
}
