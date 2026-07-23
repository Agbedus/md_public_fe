'use client';

import React, { useState, useEffect, useTransition } from 'react';
import type { OfficeLocation, AttendancePolicy } from '@/types/attendance';
import { getAttendancePolicy, updateAttendancePolicy } from '@/app/(dashboard)/[orgSlug]/attendance/actions';
import { FiSettings, FiCheck } from 'react-icons/fi';
import { toast } from '@/lib/toast';
import { CustomTimePicker } from '@/components/ui/inputs/custom-time-picker';

export default function PolicyEditor({ officeLocationId }: { officeLocationId: number }) {
    const [policy, setPolicy] = useState<AttendancePolicy | null>(null);
    const [isPending, startTransition] = useTransition();
    const [isSaving, setIsSaving] = useState(false);
    const [form, setForm] = useState({
        auto_clock_in: true,
        auto_clock_out: true,
        check_in_open_time: '07:30:00',
        check_in_close_time: '10:00:00',
        work_start_time: '08:30:00',
        work_end_time: '18:00:00',
        auto_clock_out_time: '18:00:00',
        temporarily_out_grace_minutes: 5,
        out_of_office_grace_minutes: 10,
        return_to_office_confirmation_minutes: 2,
        auto_clock_in_delay_minutes: 10,
        presence_audit_interval_minutes: 15,
    });

    useEffect(() => {
        if (!officeLocationId) return;
        let cancelled = false;
        startTransition(async () => {
            const p = await getAttendancePolicy(officeLocationId);
            if (cancelled) return;
            setPolicy(p);
            if (p) {
                setForm({
                    auto_clock_in: p.auto_clock_in ?? true,
                    auto_clock_out: p.auto_clock_out ?? true,
                    check_in_open_time: p.check_in_open_time || '07:30:00',
                    check_in_close_time: p.check_in_close_time || '10:00:00',
                    work_start_time: p.work_start_time || '08:30:00',
                    work_end_time: p.work_end_time || '18:00:00',
                    auto_clock_out_time: p.auto_clock_out_time || '18:00:00',
                    temporarily_out_grace_minutes: p.temporarily_out_grace_minutes ?? 5,
                    out_of_office_grace_minutes: p.out_of_office_grace_minutes ?? 10,
                    return_to_office_confirmation_minutes: p.return_to_office_confirmation_minutes ?? 2,
                    auto_clock_in_delay_minutes: p.auto_clock_in_delay_minutes ?? 10,
                    presence_audit_interval_minutes: p.presence_audit_interval_minutes ?? 15,
                });
            }
        });
        return () => { cancelled = true; };
    }, [officeLocationId]);

    const handleSave = async () => {
        setIsSaving(true);
        const result = await updateAttendancePolicy(officeLocationId, form);
        if (result.success) {
            toast.success('Policy updated successfully');
        } else {
            toast.error(result.error || 'Failed to update policy');
        }
        setIsSaving(false);
    };

    const inputClass = "w-full px-3 py-1.5 rounded-lg bg-foreground/[0.03] border border-card-border text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50 transition-all font-numbers placeholder:text-text-muted/50";
    const labelClass = "block text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1.5 ml-0.5";

    // Helper to strip :SS for HTML time input
    const toTimeValue = (val: string | null) => val ? val.substring(0, 5) : '';
    // Helper to add :00 back for API
    const fromTimeValue = (val: string) => `${val}:00`;

    return (
        <div className="glass p-6 rounded-[32px] border border-card-border space-y-6">
            <div className="flex items-center gap-3 border-b border-card-border pb-4">
                <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                    <FiSettings className="w-4 h-4 text-indigo-400" />
                </div>
                <div>
                    <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Operational Policy</h3>
                    <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest mt-0.5">Automations & Grace Thresholds</p>
                </div>
            </div>

            {isPending ? (
                <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="h-12 bg-foreground/[0.02] rounded-2xl animate-pulse border border-card-border" />
                    ))}
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Automation Toggles */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="flex items-center justify-between p-4 rounded-2xl bg-foreground/[0.02] border border-card-border">
                            <div>
                                <p className="text-[10px] font-bold text-foreground uppercase tracking-wider">Auto Clock-In</p>
                                <p className="text-[9px] text-text-muted font-bold uppercase tracking-tight mt-0.5 italic">Geofence Trigger</p>
                            </div>
                            <button
                                onClick={() => setForm(f => ({ ...f, auto_clock_in: !f.auto_clock_in }))}
                                className={`relative w-10 h-5 rounded-full transition-all duration-300 shrink-0 border ${form.auto_clock_in ? 'bg-emerald-500/20 border-emerald-500/50' : 'bg-input-bg border-card-border'}`}
                            >
                                <div className={`absolute top-0.5 left-0.5 w-3.5 h-3.5 rounded-full transition-all duration-300 ${form.auto_clock_in ? 'translate-x-5 bg-emerald-400 -[0_0_10px_rgba(52,211,153,0.5)]' : 'bg-text-muted'}`} />
                            </button>
                        </div>
                        <div className="flex items-center justify-between p-4 rounded-2xl bg-foreground/[0.02] border border-card-border">
                            <div>
                                <p className="text-[10px] font-bold text-foreground uppercase tracking-wider">Auto Clock-Out</p>
                                <p className="text-[9px] text-text-muted font-bold uppercase tracking-tight mt-0.5 italic">Geofence Trigger</p>
                            </div>
                            <button
                                onClick={() => setForm(f => ({ ...f, auto_clock_out: !f.auto_clock_out }))}
                                className={`relative w-10 h-5 rounded-full transition-all duration-300 shrink-0 border ${form.auto_clock_out ? 'bg-emerald-500/20 border-emerald-500/50' : 'bg-input-bg border-card-border'}`}
                            >
                                <div className={`absolute top-0.5 left-0.5 w-3.5 h-3.5 rounded-full transition-all duration-300 ${form.auto_clock_out ? 'translate-x-5 bg-emerald-400 -[0_0_10px_rgba(52,211,153,0.5)]' : 'bg-text-muted'}`} />
                            </button>
                        </div>
                    </div>

                    {/* Windows & Thresholds */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <h4 className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                                <div className="w-1 h-1 rounded-full bg-indigo-500" />
                                Synchronized Windows
                            </h4>
                            <div className="p-4 rounded-2xl bg-foreground/[0.02] border border-card-border space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className={labelClass}>Check-in Open</label>
                                        <CustomTimePicker
                                            value={toTimeValue(form.check_in_open_time)}
                                            onChange={val => setForm(f => ({ ...f, check_in_open_time: fromTimeValue(val) }))}
                                        />
                                    </div>
                                    <div>
                                        <label className={labelClass}>Check-in Close</label>
                                        <CustomTimePicker
                                            value={toTimeValue(form.check_in_close_time)}
                                            onChange={val => setForm(f => ({ ...f, check_in_close_time: fromTimeValue(val) }))}
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className={labelClass}>Shift Start</label>
                                        <CustomTimePicker
                                            value={toTimeValue(form.work_start_time)}
                                            onChange={val => setForm(f => ({ ...f, work_start_time: fromTimeValue(val) }))}
                                        />
                                    </div>
                                    <div>
                                        <label className={labelClass}>Shift End</label>
                                        <CustomTimePicker
                                            value={toTimeValue(form.work_end_time)}
                                            onChange={val => setForm(f => ({ ...f, work_end_time: fromTimeValue(val) }))}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h4 className="text-[9px] font-bold text-amber-400 uppercase tracking-widest flex items-center gap-2">
                                <div className="w-1 h-1 rounded-full bg-amber-500" />
                                Grace Thresholds (Min)
                            </h4>
                            <div className="p-4 rounded-2xl bg-foreground/[0.02] border border-card-border space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className={labelClass}>Temp. Out</label>
                                        <input
                                            type="number"
                                            value={form.temporarily_out_grace_minutes}
                                            onChange={e => setForm(f => ({ ...f, temporarily_out_grace_minutes: parseInt(e.target.value) || 0 }))}
                                            className={inputClass}
                                        />
                                    </div>
                                    <div>
                                        <label className={labelClass}>Exclusion</label>
                                        <input
                                            type="number"
                                            value={form.out_of_office_grace_minutes}
                                            onChange={e => setForm(f => ({ ...f, out_of_office_grace_minutes: parseInt(e.target.value) || 0 }))}
                                            className={inputClass}
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className={labelClass}>Return Pulse</label>
                                        <input
                                            type="number"
                                            value={form.return_to_office_confirmation_minutes}
                                            onChange={e => setForm(f => ({ ...f, return_to_office_confirmation_minutes: parseInt(e.target.value) || 0 }))}
                                            className={inputClass}
                                        />
                                    </div>
                                    <div>
                                        <label className={labelClass}>Auto-Out</label>
                                        <CustomTimePicker
                                            value={toTimeValue(form.auto_clock_out_time)}
                                            onChange={val => setForm(f => ({ ...f, auto_clock_out_time: fromTimeValue(val) }))}
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className={labelClass}>Auto-In Delay</label>
                                        <input
                                            type="number"
                                            value={form.auto_clock_in_delay_minutes}
                                            onChange={e => setForm(f => ({ ...f, auto_clock_in_delay_minutes: parseInt(e.target.value) || 0 }))}
                                            className={inputClass}
                                        />
                                    </div>
                                    <div>
                                        <label className={labelClass}>Audit Interval</label>
                                        <input
                                            type="number"
                                            value={form.presence_audit_interval_minutes}
                                            onChange={e => setForm(f => ({ ...f, presence_audit_interval_minutes: parseInt(e.target.value) || 0 }))}
                                            className={inputClass}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Save */}
                    <div className="pt-2">
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="flex items-center gap-2 px-6 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all disabled:opacity-50"
                        >
                            <FiCheck className="w-3.5 h-3.5" />
                            {isSaving ? 'Synchronizing...' : 'Commit Policy'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
