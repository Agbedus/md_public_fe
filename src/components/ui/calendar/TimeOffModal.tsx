"use client";
import React, { useRef, useState } from "react";
import { FiX, FiCalendar, FiCheck, FiPaperclip, FiFileText, FiSun, FiCoffee, FiThermometer, FiMoreHorizontal } from "react-icons/fi";
import type { IconType } from "react-icons";
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

const TIME_OFF_TYPES: { value: TimeOffType; label: string; description: string; icon: IconType; tone: string }[] = [
    { value: 'leave', label: 'Leave', description: 'Annual leave, up to 15 days a year', icon: FiSun, tone: 'var(--accent)' },
    { value: 'off', label: 'Day off', description: 'A personal day', icon: FiCoffee, tone: 'var(--status-qa)' },
    { value: 'sick', label: 'Sick leave', description: 'Medical absence', icon: FiThermometer, tone: 'var(--danger)' },
    { value: 'other', label: 'Other', description: 'Any other absence', icon: FiMoreHorizontal, tone: 'var(--warning)' },
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

            <div className="relative max-h-[calc(100dvh-2rem)] w-full max-w-2xl overflow-y-auto rounded-[28px] border border-card-border bg-background">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-card-border px-5 py-4">
                    <div className="flex items-center gap-3">
                        <div className="grid h-10 w-10 place-items-center rounded-full bg-warning/15 text-warning-text">
                            <FiCalendar className="h-4 w-4" />
                        </div>
                        <div>
                            <h2 className="text-base font-semibold text-foreground">Request time off</h2>
                            <p className="mt-0.5 text-xs text-text-muted">Sent to an admin for review</p>
                        </div>
                    </div>
                    <button onClick={onClose} disabled={isSubmitting} aria-label="Close time-off request" className="grid h-10 w-10 place-items-center rounded-full text-text-muted transition-colors hover:bg-foreground/[0.06] hover:text-foreground disabled:cursor-wait disabled:opacity-50">
                        <FiX className="w-5 h-5" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-5 p-5">
                    {/* Type */}
                    <fieldset className="space-y-2">
                        <legend className="mb-2 ml-3 text-xs font-medium text-text-muted">Type</legend>
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4" role="radiogroup">
                            {TIME_OFF_TYPES.map(t => {
                                const isActive = type === t.value;
                                return (
                                    <button
                                        key={t.value}
                                        type="button"
                                        role="radio"
                                        aria-checked={isActive}
                                        onClick={() => setType(t.value)}
                                        className={`flex aspect-square flex-col justify-between rounded-[22px] p-4 text-left transition-[background-color,box-shadow,transform] duration-150 active:scale-[0.98] sm:aspect-[4/5] ${
                                            isActive
                                                ? 'bg-card ring-2 ring-accent'
                                                : 'bg-foreground/[0.04] hover:bg-foreground/[0.07]'
                                        }`}
                                    >
                                        <span className="flex items-start justify-between">
                                            <span className="grid h-10 w-10 place-items-center rounded-full" style={{ backgroundColor: `color-mix(in oklab, ${t.tone} 16%, transparent)`, color: t.tone }}>
                                                <t.icon className="h-[18px] w-[18px]" />
                                            </span>
                                            <span className={`grid h-5 w-5 place-items-center rounded-full transition-colors ${isActive ? 'bg-accent text-white' : 'border border-card-border'}`}>
                                                {isActive && <FiCheck className="h-3 w-3" />}
                                            </span>
                                        </span>
                                        <span>
                                            <span className="block text-sm font-semibold text-foreground">{t.label}</span>
                                            <span className="mt-1 block text-xs leading-snug text-text-muted">{t.description}</span>
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </fieldset>

                    {/* Date Range */}
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div className="space-y-2">
                            <label className="ml-3 text-xs font-medium text-text-muted">Start date</label>
                            <CustomDatePicker
                                value={startDate}
                                onChange={setStartDate}
                                placeholder="Select date"
                                className="w-full"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="ml-3 text-xs font-medium text-text-muted">End date</label>
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
                        <label className="ml-3 text-xs font-medium text-text-muted">
                            Reason {requiresJustification ? <span className="text-danger-text">*</span> : <span className="opacity-70">(optional)</span>}
                        </label>
                        <textarea
                            value={justification}
                            onChange={e => setJustification(e.target.value)}
                            placeholder={requiresJustification ? "Tell your admin why you need this time" : "Anything your admin should know"}
                            rows={5}
                            className="min-h-32 w-full resize-y border border-card-border bg-input-bg px-4 py-3 text-sm text-foreground placeholder:text-text-muted/50 custom-scrollbar"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="ml-3 text-xs font-medium text-text-muted">
                            Supporting document <span className="opacity-70">(optional)</span>
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
                            <div className="flex min-h-11 items-center gap-3 rounded-full bg-success/10 py-2 pl-4 pr-1.5">
                                <FiFileText className="h-4 w-4 shrink-0 text-success-text" />
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-xs font-medium text-foreground">{attachment.name}</p>
                                    <p className="text-xs text-text-muted">{(attachment.size / 1024).toFixed(0)} KB · PDF</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setAttachment(null);
                                        if (fileInputRef.current) fileInputRef.current.value = '';
                                    }}
                                    className="grid h-9 w-9 place-items-center text-text-muted transition-colors hover:bg-foreground/[0.06] hover:text-foreground rounded-full"
                                    aria-label="Remove attachment"
                                >
                                    <FiX className="h-4 w-4" />
                                </button>
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-dashed border-card-border px-4 py-2.5 text-sm text-text-secondary transition-colors hover:border-foreground/20 hover:text-foreground"
                            >
                                <FiPaperclip className="h-4 w-4" />
                                Attach PDF
                                <span className="text-xs text-text-muted">Maximum 2 MB</span>
                            </button>
                        )}
                    </div>

                    {/* Submit */}
                    <div className="flex flex-col-reverse gap-2 border-t border-card-border pt-4 sm:flex-row sm:justify-end">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="md-btn md-btn-secondary disabled:cursor-wait"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            aria-busy={isSubmitting}
                            className="md-btn md-btn-primary disabled:cursor-wait"
                        >
                            {isSubmitting ? 'Submitting request…' : 'Submit request'} <span className="md-btn-chip">{isSubmitting ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> : <FiCheck />}</span>

                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
