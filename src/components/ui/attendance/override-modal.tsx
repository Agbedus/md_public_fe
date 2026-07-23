'use client';

import React, { useState } from 'react';
import type { AttendanceRecord } from '@/types/attendance';
import { FiX, FiClock, FiCheck, FiCheckCircle, FiXCircle } from 'react-icons/fi';
import { toast } from '@/lib/toast';
import { CustomTimePicker } from '@/components/ui/inputs/custom-time-picker';

interface Props {
    record: AttendanceRecord;
    onClose: () => void;
    onOverride: (recordId: number, clockIn: string | null, clockOut: string | null) => Promise<void>;
}

export default function OverrideModal({ record, onClose, onOverride }: Props) {
    const clockInSource = record.clock_in_at || record.clock_in;
    const clockOutSource = record.clock_out_at || record.clock_out;
    const dateSource = record.work_date || record.date || '';

    const [clockIn, setClockIn] = useState(
        clockInSource ? new Date(clockInSource).toTimeString().slice(0, 5) : ''
    );
    const [clockOut, setClockOut] = useState(
        clockOutSource ? new Date(clockOutSource).toTimeString().slice(0, 5) : ''
    );
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            // Convert time inputs to full ISO strings using the record date
            const clockInISO = clockIn ? `${dateSource}T${clockIn}:00` : null;
            const clockOutISO = clockOut ? `${dateSource}T${clockOut}:00` : null;

            await onOverride(record.id, clockInISO, clockOutISO);
            toast.success('Attendance overridden successfully', {
                icon: <FiCheckCircle size={22} className="text-emerald-400" />
            });
        } catch {
            toast.error('Failed to override attendance', {
                icon: <FiXCircle size={22} className="text-rose-400" />
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full md:max-w-md bg-card/95 backdrop-blur-2xl border border-card-border rounded-t-2xl md:rounded-2xl overflow-hidden shadow-2xl flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-card-border bg-foreground/[0.03]">
                    <div>
                        <h3 className="text-sm font-bold text-foreground tracking-tight">Manual Override</h3>
                        <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest mt-0.5">
                            {record.userName || 'User'} · {dateSource ? new Date(dateSource + (dateSource.includes('T') ? '' : 'T00:00:00')).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'Today'}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-text-muted hover:text-foreground hover:bg-foreground/[0.06] transition-all"
                    >
                        <FiX className="w-4 h-4" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    <div className="grid grid-cols-1 gap-5">
                        <div className="space-y-2">
                            <label className="block text-[10px] font-bold text-text-muted uppercase tracking-widest ml-1">
                                <FiClock className="inline mr-1.5 text-indigo-400" />
                                Clock In Time
                            </label>
                            <CustomTimePicker
                                value={clockIn}
                                onChange={setClockIn}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="block text-[10px] font-bold text-text-muted uppercase tracking-widest ml-1">
                                <FiClock className="inline mr-1.5 text-rose-400" />
                                Clock Out Time
                            </label>
                            <CustomTimePicker
                                value={clockOut}
                                onChange={setClockOut}
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-3 pt-4 border-t border-card-border">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest text-text-muted bg-foreground/[0.03] border border-card-border hover:bg-foreground/[0.06] hover:text-foreground transition-all"
                        >
                            Terminate
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all disabled:opacity-50"
                        >
                            <FiCheck className="w-4 h-4" />
                            {isSubmitting ? 'Syncing...' : 'Commit'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
