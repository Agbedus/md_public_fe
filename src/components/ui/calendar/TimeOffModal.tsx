"use client";
import React, { useState } from "react";
import { FiX, FiCalendar, FiCheck } from "react-icons/fi";
import { createTimeOffRequest } from "@/app/(dashboard)/[orgSlug]/time-off/actions";
import type { TimeOffRequest, TimeOffType } from "@/types/time-off";
import { CustomDatePicker } from "@/components/ui/inputs/custom-date-picker";
import { format } from "date-fns";
import { toast } from "@/lib/toast";

interface TimeOffModalProps {
    open: boolean;
    onClose: () => void;
    onCreated: () => void;
}

const TIME_OFF_TYPES: { value: TimeOffType; label: string; description: string }[] = [
    { value: 'leave', label: 'Leave', description: 'Annual leave (max 15 days/year)' },
    { value: 'off', label: 'Day Off', description: 'Personal day off' },
    { value: 'sick', label: 'Sick Leave', description: 'Medical absence' },
    { value: 'other', label: 'Other', description: 'Other absence type' },
];

export default function TimeOffModal({ open, onClose, onCreated }: TimeOffModalProps) {
    const [type, setType] = useState<TimeOffType>('leave');
    const [startDate, setStartDate] = useState<Date | null>(null);
    const [endDate, setEndDate] = useState<Date | null>(null);
    const [justification, setJustification] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const requiresJustification = type !== 'leave';

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!startDate || !endDate) {
            toast.error('Please select start and end dates');
            return;
        }
        if (requiresJustification && !justification.trim()) {
            toast.error('Justification is required for this type');
            return;
        }

        setIsSubmitting(true);
        try {
            const formData = new FormData();
            formData.set('type', type);
            formData.set('start_date', format(startDate, 'yyyy-MM-dd'));
            formData.set('end_date', format(endDate, 'yyyy-MM-dd'));
            if (justification.trim()) {
                formData.set('justification', justification.trim());
            }

            const result = await createTimeOffRequest(formData);
            if (result.success) {
                toast.success('Time-off request submitted');
                onCreated();
                onClose();
                // Reset
                setType('leave');
                setStartDate(null);
                setEndDate(null);
                setJustification('');
            } else {
                toast.error(result.error || 'Failed to submit request');
            }
        } catch {
            toast.error('An unexpected error occurred');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) onClose();
    };

    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-white/60 dark:bg-black/60 backdrop-blur-md transition-opacity"
                onClick={onClose}
            />

            <div className="relative bg-background border border-card-border w-full max-w-lg mx-4 rounded-[2.5rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-8 py-5 border-b border-card-border bg-foreground/[0.03]">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                            <FiCalendar className="w-5 h-5 text-amber-600 dark:text-amber-500" />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-foreground uppercase tracking-tight italic">Request Temporal Leave</h2>
                            <p className="text-[10px] text-text-muted font-black uppercase tracking-widest mt-0.5">Submit for administrative review</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2.5 rounded-xl hover:bg-foreground/[0.05] text-text-secondary hover:text-foreground transition-all border border-transparent hover:border-card-border">
                        <FiX className="w-5 h-5" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    {/* Type */}
                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-1">Exemption Protocol</label>
                        <div className="grid grid-cols-2 gap-3">
                            {TIME_OFF_TYPES.map(t => (
                                <button
                                    key={t.value}
                                    type="button"
                                    onClick={() => setType(t.value)}
                                    className={`p-4 rounded-2xl border text-left transition-all duration-300 ${
                                        type === t.value
                                            ? 'bg-amber-500/10 border-amber-500/40 text-amber-700 dark:text-amber-400 shadow-sm'
                                            : 'bg-foreground/[0.03] border-card-border text-text-muted hover:border-foreground/10 hover:text-foreground'
                                    }`}
                                >
                                    <div className="text-[11px] font-black uppercase tracking-wider">{t.label}</div>
                                    <div className="text-[9px] mt-1 font-bold opacity-70 leading-relaxed uppercase tracking-tight">{t.description}</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Date Range */}
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-1">Commencement</label>
                            <CustomDatePicker
                                value={startDate}
                                onChange={setStartDate}
                                placeholder="Select date"
                                className="w-full"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-1">Termination</label>
                            <CustomDatePicker
                                value={endDate}
                                onChange={setEndDate}
                                placeholder="Select date"
                                className="w-full"
                                minDate={startDate || undefined}
                            />
                        </div>
                    </div>

                    {/* Justification */}
                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-1">
                            Operational Justification {requiresJustification && <span className="text-amber-500">*</span>}
                        </label>
                        <textarea
                            value={justification}
                            onChange={e => setJustification(e.target.value)}
                            placeholder={requiresJustification ? "Critical briefing required..." : "Optional context..."}
                            rows={3}
                            className="w-full bg-foreground/[0.03] border border-card-border rounded-2xl px-4 py-3 text-foreground placeholder:text-text-muted/50 text-sm font-bold resize-none focus:outline-none focus:border-amber-500/30 transition-all custom-scrollbar"
                        />
                    </div>

                    {/* Submit */}
                    <div className="flex justify-end gap-3 pt-4 border-t border-card-border mt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest text-text-secondary hover:text-foreground bg-foreground/[0.03] hover:bg-foreground/[0.06] border border-card-border transition-all"
                        >
                            Abort
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex items-center gap-2 px-8 py-2.5 rounded-xl bg-amber-500 text-zinc-950 hover:bg-amber-400 text-[11px] font-black uppercase tracking-widest transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50"
                        >
                            {isSubmitting ? (
                                <div className="h-4 w-4 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <FiCheck className="w-4 h-4" />
                            )}
                            Execute Request
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
