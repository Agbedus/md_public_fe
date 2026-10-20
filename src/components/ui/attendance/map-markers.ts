'use client';

import L from 'leaflet';
import type { LatLngTuple } from 'leaflet';
import { avatarStyle } from '@/lib/avatar-color';

export interface MapIdentity {
    name: string;
    imageUrl?: string | null;
}

const escapeHtml = (value: string) =>
    value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

/**
 * Route a picture through Next's image endpoint, the same path the sidebar
 * avatar uses, so relative upload paths and remote hosts both resolve.
 */
function pictureSrc(url: string) {
    // SVGs are not run through the optimizer; load those (and inline data) directly.
    if (url.startsWith('data:') || url.startsWith('blob:') || /\.svg($|[?#])/i.test(url)) return url;
    return `/_next/image?url=${encodeURIComponent(url)}&w=96&q=75`;
}

/**
 * A round face: coloured initials underneath, with the picture laid over them.
 * If the picture fails to load it removes itself and the initials show.
 */
function faceHtml({ name, imageUrl }: MapIdentity) {
    const { backgroundColor, color } = avatarStyle(name);
    const initial = escapeHtml(name.trim().charAt(0).toUpperCase() || '?');
    const picture = imageUrl
        ? `<img src="${escapeHtml(pictureSrc(imageUrl))}" alt="" onerror="this.remove()" />`
        : '';
    return `<span class="md-pin-face" style="background:${backgroundColor};color:${color}">${initial}${picture}</span>`;
}

const PIN_W = 44;
const PIN_H = 52;

/**
 * A map pin: a round head holding the avatar, tapering to a point that sits
 * exactly on the location (the icon's anchor), with a small dot marking it.
 */
export function pinIcon(face: MapIdentity, tone: 'accent' | 'success', label?: string) {
    return new L.DivIcon({
        className: 'custom-leaflet-icon',
        html: `<div class="md-pin md-pin--${tone}">
            <span class="md-pin-head"></span>
            ${faceHtml(face)}
            <span class="md-pin-dot"></span>
            ${label ? `<span class="md-pin-label">${escapeHtml(label)}</span>` : ''}
        </div>`,
        iconSize: [PIN_W, PIN_H],
        // The head's point lands 1px above the box bottom; the dot centres there.
        iconAnchor: [PIN_W / 2, PIN_H - 1],
        popupAnchor: [0, -PIN_H + 6],
    });
}

/** Points on a circle of `radius` metres, for drawing rings as polygons. */
function circlePoints([lat, lng]: LatLngTuple, radius: number, steps = 96): LatLngTuple[] {
    const dLat = radius / 111_320;
    const dLng = radius / (111_320 * Math.cos((lat * Math.PI) / 180));
    return Array.from({ length: steps }, (_, i) => {
        const a = (i / steps) * Math.PI * 2;
        return [lat + dLat * Math.sin(a), lng + dLng * Math.cos(a)] as LatLngTuple;
    });
}

/** The grace band: the area between the office zone and the outer radius. */
export function ringPositions(center: LatLngTuple, inner: number, outer: number): LatLngTuple[][] {
    return [circlePoints(center, Math.max(outer, inner)), circlePoints(center, inner)];
}

const CARTO_STYLE_PATH = /\/(rastertiles\/)?(?:voyager|positron|dark-matter|light_all|dark_all)\//;

/** The basemap tile URL, using the configured CARTO link when there is one. */
export function getCartoTileUrl(cartoApiLink: string | undefined, isDarkMode: boolean) {
    const style = isDarkMode ? 'dark_all' : 'light_all';
    const fallback = `https://{s}.basemaps.cartocdn.com/${style}/{z}/{x}/{y}{r}.png`;

    if (!cartoApiLink) return fallback;
    if (!CARTO_STYLE_PATH.test(cartoApiLink)) return cartoApiLink;

    return cartoApiLink.replace(
        CARTO_STYLE_PATH,
        (match, rasterPrefix: string | undefined) => `/${rasterPrefix || ''}${style}/`,
    );
}

/** Shared Leaflet styling: solid popups, pins and the borderless geofence. */
export const MAP_STYLES = `
    .custom-leaflet-icon { background: none; border: none; }
    .leaflet-container { font-family: inherit; }
    .leaflet-popup-content-wrapper { background: var(--card-bg); color: var(--foreground); border: 1px solid var(--card-border); border-radius: 18px; box-shadow: none; }
    .leaflet-popup-tip { background: var(--card-bg); box-shadow: none; }
    .leaflet-popup-content { margin: 10px 14px; line-height: 1.4; }
    .leaflet-container a.leaflet-popup-close-button { display: none; }

    .md-geofence { stroke: none; }
    .md-geofence--office { fill: var(--success); }
    .md-geofence--grace { fill: var(--warning); }

    .md-pin { position: relative; width: ${PIN_W}px; height: ${PIN_H}px; --pin: var(--accent); }
    .md-pin--success { --pin: var(--success); }
    .md-pin-head {
        position: absolute; left: 2px; top: 2px; width: 40px; height: 40px;
        background: var(--pin); border-radius: 50% 50% 50% 0; transform: rotate(-45deg);
    }
    .md-pin-face {
        position: absolute; left: 6px; top: 6px; width: 32px; height: 32px; overflow: hidden;
        display: grid; place-items: center; border-radius: 999px;
        background: var(--card-bg); box-shadow: 0 0 0 2px var(--background);
        font: 600 13px/1 var(--font-dm-sans), sans-serif;
    }
    .md-pin-face img { position: absolute; inset: 0; width: 100%; height: 100%; max-width: none; object-fit: cover; display: block; background: var(--card-bg); }
    .md-pin-dot {
        position: absolute; left: 50%; bottom: -3px; width: 8px; height: 8px; margin-left: -4px; z-index: 1;
        border-radius: 999px; background: var(--pin); box-shadow: 0 0 0 2px var(--background);
    }
    .md-pin-label {
        position: absolute; left: 50%; top: calc(100% + 6px); transform: translateX(-50%); white-space: nowrap;
        padding: 3px 10px; border-radius: 999px; background: var(--card-bg); border: 1px solid var(--card-border);
        color: var(--foreground); font: 500 11px/1.3 var(--font-dm-sans), sans-serif;
    }
    .md-pin--accent .md-pin-head::after {
        content: ''; position: absolute; inset: 0; border-radius: inherit; background: var(--pin);
        animation: mdPinPulse 2.4s cubic-bezier(0.23, 1, 0.32, 1) infinite;
    }
    @keyframes mdPinPulse { 0% { opacity: .45; transform: scale(1); } 100% { opacity: 0; transform: scale(1.6); } }
    @media (prefers-reduced-motion: reduce) { .md-pin--accent .md-pin-head::after { animation: none; opacity: 0; } }
`;
