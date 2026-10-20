'use client';

import React, { useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useLocation } from '@/providers/location-provider';
import { Skeleton } from '@/components/ui/skeleton';
import type { OfficeLocation } from '@/types/attendance';
import type { MapIdentity } from './attendance-map-internals';

// Dynamic import to prevent SSR issues with Leaflet
const AttendanceMapInternals = dynamic(
  () => import('./attendance-map-internals').then((mod) => mod.AttendanceMapInternals),
  {
    ssr: false,
    loading: () => <Skeleton className="h-full w-full rounded-none" />
  }
);

interface AttendanceMapProps {
  officeLocations?: OfficeLocation[];
  cartoApiLink?: string;
  onMapClick?: () => void;
  user: MapIdentity;
  organization: MapIdentity;
}

export function AttendanceMap({ officeLocations, cartoApiLink, onMapClick, user, organization }: AttendanceMapProps) {
  const { location, officeLocation } = useLocation();

  const activeOffice = useMemo(() => {
    if (!officeLocations || officeLocations.length === 0) return null;
    if (officeLocation) {
        return officeLocations.find(o => o.latitude === officeLocation.latitude && o.longitude === officeLocation.longitude) || officeLocations[0];
    }
    return officeLocations[0];
  }, [officeLocations, officeLocation]);

  const mapCenter: [number, number] = useMemo(() => {
    if (location) return [location.latitude, location.longitude];
    if (officeLocation) return [officeLocation.latitude, officeLocation.longitude];
    return [5.55602, -0.1969]; // Default fallback coords (Accra)
  }, [location, officeLocation]);

  const mapOffice: [number, number] = useMemo(() => {
    if (officeLocation) return [officeLocation.latitude, officeLocation.longitude];
    return [5.55602, -0.1969];
  }, [officeLocation]);

  return (
    <div className="h-full w-full relative z-0">
      <AttendanceMapInternals
        center={mapCenter}
        officeLocation={mapOffice}
        inOfficeRadius={activeOffice?.in_office_radius_meters || 0}
        tempOutRadius={activeOffice?.temporarily_out_radius_meters || 0}
        user={user}
        organization={organization}
        officeName={activeOffice?.name || organization.name}
        cartoApiLink={cartoApiLink}
        onMapClick={onMapClick}
      />
    </div>
  );
}
