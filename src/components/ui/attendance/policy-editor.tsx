'use client';

import React, { useState, useEffect, useTransition } from 'react';
import type { OfficeLocation, AttendancePolicy } from '@/types/attendance';
import { getAttendancePolicy, updateAttendancePolicy } from '@/app/(dashboard)/[orgSlug]/attendance/actions';
import { FiSettings, FiCheck } from 'react-icons/fi';
import { toast } from '@/lib/toast';
import { Toggle } from '@/components/ui/inputs/toggle';
import { CustomTimePicker } from '@/components/ui/inputs/custom-time-picker';

import { BusyIcon, useButtonStatus } from '@/components/ui/busy-icon';
export default function PolicyEditor({ officeLocationId }: { officeLocationId: number }) {
    const [policy, setPolicy] = useState<AttendancePolicy | null>(null);
    const [isPending, startTransition] = useTransition();
    const [isSaving, setIsSaving] = useState(false);
    const saveStatus = useButtonStatus();
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
        saveStatus.start();
        const result = await updateAttendancePolicy(officeLocationId, form);
        if (result.success) {
            toast.success('Policy updated');
            void saveStatus.succeed();
        } else {
            toast.error(result.error || 'Failed to update policy');
            saveStatus.reset();
        }
        setIsSaving(false);
    };

    const inputClass = "h-11 w-full rounded-full border border-card-border bg-input-bg px-4 text-sm text-foreground transition-colors placeholder:text-text-muted/50 font-numbers";
    const labelClass = "mb-1.5 ml-3 block text-xs font-medium text-text-muted";

    // Helper to strip :SS for HTML time input
    const toTimeValue = (val: string | null) => val ? val.substring(0, 5) : '';
    // Helper to add :00 back for API
    const fromTimeValue = (val: string) => `${val}:00`;

    return (
        <div className="space-y-5 rounded-[28px] bg-card p-5 sm:p-6">
            <div className="flex items-center gap-3 border-b border-card-border pb-4">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-accent/12 text-accent-text">
                    <FiSettings className="h-4 w-4" />
                </div>
                <div>
                    <h3 className="text-base font-semibold text-foreground">Attendance policy</h3>
                    <p className="mt-0.5 text-xs text-text-muted">Automations, time windows and grace periods</p>
                </div>
            </div>

            {isPending ? (
                <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="h-14 rounded-full bg-foreground/[0.04] animate-pulse" />
                    ))}
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Automation Toggles */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="flex items-center justify-between gap-3 rounded-full bg-foreground/[0.03] py-3 pl-5 pr-3">
                            <div>
                                <p className="text-sm font-medium text-foreground">Auto clock-in</p>
                                <p className="mt-0.5 text-xs text-text-muted">Triggered by the geofence</p>
                            </div>
                            <Toggle
                                label="Auto clock-in"
                                isChecked={form.auto_clock_in}
                                onChange={(next) => setForm(f => ({ ...f, auto_clock_in: next }))}
                            />
                        </div>
                        <div className="flex items-center justify-between gap-3 rounded-full bg-foreground/[0.03] py-3 pl-5 pr-3">
                            <div>
                                <p className="text-sm font-medium text-foreground">Auto clock-out</p>
                                <p className="mt-0.5 text-xs text-text-muted">Triggered by the geofence</p>
                            </div>
                            <Toggle
                                label="Auto clock-out"
                                isChecked={form.auto_clock_out}
                                onChange={(next) => setForm(f => ({ ...f, auto_clock_out: next }))}
                            />
                        </div>
                    </div>

                    {/* Windows & Thresholds */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <h4 className="ml-1 flex items-center gap-2 text-sm font-medium text-foreground">
                                <span className="h-2 w-2 rounded-full bg-accent" />
                                Time windows
                            </h4>
                            <div className="space-y-4 rounded-[24px] bg-foreground/[0.03] p-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className={labelClass}>Check-in opens</label>
                                        <CustomTimePicker
                                            value={toTimeValue(form.check_in_open_time)}
                                            onChange={val => setForm(f => ({ ...f, check_in_open_time: fromTimeValue(val) }))}
                                        />
                                    </div>
                                    <div>
                                        <label className={labelClass}>Check-in closes</label>
                                        <CustomTimePicker
                                            value={toTimeValue(form.check_in_close_time)}
                                            onChange={val => setForm(f => ({ ...f, check_in_close_time: fromTimeValue(val) }))}
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className={labelClass}>Shift start</label>
                                        <CustomTimePicker
                                            value={toTimeValue(form.work_start_time)}
                                            onChange={val => setForm(f => ({ ...f, work_start_time: fromTimeValue(val) }))}
                                        />
                                    </div>
                                    <div>
                                        <label className={labelClass}>Shift end</label>
                                        <CustomTimePicker
                                            value={toTimeValue(form.work_end_time)}
                                            onChange={val => setForm(f => ({ ...f, work_end_time: fromTimeValue(val) }))}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h4 className="ml-1 flex items-center gap-2 text-sm font-medium text-foreground">
                                <span className="h-2 w-2 rounded-full bg-warning" />
                                Grace periods <span className="font-normal text-text-muted">(minutes)</span>
                            </h4>
                            <div className="space-y-4 rounded-[24px] bg-foreground/[0.03] p-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className={labelClass}>Temporarily out</label>
                                        <input
                                            type="number"
                                            value={form.temporarily_out_grace_minutes}
                                            onChange={e => setForm(f => ({ ...f, temporarily_out_grace_minutes: parseInt(e.target.value) || 0 }))}
                                            className={inputClass}
                                        />
                                    </div>
                                    <div>
                                        <label className={labelClass}>Out of office</label>
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
                                        <label className={labelClass}>Return pulse</label>
                                        <input
                                            type="number"
                                            value={form.return_to_office_confirmation_minutes}
                                            onChange={e => setForm(f => ({ ...f, return_to_office_confirmation_minutes: parseInt(e.target.value) || 0 }))}
                                            className={inputClass}
                                        />
                                    </div>
                                    <div>
                                        <label className={labelClass}>Auto clock-out at</label>
                                        <CustomTimePicker
                                            value={toTimeValue(form.auto_clock_out_time)}
                                            onChange={val => setForm(f => ({ ...f, auto_clock_out_time: fromTimeValue(val) }))}
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className={labelClass}>Auto clock-in delay</label>
                                        <input
                                            type="number"
                                            value={form.auto_clock_in_delay_minutes}
                                            onChange={e => setForm(f => ({ ...f, auto_clock_in_delay_minutes: parseInt(e.target.value) || 0 }))}
                                            className={inputClass}
                                        />
                                    </div>
                                    <div>
                                        <label className={labelClass}>Audit interval</label>
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
                    <div className="flex justify-end border-t border-card-border pt-4">
                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={isSaving}
                            aria-busy={isSaving}
                            className="md-btn md-btn-primary disabled:cursor-wait"
                        >
                            {isSaving ? 'Saving…' : 'Save policy'}
                            <span className="md-btn-chip"><BusyIcon state={saveStatus.state} icon={<FiCheck />} /></span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
