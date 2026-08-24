"use client";
import React, { useRef, useState } from "react";
import { FiX, FiCalendar, FiCheck, FiLoader, FiPaperclip, FiFileText } from "react-icons/fi";
import { createTimeOffRequest } from "@/app/(dashboard)/[orgSlug]/time-off/actions";
import type { TimeOffRequest, TimeOffType } from "@/types/time-off";
import { CustomDatePicker } from "@/components/ui/inputs/custom-date-picker";
import { format } from "date-fns";
import { toast } from "@/lib/toast";

interface TimeOffModalProps {
    open: boolean;
    onClose: () => void;
    onCreated: (request: TimeOffRequest | null) => void;
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
    const [attachment, setAttachment] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

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
        if (attachment && (attachment.type !== 'application/pdf' || !attachment.name.toLowerCase().endsWith('.pdf'))) {
            toast.error('Only PDF attachments are accepted');
            return;
        }
        if (attachment && attachment.size > 2 * 1024 * 1024) {
            toast.error('The PDF must not exceed 2 MB');
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
            if (attachment) formData.set('attachment', attachment);

            const result = await createTimeOffRequest(formData);
            if (result.success) {
                toast.success('Time-off request submitted');
                onCreated(result.data);
                onClose();
                // Reset
                setType('leave');
                setStartDate(null);
                setEndDate(null);
                setJustification('');
                setAttachment(null);
                if (fileInputRef.current) fileInputRef.current.value = '';
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

            <div className="relative mx-4 max-h-[calc(100dvh-2rem)] w-full max-w-2xl overflow-y-auto rounded-2xl border border-card-border bg-background shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-card-border bg-card px-4 py-3.5 sm:px-5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                            <FiCalendar className="w-5 h-5 text-amber-600 dark:text-amber-500" />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-foreground uppercase tracking-tight italic">Request Temporal Leave</h2>
                            <p className="text-[10px] text-text-muted font-black uppercase tracking-widest mt-0.5">Submit for administrative review</p>
                        </div>
                    </div>
                    <button onClick={onClose} disabled={isSubmitting} aria-label="Close time-off request" className="grid h-11 w-11 place-items-center rounded-md border border-transparent text-text-secondary transition-[transform,opacity,background-color] duration-150 hover:border-card-border hover:bg-foreground/[0.05] hover:text-foreground active:scale-[0.98] disabled:cursor-wait disabled:opacity-50">
                        <FiX className="w-5 h-5" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4 p-4 sm:p-5">
                    {/* Type */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-1">Exemptions</label>
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                            {TIME_OFF_TYPES.map(t => (
                                <button
                                    key={t.value}
                                    type="button"
                                    onClick={() => setType(t.value)}
                                    className={`min-h-11 rounded-lg border p-3 text-left transition-[transform,color,background-color,border-color] duration-150 active:scale-[0.98] ${
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
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-1">
                            Operational Justification {requiresJustification && <span className="text-amber-500">*</span>}
                        </label>
                        <textarea
                            value={justification}
                            onChange={e => setJustification(e.target.value)}
                            placeholder={requiresJustification ? "Critical briefing required..." : "Optional context..."}
                            rows={5}
                            className="min-h-32 w-full resize-y rounded-xl border border-card-border bg-input-bg px-4 py-3 text-sm text-foreground placeholder:text-text-muted/50 focus:border-amber-500/40 focus:outline-none focus:ring-2 focus:ring-amber-500/10 custom-scrollbar"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="ml-1 text-[10px] font-black uppercase tracking-[0.2em] text-text-muted">
                            Supporting document <span className="normal-case tracking-normal opacity-70">(optional)</span>
                        </label>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="application/pdf,.pdf"
                            className="sr-only"
                            onChange={(event) => {
                                const file = event.target.files?.[0] || null;
                                if (!file) return setAttachment(null);
                                if (file.type !== 'application/pdf' || !file.name.toLowerCase().endsWith('.pdf')) {
                                    toast.error('Only PDF attachments are accepted');
                                    event.target.value = '';
                                    return;
                                }
                                if (file.size > 2 * 1024 * 1024) {
                                    toast.error('The PDF must not exceed 2 MB');
                                    event.target.value = '';
                                    return;
                                }
                                setAttachment(file);
                            }}
                        />
                        {attachment ? (
                            <div className="flex min-h-11 items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] px-3 py-2">
                                <FiFileText className="h-4 w-4 shrink-0 text-emerald-500" />
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-xs font-medium text-foreground">{attachment.name}</p>
                                    <p className="text-[10px] text-text-muted">{(attachment.size / 1024).toFixed(0)} KB · PDF</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setAttachment(null);
                                        if (fileInputRef.current) fileInputRef.current.value = '';
                                    }}
                                    className="grid h-9 w-9 place-items-center rounded-md text-text-muted transition-colors hover:bg-foreground/[0.06] hover:text-foreground"
                                    aria-label="Remove attachment"
                                >
                                    <FiX className="h-4 w-4" />
                                </button>
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-card-border bg-input-bg px-4 py-2.5 text-xs font-medium text-text-secondary transition-colors hover:border-foreground/15 hover:bg-foreground/[0.04] hover:text-foreground"
                            >
                                <FiPaperclip className="h-4 w-4" />
                                Attach PDF
                                <span className="text-[10px] text-text-muted">Maximum 2 MB</span>
                            </button>
                        )}
                    </div>

                    {/* Submit */}
                    <div className="flex justify-end gap-3 border-t border-card-border pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="min-h-11 px-6 py-2.5 rounded-md text-xs font-semibold text-text-secondary hover:text-foreground bg-foreground/[0.03] hover:bg-foreground/[0.06] border border-card-border transition-[transform,opacity,background-color] duration-150 active:scale-[0.98] disabled:cursor-wait disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            aria-busy={isSubmitting}
                            className="flex min-h-11 items-center gap-2 rounded-md bg-emerald-500 px-6 py-2.5 text-sm font-semibold text-white transition-[transform,opacity,background-color] duration-150 hover:bg-emerald-500/90 active:scale-[0.98] disabled:cursor-wait disabled:opacity-70"
                        >
                            {isSubmitting ? (
                                <FiLoader className="h-4 w-4 animate-spin" />
                            ) : (
                                <FiCheck className="w-4 h-4" />
                            )}
                            {isSubmitting ? 'Submitting request…' : 'Submit request'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
