'use client';

import React, { useEffect, useCallback, useMemo } from 'react';
import { MapContainer, TileLayer, Circle, Polygon, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { FiPlus, FiMinus, FiNavigation, FiTarget, FiActivity, FiMapPin } from 'react-icons/fi';
import { useTheme } from '@/providers/theme-provider';
import { useLocation } from '@/providers/location-provider';
import { formatDistance, getDistanceInMeters } from '@/lib/distance-utils';
import { presenceStateLabels, presenceStateColors } from '@/types/attendance';
import { pinIcon, ringPositions, getCartoTileUrl, MAP_STYLES, type MapIdentity } from './map-markers';

// Besspoke Physical Compass Component
const CompassDial = () => (
    <div className="relative w-8 h-8 rounded-full flex items-center justify-center transition-all group-hover:scale-110 duration-500">
        {/* Cardinal Lines */}
        <div className="absolute top-0 w-0.5 h-2 bg-danger rounded-full" style={{ filter: 'drop-shadow(0 0 4px rgba(244,63,94,0.8))' }} /> {/* North */}
        <div className="absolute bottom-0 w-0.5 h-1.5 bg-foreground/[0.2] rounded-full" /> {/* South */}
        <div className="absolute left-0 h-0.5 w-1.5 bg-foreground/[0.2] rounded-full" /> {/* West */}
        <div className="absolute right-0 h-0.5 w-1.5 bg-foreground/[0.2] rounded-full" /> {/* East */}
        
        {/* Needle Axis Overlay */}
        <div className="w-1 h-1 rounded-full bg-foreground/[0.4] z-10" />
        
        {/* Inner Ring */}
        <div className="absolute inset-1.5 rounded-full border border-card-border" />
    </div>
);

export type { MapIdentity };

// Premium Map Action Controls
function MapActionControls({ userLocation, officeLocation }: { userLocation: [number, number], officeLocation: [number, number] }) {
    const map = useMap();
    // Keep control clicks from reaching the map's own click handler.
    const controlsRef = React.useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (controlsRef.current) {
            L.DomEvent.disableClickPropagation(controlsRef.current);
            L.DomEvent.disableScrollPropagation(controlsRef.current);
        }
    }, []);

    const handleRecenter = useCallback(() => {
        const bounds = L.latLngBounds([userLocation, officeLocation]);
        // Leave room for the readouts (top), the controls (right) and the card (bottom).
        map.fitBounds(bounds, { paddingTopLeft: [32, 72], paddingBottomRight: [80, 128], maxZoom: 19 });
    }, [map, userLocation, officeLocation]);

    const handleResetNorth = useCallback(() => {
        map.setView(userLocation, 17, { animate: true });
    }, [map, userLocation]);

    const buttonClass = "w-10 h-10 flex items-center justify-center rounded-full bg-background border border-card-border text-(--text-muted) hover:text-foreground transition-colors duration-150 active:scale-95 group";

    return (
        <div ref={controlsRef} className="absolute right-3 top-3 z-[400] flex flex-col items-center gap-2 sm:right-4 sm:top-4">
            {/* Compass Instrument */}
            <div>
                <button 
                    onClick={(e) => { e.preventDefault(); handleResetNorth(); }}
                    title="Centre on me"
                    className={buttonClass}
                >
                    <CompassDial />
                </button>
            </div>

            {/* Navigation Instrument */}
            <div>
                <button 
                    onClick={(e) => { e.preventDefault(); handleRecenter(); }}
                    title="Fit office and me"
                    className={buttonClass}
                >
                    <FiNavigation size={17} className="rotate-45" />
                </button>
            </div>

            {/* Zoom Group */}
            <div className="flex flex-col overflow-hidden rounded-full border border-card-border bg-background">
                <button 
                    onClick={(e) => { e.preventDefault(); map.zoomIn(); }}
                    title="Zoom in"
                    className={`${buttonClass} !border-0 !bg-transparent`}
                >
                    <FiPlus size={17} />
                </button>
                <button 
                    onClick={(e) => { e.preventDefault(); map.zoomOut(); }}
                    title="Zoom out"
                    className={`${buttonClass} !border-0 !bg-transparent`}
                >
                    <FiMinus size={17} />
                </button>
            </div>
        </div>
    );
}


interface MapInternalsProps {
  center: [number, number];
  officeLocation: [number, number];
  inOfficeRadius: number;
  tempOutRadius: number;
  user: MapIdentity;
  organization: MapIdentity;
  officeName: string;
  cartoApiLink?: string;
  /** Fired for clicks on the map itself, not on its controls. */
  onMapClick?: () => void;
}


/** Keeps Leaflet's size in step with its container as the page collapses it. */
function ResizeSync() {
    const map = useMap();
    useEffect(() => {
        const el = map.getContainer();
        let frame = 0;
        const observer = new ResizeObserver(() => {
            cancelAnimationFrame(frame);
            frame = requestAnimationFrame(() => map.invalidateSize({ animate: false }));
        });
        observer.observe(el);
        return () => { cancelAnimationFrame(frame); observer.disconnect(); };
    }, [map]);
    return null;
}

function MapClicks({ onClick }: { onClick?: () => void }) {
    useMapEvents({ click: () => onClick?.() });
    return null;
}

// Component to handle map centering when coordinates change
function RecenterMap({ center }: { center: [number, number] }) {
    const map = useMap();
    useEffect(() => {
        // Only auto-recenter if zoom is low (initial load)
        if (map.getZoom() < 10) {
            map.setView(center, 17);
        }
    }, [center, map]);
    return null;
}

export function AttendanceMapInternals({
    center,
    officeLocation,
    inOfficeRadius,
    tempOutRadius,
    user,
    organization,
    officeName,
    cartoApiLink,
    onMapClick,
}: MapInternalsProps) {
    const { resolvedTheme } = useTheme();
    const { location, presenceState, isTracking } = useLocation();

    const tileUrl = getCartoTileUrl(cartoApiLink, resolvedTheme === 'dark');
    const userIcon = useMemo(() => pinIcon(user, 'accent'), [user]);
    const officeIcon = useMemo(() => pinIcon(organization, 'success', officeName), [organization, officeName]);
    const graceBand = useMemo(() => ringPositions(officeLocation, inOfficeRadius, tempOutRadius), [officeLocation, inOfficeRadius, tempOutRadius]);

    const currentDistance = location ? getDistanceInMeters(
        location.latitude, 
        location.longitude, 
        officeLocation[0], 
        officeLocation[1]
    ) : null;

    return (
        <div className="w-full h-full relative z-0" style={{ isolation: 'isolate' }}>
            {/* Live readouts, top-left */}
            <div className="pointer-events-none absolute left-3 top-3 z-[1000] flex max-w-[calc(100%-5rem)] flex-wrap gap-1.5 sm:left-4 sm:top-4">
                <span className="pointer-events-auto inline-flex h-8 items-center gap-2 rounded-full border border-card-border bg-background px-3 text-xs font-medium text-foreground">
                    <span className={`h-2 w-2 rounded-full ${presenceState ? presenceStateColors[presenceState].dot : 'bg-text-muted'}`} />
                    {presenceState ? presenceStateLabels[presenceState] : 'Updating…'}
                </span>
                <span className={`pointer-events-auto inline-flex h-8 items-center gap-2 rounded-full border border-card-border bg-background px-3 text-xs font-medium ${isTracking ? 'text-success-text' : 'text-text-muted'}`}>
                    <FiTarget className="h-3.5 w-3.5" /> GPS {isTracking ? 'on' : 'off'}
                </span>
                <span className="pointer-events-auto hidden h-8 items-center gap-2 rounded-full border border-card-border bg-background px-3 font-numbers text-xs text-foreground sm:inline-flex">
                    <FiNavigation className="h-3.5 w-3.5 text-text-muted" /> {currentDistance !== null ? formatDistance(currentDistance) : '—'}
                </span>
                <span className="pointer-events-auto hidden h-8 items-center gap-2 rounded-full border border-card-border bg-background px-3 font-numbers text-xs text-foreground sm:inline-flex">
                    <FiActivity className="h-3.5 w-3.5 text-text-muted" /> ±{location?.accuracy ? `${Math.round(location.accuracy)}m` : '—'}
                </span>
            </div>
            <style dangerouslySetInnerHTML={{__html: `
                ${MAP_STYLES}
                @keyframes mapPulse {
                    0% { transform: scale(0.9); opacity: 0.45; }
                    100% { transform: scale(2); opacity: 0; }
                }
                .pulse-ring {
                    animation: mapPulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
                }
            `}} />
            
            <MapContainer 
                center={center} 
                zoom={17}
                maxZoom={22}
                zoomControl={false}
                scrollWheelZoom={false} 
                style={{ height: '100%', width: '100%', backgroundColor: 'transparent' }}
                attributionControl={false}
            >
                <RecenterMap center={center} />
                <MapClicks onClick={onMapClick} />
                <ResizeSync />
                <MapActionControls userLocation={center} officeLocation={officeLocation} />
                <TileLayer url={tileUrl} maxZoom={22} maxNativeZoom={20} />
                
                {/* Geofence, borderless: the yellow grace band wraps the green office
                    zone without overlapping it. */}
                {tempOutRadius > inOfficeRadius && (
                    <Polygon positions={graceBand} pathOptions={{ className: 'md-geofence md-geofence--grace', stroke: false, fillOpacity: 0.14 }} interactive={false} />
                )}
                <Circle
                    center={officeLocation}
                    radius={inOfficeRadius}
                    pathOptions={{ className: 'md-geofence md-geofence--office', stroke: false, fillOpacity: 0.2 }}
                    interactive={false}
                />

                <Marker position={officeLocation} icon={officeIcon}>
                    <Popup>
                        <span className="text-xs font-semibold text-foreground">{officeName}</span>
                        <span className="block text-[11px] text-text-muted">{inOfficeRadius} m office zone · {tempOutRadius} m grace</span>
                    </Popup>
                </Marker>

                <Marker position={center} icon={userIcon} zIndexOffset={500}>
                    <Popup>
                        <span className="text-xs font-semibold text-foreground">{user.name}</span>
                        <span className="block text-[11px] text-text-muted">{currentDistance !== null ? `${formatDistance(currentDistance)} from the office` : 'Locating…'}</span>
                    </Popup>
                </Marker>
            </MapContainer>
        </div>
    );
}
