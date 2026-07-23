'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { MapContainer, TileLayer, Circle, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { renderToStaticMarkup } from 'react-dom/server';
import { FiPlus, FiMinus, FiNavigation, FiTarget, FiActivity, FiMapPin } from 'react-icons/fi';
import { useTheme } from '@/providers/theme-provider';
import { useLocation } from '@/providers/location-provider';
import { formatDistance, getDistanceInMeters } from '@/lib/distance-utils';
import { presenceStateLabels, presenceStateColors } from '@/types/attendance';

// Besspoke Physical Compass Component
const CompassDial = () => (
    <div className="relative w-8 h-8 rounded-full flex items-center justify-center transition-all group-hover:scale-110 duration-500">
        {/* Cardinal Lines */}
        <div className="absolute top-0 w-0.5 h-2 bg-rose-500 rounded-full" style={{ filter: 'drop-shadow(0 0 4px rgba(244,63,94,0.8))' }} /> {/* North */}
        <div className="absolute bottom-0 w-0.5 h-1.5 bg-foreground/[0.2] rounded-full" /> {/* South */}
        <div className="absolute left-0 h-0.5 w-1.5 bg-foreground/[0.2] rounded-full" /> {/* West */}
        <div className="absolute right-0 h-0.5 w-1.5 bg-foreground/[0.2] rounded-full" /> {/* East */}
        
        {/* Needle Axis Overlay */}
        <div className="w-1 h-1 rounded-full bg-foreground/[0.4] z-10" />
        
        {/* Inner Ring */}
        <div className="absolute inset-1.5 rounded-full border border-card-border" />
    </div>
);

// Custom Office Marker Icon (Subtle Dot)
const officeIconHtml = renderToStaticMarkup(
    <div style={{ position: 'relative', width: '12px', height: '12px' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundColor: '#10b981', borderRadius: '50%', border: '2px solid var(--card-bg, #18181b)', boxShadow: '0 0 0 1px rgba(16, 185, 129, 0.2)' }} />
    </div>
);
const officeIcon = new L.DivIcon({
    html: officeIconHtml,
    className: 'custom-leaflet-icon',
    iconSize: [12, 12],
    iconAnchor: [6, 6],
    popupAnchor: [0, -6],
});

// Custom User Marker Icon (Subtle Dot with Pulse)
const userIconHtml = renderToStaticMarkup(
    <div style={{ position: 'relative', width: '12px', height: '12px' }} className="user-pulse-marker">
        <div className="pulse-ring" style={{ position: 'absolute', top: '-6px', left: '-6px', width: '24px', height: '24px', backgroundColor: '#3b82f6', borderRadius: '50%', opacity: 0.3 }} />
        <div style={{ position: 'absolute', inset: 0, backgroundColor: '#3b82f6', borderRadius: '50%', border: '2px solid var(--card-bg, #18181b)' }} />
    </div>
);
const userIcon = new L.DivIcon({
    html: userIconHtml,
    className: 'custom-leaflet-icon',
    iconSize: [12, 12],
    iconAnchor: [6, 6],
    popupAnchor: [0, -6],
});

// Premium Map Action Controls
function MapActionControls({ userLocation, officeLocation }: { userLocation: [number, number], officeLocation: [number, number] }) {
    const map = useMap();

    const handleRecenter = useCallback(() => {
        const bounds = L.latLngBounds([userLocation, officeLocation]);
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 18 });
    }, [map, userLocation, officeLocation]);

    const handleResetNorth = useCallback(() => {
        map.setView(userLocation, 17, { animate: true });
    }, [map, userLocation]);

    const buttonClass = "w-12 h-12 flex items-center justify-center rounded-full bg-card backdrop-blur-2xl border border-card-border text-(--text-muted) hover:text-foreground hover:bg-foreground/[0.05] transition-all duration-300 active:scale-95 group";

    return (
        <div className="absolute top-1/2 -translate-y-1/2 right-6 z-[400] flex flex-col items-center gap-3">
            {/* Compass Instrument */}
            <div className="p-1.5 rounded-full">
                <button 
                    onClick={(e) => { e.preventDefault(); handleResetNorth(); }}
                    title="Compass: Reset to User"
                    className={`${buttonClass} hover:border-rose-500/30 hover:bg-rose-500/5`}
                >
                    <CompassDial />
                </button>
            </div>

            {/* Navigation Instrument */}
            <div className="p-1.5 rounded-full">
                <button 
                    onClick={(e) => { e.preventDefault(); handleRecenter(); }}
                    title="Recenter: Fit Office & User"
                    className={`${buttonClass} hover:text-emerald-400 hover:border-emerald-500/30 hover:bg-emerald-500/10`}
                >
                    <FiNavigation size={22} className="rotate-45" />
                </button>
            </div>

            {/* Zoom Group */}
            <div className="flex flex-col gap-1.5 p-1.5 rounded-[32px] bg-card backdrop-blur-2xl border border-card-border">
                <button 
                    onClick={(e) => { e.preventDefault(); map.zoomIn(); }}
                    title="Zoom In"
                    className={buttonClass}
                >
                    <FiPlus size={22} />
                </button>
                <button 
                    onClick={(e) => { e.preventDefault(); map.zoomOut(); }}
                    title="Zoom Out"
                    className={buttonClass}
                >
                    <FiMinus size={22} />
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
  userName: string;
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

export function AttendanceMapInternals({ center, officeLocation, inOfficeRadius, tempOutRadius, userName }: MapInternalsProps) {
    const { resolvedTheme } = useTheme();
    const { location, presenceState, isTracking } = useLocation();

    const tileUrl = resolvedTheme === 'dark' 
        ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
        : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

    const currentDistance = location ? getDistanceInMeters(
        location.latitude, 
        location.longitude, 
        officeLocation[0], 
        officeLocation[1]
    ) : null;

    return (
        <div className="w-full h-full relative z-0" style={{ isolation: 'isolate' }}>
            {/* Symmetrical Floating Map Details (Horizontal Micro-Instruments) */}
            <div className="absolute bottom-6 left-6 right-6 z-[1000] pointer-events-none flex items-center gap-2.5 animate-in fade-in slide-in-from-bottom-4 duration-700">
                {/* Card 1: Attendance Status */}
                <div className="bg-background/50 flex-[1.2] px-4 py-2.5 rounded-2xl border border-card-border backdrop-blur-3xl flex items-center justify-center gap-2.5 pointer-events-auto">
                    <FiActivity className={`${presenceState ? presenceStateColors[presenceState].text : 'text-(--text-muted)'} text-xs`} />
                    <div className={`w-1.5 h-1.5 rounded-full ${presenceState ? presenceStateColors[presenceState].dot : 'bg-(--text-muted)'} -[0_0_8px_currentColor]`} />
                    <span className="text-[10px] font-black uppercase tracking-tight text-foreground whitespace-nowrap">
                        {presenceState ? presenceStateLabels[presenceState] : 'Updating...'}
                    </span>
                </div>

                {/* Card 2: GPS Tracking State */}
                <div className="bg-background/50 flex-1 px-4 py-2.5 rounded-2xl border border-card-border backdrop-blur-3xl flex items-center justify-center gap-2.5 pointer-events-auto">
                    <FiTarget className={`${isTracking ? 'text-emerald-400' : 'text-(--text-muted)'} text-xs`} />
                    <div className={`w-1.5 h-1.5 rounded-full ${isTracking ? 'bg-emerald-500 animate-pulse -[0_0_8px_#10b981]' : 'bg-(--text-muted)'}`} />
                    <span className={`text-[10px] font-black uppercase tracking-tight ${isTracking ? 'text-emerald-400' : 'text-(--text-muted)'} whitespace-nowrap`}>
                        GPS {isTracking ? 'Active' : 'Off'}
                    </span>
                </div>

                {/* Card 3: Distance from Center */}
                <div className="bg-background/50 flex-1 px-4 py-2.5 rounded-2xl border border-card-border backdrop-blur-3xl flex items-center justify-center gap-2.5 pointer-events-auto">
                    <FiNavigation className="text-sky-400 text-xs" />
                    <div className="w-1.5 h-1.5 rounded-full bg-sky-500/20" />
                    <span className="text-[10px] font-numbers font-bold text-foreground whitespace-nowrap">
                        {currentDistance !== null ? formatDistance(currentDistance) : '—'}
                    </span>
                </div>

                {/* Card 4: GPS Accuracy */}
                <div className="bg-background/50 flex-1 px-4 py-2.5 rounded-2xl border border-card-border backdrop-blur-3xl flex items-center justify-center gap-2.5 pointer-events-auto">
                    <FiActivity className="text-rose-400/80 text-xs" />
                    <div className="w-1.5 h-1.5 rounded-full bg-rose-500/20" />
                    <span className="text-[10px] font-numbers font-bold text-foreground whitespace-nowrap">
                        {location?.accuracy ? `${Math.round(location.accuracy)}m` : '—'}
                    </span>
                </div>
            </div>
            <style dangerouslySetInnerHTML={{__html: `
                .custom-leaflet-icon { background: none; border: none; }
                .leaflet-popup-content-wrapper { background: var(--card-bg); color: var(--foreground); border: 1px solid var(--border-subtle); border-radius: 12px; }
                .leaflet-popup-tip { background: var(--card-bg); border: 1px solid var(--border-subtle); }
                .leaflet-container { font-family: inherit; }
                
                @keyframes mapPulse {
                    0% { transform: scale(0.5); opacity: 0.8; }
                    100% { transform: scale(2.5); opacity: 0; }
                }
                .pulse-ring {
                    animation: mapPulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
                }
            `}} />
            
            <MapContainer 
                center={center} 
                zoom={17}
                maxZoom={20}
                zoomControl={false}
                scrollWheelZoom={false} 
                style={{ height: '100%', width: '100%', backgroundColor: 'transparent' }}
                attributionControl={false}
            >
                <RecenterMap center={center} />
                <MapActionControls userLocation={center} officeLocation={officeLocation} />
                <TileLayer url={tileUrl} />
                
                {/* Temporarily Out Grace Radius (Orange) */}
                <Circle 
                    center={officeLocation} 
                    radius={tempOutRadius} 
                    pathOptions={{ 
                        color: resolvedTheme === 'dark' ? '#f59e0b' : '#d97706', 
                        fillColor: 'transparent', 
                        weight: 2,
                        dashArray: '8, 12',
                        opacity: 0.4
                    }} 
                />

                {/* Strict Office Radius (Green) */}
                <Circle 
                    center={officeLocation} 
                    radius={inOfficeRadius} 
                    pathOptions={{ 
                        color: resolvedTheme === 'dark' ? '#10b981' : '#059669', 
                        fillColor: resolvedTheme === 'dark' ? '#10b981' : '#059669', 
                        fillOpacity: 0.1, 
                        weight: 2,
                    }} 
                />

                <Marker position={officeLocation} icon={officeIcon}>
                    <Popup>
                        <span className="font-semibold text-xs tracking-wide text-emerald-400">Main Office</span>
                    </Popup>
                </Marker>

                <Marker position={center} icon={userIcon}>
                    <Popup>
                        <span className="font-semibold text-xs text-sky-400">{userName} (Active)</span>
                    </Popup>
                </Marker>
            </MapContainer>
        </div>
    );
}
