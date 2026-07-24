'use client';

import React, { useState, useEffect } from 'react';
import type { OfficeLocation } from '@/types/attendance';
import { createOfficeLocation, updateOfficeLocation } from '@/app/(dashboard)/[orgSlug]/attendance/actions';
import { FiMapPin, FiPlus, FiCheck, FiMap, FiX } from 'react-icons/fi';
import { toast } from '@/lib/toast';
import PolicyEditor from './policy-editor';
import dynamic from 'next/dynamic';

const MapComponent = dynamic(() => import('./office-map'), {
    ssr: false,
    loading: () => <div className="w-full h-full min-h-[400px] rounded-2xl bg-background/50 border border-card-border animate-pulse flex items-center justify-center p-8 text-center text-(--text-muted) text-sm">Loading visualizer...</div>
});

export default function OfficeSettings({ initialLocations }: { initialLocations: OfficeLocation[] }) {
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
            } else {
                setLocations(previous);
                toast.error(result.error || 'Failed to create location');
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
            } else {
                setLocations(previous);
                toast.error(result.error || 'Failed to update location');
            }
        }
        setIsSaving(false);
    };

    const inputClass = "w-full px-3 py-1.5 rounded-lg bg-background/50 border border-card-border text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50 transition-all placeholder:text-text-muted/50";
    const labelClass = "block text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1.5 ml-0.5";

    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Sidebar */}
            <div className="glass p-3 rounded-2xl border border-card-border space-y-2 h-fit">
                <div className="flex items-center gap-2 px-2 mb-2">
                    <FiMap className="text-emerald-500 w-3.5 h-3.5" />
                    <h3 className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Nodes</h3>
                </div>
                
                <div className="space-y-1">
                    {locations.map(loc => (
                        <button
                            key={loc.id}
                            onClick={() => handleSelect(loc.id)}
                            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-all ${
                                selectedId === loc.id 
                                    ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' 
                                    : 'text-text-muted hover:text-foreground hover:bg-foreground/[0.05] border border-transparent'
                            }`}
                        >
                            <FiMapPin className="w-3.5 h-3.5 shrink-0" />
                            <span className="text-xs font-bold truncate">{loc.name}</span>
                        </button>
                    ))}
                </div>

                <div className="pt-2 mt-2 border-t border-card-border">
                    <button
                        onClick={() => handleSelect('new')}
                        className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all ${
                            selectedId === 'new'
                                ? 'bg-foreground/[0.05] text-foreground border border-card-border'
                                : 'text-text-muted hover:text-foreground bg-foreground/[0.02] border border-dashed border-card-border hover:border-foreground/20'
                        }`}
                    >
                        <FiPlus className="w-3.5 h-3.5" />
                        New Node
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="md:col-span-3 space-y-6">
                {/* Tabs for Details vs Policy */}
                {selectedId !== 'new' && (
                    <div className="flex gap-1 p-1 rounded-xl bg-card border border-card-border w-fit backdrop-blur-md">
                        <button
                            onClick={() => setActiveRightTab('details')}
                            className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${
                                activeRightTab === 'details'
                                    ? 'bg-foreground/[0.08] text-foreground border border-card-border'
                                    : 'text-text-muted hover:text-foreground hover:bg-foreground/[0.03]'
                            }`}
                        >
                            Configuration
                        </button>
                        <button
                            onClick={() => setActiveRightTab('policy')}
                            className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${
                                activeRightTab === 'policy'
                                    ? 'bg-foreground/[0.08] text-foreground border border-card-border'
                                    : 'text-text-muted hover:text-foreground hover:bg-foreground/[0.03]'
                            }`}
                        >
                            Operational Policy
                        </button>
                    </div>
                )}

                {activeRightTab === 'details' && (
                    <div className="glass p-6 rounded-[32px] border border-card-border space-y-6">
                        <div className="flex items-center gap-3 border-b border-card-border pb-4">
                            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                                <FiMapPin className="w-4 h-4 text-emerald-500" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
                                    {selectedId === 'new' ? 'Provision New Node' : 'Node Configuration'}
                                </h3>
                                <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest mt-0.5">
                                    Define geographical boundaries and naming.
                                </p>
                            </div>
                        </div>
                        
                        <form onSubmit={handleSaveOffice} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2">
                                    <label className={labelClass}>Office Name</label>
                                    <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={inputClass} placeholder="Headquarters" required />
                                </div>
                                <div>
                                    <label className={labelClass}>Latitude</label>
                                    <input type="number" step="any" value={form.latitude} onChange={e => setForm(f => ({ ...f, latitude: e.target.value }))} className={inputClass} placeholder="5.6037" required />
                                </div>
                                <div>
                                    <label className={labelClass}>Longitude</label>
                                    <input type="number" step="any" value={form.longitude} onChange={e => setForm(f => ({ ...f, longitude: e.target.value }))} className={inputClass} placeholder="-0.1870" required />
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4 p-4 bg-foreground/[0.02] rounded-2xl border border-card-border">
                                <div>
                                    <label className={labelClass}>In-Office (m)</label>
                                    <input type="number" value={form.in_office_radius_meters} onChange={e => setForm(f => ({ ...f, in_office_radius_meters: e.target.value }))} className={`${inputClass} font-numbers`} required />
                                </div>
                                <div>
                                    <label className={labelClass}>Tem-Out (m)</label>
                                    <input type="number" value={form.temporarily_out_radius_meters} onChange={e => setForm(f => ({ ...f, temporarily_out_radius_meters: e.target.value }))} className={`${inputClass} font-numbers`} required />
                                </div>
                                <div>
                                    <label className={labelClass}>Out (m)</label>
                                    <input type="number" value={form.out_of_office_radius_meters} onChange={e => setForm(f => ({ ...f, out_of_office_radius_meters: e.target.value }))} className={`${inputClass} font-numbers`} required />
                                </div>
                            </div>

                            <div className="pt-2 flex items-center gap-3">
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="flex items-center gap-2 px-5 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all disabled:opacity-50"
                                >
                                    <FiCheck className="w-3.5 h-3.5" />
                                    {isSaving ? 'Synchronizing...' : 'Save Changes'}
                                </button>
                                {selectedId === 'new' && locations.length > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => handleSelect(locations[0].id)}
                                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest text-text-muted hover:text-foreground hover:bg-foreground/[0.05] transition-all"
                                    >
                                        <FiX className="w-3.5 h-3.5" />
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
