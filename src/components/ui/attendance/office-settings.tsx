'use client';

import React, { useState, useEffect } from 'react';
import type { OfficeLocation } from '@/types/attendance';
import { createOfficeLocation, updateOfficeLocation } from '@/app/(dashboard)/[orgSlug]/attendance/actions';
import { FiMapPin, FiPlus, FiCheck, FiMap } from 'react-icons/fi';
import { toast } from '@/lib/toast';
import PolicyEditor from './policy-editor';
import { OfficeLocationFields } from './office-location-fields';
import type { MapIdentity } from './map-markers';

import { TabPill } from '@/components/ui/tab-pill';

import { BusyIcon, useButtonStatus } from '@/components/ui/busy-icon';
export default function OfficeSettings({ initialLocations, organization, cartoApiLink }: { initialLocations: OfficeLocation[]; organization?: MapIdentity; cartoApiLink?: string }) {
    const [locations, setLocations] = useState(initialLocations);
    const [selectedId, setSelectedId] = useState<number | 'new'>(
        locations.length > 0 ? locations[0].id : 'new'
    );
    const [activeRightTab, setActiveRightTab] = useState<'details' | 'policy'>('details');

    // Form state for currently selected office
    const [form, setForm] = useState(() => {
        if (initialLocations.length > 0) {
            const loc = initialLocations[0];
            return {
                name: loc.name,
                latitude: String(loc.latitude),
                longitude: String(loc.longitude),
                in_office_radius_meters: String(loc.in_office_radius_meters),
                temporarily_out_radius_meters: String(loc.temporarily_out_radius_meters),
                out_of_office_radius_meters: String(loc.out_of_office_radius_meters),
            };
        }
        return {
            name: '',
            latitude: '',
            longitude: '',
            in_office_radius_meters: '100',
            temporarily_out_radius_meters: '500',
            out_of_office_radius_meters: '1000',
        };
    });

    const [isSaving, setIsSaving] = useState(false);
    const saveStatus = useButtonStatus();

    const handleSelect = (id: number | 'new') => {
        setSelectedId(id);
        if (id === 'new') {
            setActiveRightTab('details');
            setForm({
                name: '',
                latitude: '',
                longitude: '',
                in_office_radius_meters: '100',
                temporarily_out_radius_meters: '500',
                out_of_office_radius_meters: '1000',
            });
        } else {
            const loc = locations.find(l => l.id === id);
            if (loc) {
                setForm({
                    name: loc.name,
                    latitude: String(loc.latitude),
                    longitude: String(loc.longitude),
                    in_office_radius_meters: String(loc.in_office_radius_meters),
                    temporarily_out_radius_meters: String(loc.temporarily_out_radius_meters),
                    out_of_office_radius_meters: String(loc.out_of_office_radius_meters),
                });
            }
        }
    };

    const handleSaveOffice = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        saveStatus.start();
        const data = {
            name: form.name,
            latitude: parseFloat(form.latitude),
            longitude: parseFloat(form.longitude),
            in_office_radius_meters: parseInt(form.in_office_radius_meters),
            temporarily_out_radius_meters: parseInt(form.temporarily_out_radius_meters),
            out_of_office_radius_meters: parseInt(form.out_of_office_radius_meters),
        };

        // There is no SWR hook for office locations, so this applies the change
        // to local state immediately and restores the previous list if the save
        // is rejected — same instant-feedback contract as the SWR screens.
        const previous = locations;

        if (selectedId === 'new') {
            const tempId = -Date.now();
            setLocations(prev => [...prev, { ...data, id: tempId } as OfficeLocation]);

            const result = await createOfficeLocation(data);
            if (result.success && result.location) {
                setLocations(prev => prev.map(l => (l.id === tempId ? result.location : l)));
                setSelectedId(result.location.id);
                toast.success('Office location created');
                void saveStatus.succeed();
            } else {
                setLocations(previous);
                toast.error(result.error || 'Failed to create location');
                saveStatus.reset();
            }
        } else {
            const id = selectedId;
            setLocations(prev =>
                prev.map(l => (l.id === id ? { ...l, ...data } as OfficeLocation : l)),
            );

            const result = await updateOfficeLocation(id, data);
            if (result.success && result.location) {
                setLocations(prev => prev.map(l => (l.id === id ? result.location : l)));
                toast.success('Office location updated');
                void saveStatus.succeed();
            } else {
                setLocations(previous);
                toast.error(result.error || 'Failed to update location');
                saveStatus.reset();
            }
        }
        setIsSaving(false);
    };

    const inputClass = "h-11 w-full rounded-full border border-card-border bg-input-bg px-4 text-sm text-foreground transition-colors placeholder:text-text-muted/50 font-numbers";
    const labelClass = "mb-1.5 ml-3 block text-xs font-medium text-text-muted";

    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Sidebar */}
            <div className="h-fit space-y-2 rounded-[28px] bg-card p-2">
                <div className="mb-1 flex items-center gap-2 px-3 pt-2">
                    <FiMap className="h-3.5 w-3.5 text-text-muted" />
                    <h3 className="text-xs font-medium text-text-muted">Offices</h3>
                </div>

                <div className="space-y-1">
                    {locations.map(loc => (
                        <button
                            key={loc.id}
                            onClick={() => handleSelect(loc.id)}
                            className={`flex min-h-10 w-full items-center gap-2.5 rounded-full px-3.5 text-left transition-colors ${
                                selectedId === loc.id
                                    ? 'bg-accent/12 text-accent-text'
                                    : 'text-text-secondary hover:bg-foreground/[0.05] hover:text-foreground'
                            }`}
                        >
                            <FiMapPin className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate text-sm">{loc.name}</span>
                        </button>
                    ))}
                </div>

                <div className="pt-2 mt-2 border-t border-card-border">
                    <button
                        onClick={() => handleSelect('new')}
                        className={`flex min-h-10 w-full items-center justify-center gap-2 rounded-full px-3 text-sm transition-colors ${
                            selectedId === 'new'
                                ? 'bg-ink text-on-ink'
                                : 'border border-dashed border-card-border text-text-muted hover:border-foreground/20 hover:text-foreground'
                        }`}
                    >
                        <FiPlus className="w-3.5 h-3.5" />
                        New office
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="md:col-span-3 space-y-6">
                {/* Tabs for Details vs Policy */}
                {selectedId !== 'new' && (
                    <div className="flex w-fit gap-1 rounded-full bg-foreground/[0.05] p-1">
                        <button
                            onClick={() => setActiveRightTab('details')}
                            className={`relative isolate min-h-9 rounded-full px-4 text-sm transition-colors ${
                                activeRightTab === 'details'
                                    ? 'font-medium text-on-ink'
                                    : 'text-text-secondary hover:text-foreground'
                            }`}
                        >
                            {activeRightTab === 'details' && <TabPill id="office-tab" />}
                            Details
                        </button>
                        <button
                            onClick={() => setActiveRightTab('policy')}
                            className={`relative isolate min-h-9 rounded-full px-4 text-sm transition-colors ${
                                activeRightTab === 'policy'
                                    ? 'font-medium text-on-ink'
                                    : 'text-text-secondary hover:text-foreground'
                            }`}
                        >
                            {activeRightTab === 'policy' && <TabPill id="office-tab" />}
                            Attendance policy
                        </button>
                    </div>
                )}

                {activeRightTab === 'details' && (
                    <div className="space-y-5 rounded-[28px] bg-card p-5 sm:p-6">
                        <div className="flex items-center gap-3 border-b border-card-border pb-4">
                            <div className="grid h-10 w-10 place-items-center rounded-full bg-success/15 text-success-text">
                                <FiMapPin className="h-4 w-4" />
                            </div>
                            <div>
                                <h3 className="text-base font-semibold text-foreground">
                                    {selectedId === 'new' ? 'New office' : 'Office details'}
                                </h3>
                                <p className="mt-0.5 text-xs text-text-muted">
                                    Name the office and set its boundaries.
                                </p>
                            </div>
                        </div>

                        <form onSubmit={handleSaveOffice} className="space-y-4">
                            <OfficeLocationFields
                                name={form.name}
                                organization={organization}
                                cartoApiLink={cartoApiLink}
                                inOfficeRadius={Number(form.in_office_radius_meters) || 0}
                                graceRadius={Number(form.temporarily_out_radius_meters) || 0}
                                latitude={form.latitude}
                                longitude={form.longitude}
                                onChange={(location) => setForm((current) => ({ ...current, ...location }))}
                            />

                            <div className="grid grid-cols-1 gap-4 rounded-[24px] bg-foreground/[0.03] p-4 sm:grid-cols-3">
                                <div>
                                    <label className={labelClass}>In office (m)</label>
                                    <input type="number" value={form.in_office_radius_meters} onChange={e => setForm(f => ({ ...f, in_office_radius_meters: e.target.value }))} className={inputClass} required />
                                </div>
                                <div>
                                    <label className={labelClass}>Temporarily out (m)</label>
                                    <input type="number" value={form.temporarily_out_radius_meters} onChange={e => setForm(f => ({ ...f, temporarily_out_radius_meters: e.target.value }))} className={inputClass} required />
                                </div>
                                <div>
                                    <label className={labelClass}>Out (m)</label>
                                    <input type="number" value={form.out_of_office_radius_meters} onChange={e => setForm(f => ({ ...f, out_of_office_radius_meters: e.target.value }))} className={inputClass} required />
                                </div>
                            </div>

                            <div className="flex flex-row-reverse items-center gap-3 border-t border-card-border pt-4">
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    aria-busy={isSaving}
                                    className="md-btn md-btn-primary disabled:cursor-wait"
                                >
                                    {isSaving ? 'Saving…' : 'Save changes'}
                                    <span className="md-btn-chip"><BusyIcon state={saveStatus.state} icon={<FiCheck />} /></span>
                                </button>
                                {selectedId === 'new' && locations.length > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => handleSelect(locations[0].id)}
                                        className="md-btn md-btn-secondary"
                                    >
                                        Cancel
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>
                )}

                {activeRightTab === 'policy' && selectedId !== 'new' && (
                    <PolicyEditor officeLocationId={selectedId} />
                )}
            </div>
        </div>
    );
}
