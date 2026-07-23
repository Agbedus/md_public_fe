'use client';

import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Circle, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { renderToStaticMarkup } from 'react-dom/server';
import { FiPlus, FiMinus } from 'react-icons/fi';
import { useTheme } from '@/providers/theme-provider';

// Custom Office Marker Icon (Subtle Dot)
const officeIconHtml = renderToStaticMarkup(
    <div style={{ position: 'relative', width: '12px', height: '12px' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundColor: '#10b981', borderRadius: '50%', border: '2px solid var(--background)', boxShadow: '0 0 0 1px rgba(16, 185, 129, 0.2)' }} />
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
        <div className="pulse-ring" style={{ position: 'absolute', top: '-6px', left: '-6px', width: '24px', height: '24px', backgroundColor: '#3b82f6', borderRadius: '50%', opacity: 0.4 }} />
        <div style={{ position: 'absolute', inset: 0, backgroundColor: '#3b82f6', borderRadius: '50%', border: '2px solid var(--background)' }} />
    </div>
);
const userIcon = new L.DivIcon({
    html: userIconHtml,
    className: 'custom-leaflet-icon',
    iconSize: [12, 12],
    iconAnchor: [6, 6],
    popupAnchor: [0, -6],
});

// Custom Zoom Controls
function CustomZoomControls() {
    const map = useMap();
    return (
        <div className="absolute bottom-4 right-4 z-[400] flex flex-col gap-1">
            <button 
                onClick={(e) => { e.preventDefault(); map.zoomIn(); }}
                className="w-8 h-8 flex items-center justify-center rounded-t-xl bg-card border border-card-border text-text-muted hover:text-foreground hover:bg-foreground/[0.05] transition-colors"
            >
                <FiPlus size={16} />
            </button>
            <button 
                onClick={(e) => { e.preventDefault(); map.zoomOut(); }}
                className="w-8 h-8 flex items-center justify-center rounded-b-xl bg-card border border-card-border border-t-0 text-text-muted hover:text-foreground hover:bg-foreground/[0.05] transition-colors"
            >
                <FiMinus size={16} />
            </button>
        </div>
    );
}

interface OfficeMapProps {
    latitude: number;
    longitude: number;
    inOfficeRadius: number;
    temporarilyOutRadius: number;
    outOfOfficeRadius: number;
    name?: string;
}

// Component to handle map centering when coordinates change
function ChangeView({ center }: { center: [number, number] }) {
    const map = useMap();
    useEffect(() => {
        map.setView(center);
    }, [center, map]);
    return null;
}

export default function OfficeMap({
    latitude,
    longitude,
    inOfficeRadius,
    temporarilyOutRadius,
    outOfOfficeRadius,
    name
}: OfficeMapProps) {
    const { resolvedTheme } = useTheme();

    // If coords are strictly 0 and not updated yet, maybe center on something default, or wait.
    // We'll just put them where they are.
    const center: [number, number] = [latitude || 0, longitude || 0];
    const [userLocation, setUserLocation] = useState<[number, number] | null>(null);

    useEffect(() => {
        if (!navigator.geolocation) return;
        
        const watchId = navigator.geolocation.watchPosition(
            (pos) => {
                setUserLocation([pos.coords.latitude, pos.coords.longitude]);
            },
            (err) => console.warn('Could not get user location:', err),
            { 
                enableHighAccuracy: true,
                maximumAge: 0, 
                timeout: 10000 
            }
        );

        return () => navigator.geolocation.clearWatch(watchId);
    }, []);

    return (
        <div className="w-full h-full min-h-[400px] rounded-2xl overflow-hidden border border-card-border relative z-0" style={{ isolation: 'isolate' }}>
            {/* Adding some global CSS fixes for leaflet divIcons since tailwind strips some base styles */}
            <style dangerouslySetInnerHTML={{__html: `
                .custom-leaflet-icon { background: none; border: none; }
                .leaflet-popup-content-wrapper { background: var(--card-bg); color: var(--foreground); border: 1px solid var(--card-border); border-radius: 12px; }
                .leaflet-popup-tip { background: var(--card-bg); border: 1px solid var(--card-border); }
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
                zoom={19}
                maxZoom={20}
                zoomControl={false}
                scrollWheelZoom={false} 
                style={{ height: '100%', width: '100%', backgroundColor: 'transparent' }}
                attributionControl={false}
            >
                <ChangeView center={center} />
                <CustomZoomControls />
                <TileLayer
                    url={resolvedTheme === 'dark' 
                        ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                        : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                    }
                />
                
                {/* Cross-in Out Of Office Radius */}
                <Circle 
                    center={center} 
                    radius={outOfOfficeRadius} 
                    pathOptions={{ color: '#fb7185', fillColor: 'transparent', fillOpacity: 0, weight: 1.5, dashArray: '5, 8' }} 
                />

                {/* Cross-in Temporarily Out Radius */}
                <Circle 
                    center={center} 
                    radius={temporarilyOutRadius} 
                    pathOptions={{ color: '#fbbf24', fillColor: 'transparent', fillOpacity: 0, weight: 1.5, dashArray: '5, 8' }} 
                />

                {/* Subtle In Office Radius */}
                <Circle 
                    center={center} 
                    radius={inOfficeRadius} 
                    pathOptions={{ color: '#34d399', fillColor: '#34d399', fillOpacity: 0.08, weight: 2 }} 
                />

                <Marker position={center} icon={officeIcon}>
                    <Popup>
                        <span className="font-semibold text-xs tracking-wide">{name || 'Office Location'}</span>
                    </Popup>
                </Marker>

                {userLocation && (
                    <Marker position={userLocation} icon={userIcon}>
                        <Popup>
                            <span className="font-semibold text-xs text-sky-400">Your Current Location</span>
                        </Popup>
                    </Marker>
                )}
            </MapContainer>
        </div>
    );
}
