"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiArrowRight, FiArrowLeft, FiCheck } from "react-icons/fi";
import { submitWaitlist } from "@/app/lib/waitlist-actions";
import { toast } from "@/lib/toast";
import type { WaitlistData } from "@/types/waitlist";

const ROLE_OPTIONS = [
    "C-Level Executive",
    "VP / Director",
    "Manager",
    "Team Lead",
    "Individual Contributor",
    "Consultant",
    "Founder / Owner",
    "Other",
];

const SOURCE_OPTIONS = [
    "LinkedIn",
    "Twitter / X",
    "Google Search",
    "Friend / Referral",
    "Conference / Event",
    "Blog / Article",
    "Podcast",
    "Other",
];

const STEP_LABELS = [
    "Tell us about yourself",
    "What\u2019s your role?",
    "Where did you hear about us?",
    "How can we reach you?",
    "Almost done!",
] as const;

const INITIAL_DATA: WaitlistData = {
    name: "",
    company: "",
    role: "",
    source: "",
    phone: "",
    email: "",
};

const slideAnim = {
    initial: { opacity: 0, x: 24 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -24 },
    transition: { duration: 0.25, ease: [0.23, 1, 0.32, 1] as const },
};

export default function WaitlistForm() {
    const [step, setStep] = useState(0);
    const [data, setData] = useState<WaitlistData>(INITIAL_DATA);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const update = (field: keyof WaitlistData, value: string) => {
        setData(prev => ({ ...prev, [field]: value }));
    };

    const canProceed = () => {
        switch (step) {
            case 0: return data.name.trim().length > 0 && data.company.trim().length > 0;
            case 1: return data.role.length > 0;
            case 2: return data.source.length > 0;
            case 3: return data.phone.trim().length > 0;
            case 4: return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email);
            default: return false;
        }
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            const result = await submitWaitlist({
                name: data.name,
                company: data.company,
                role: data.role,
                source: data.source,
                phone: data.phone,
                email: data.email,
            });
            if (result.success) {
                toast.success("You\u2019re on the waitlist! We\u2019ll be in touch soon.");
                setData(INITIAL_DATA);
                setStep(0);
            } else {
                toast.error(result.error || "Something went wrong. Please try again.");
            }
        } catch {
            toast.error("Network error. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const nextStep = (e: React.MouseEvent) => {
        e.preventDefault();
        if (step < 4 && canProceed()) setStep(s => s + 1);
    };

    const prevStep = (e: React.MouseEvent) => {
        e.preventDefault();
        if (step > 0) setStep(s => s - 1);
    };

    const renderStep = () => {
        switch (step) {
            case 0:
                return (
                    <motion.div key="step-0" {...slideAnim} className="space-y-4">
                        <input
                            type="text"
                            placeholder="Your full name"
                            value={data.name}
                            onChange={e => update("name", e.target.value)}
                            className="w-full px-6 py-4 rounded-full bg-white/[0.02] border border-white/10 text-white placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/50 focus:bg-white/[0.04] text-xs transition-all"
                        />
                        <input
                            type="text"
                            placeholder="Company name"
                            value={data.company}
                            onChange={e => update("company", e.target.value)}
                            className="w-full px-6 py-4 rounded-full bg-white/[0.02] border border-white/10 text-white placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/50 focus:bg-white/[0.04] text-xs transition-all"
                        />
                    </motion.div>
                );
            case 1:
                return (
                    <motion.div key="step-1" {...slideAnim} className="flex flex-wrap justify-center gap-2.5">
                        {ROLE_OPTIONS.map(role => (
                            <button
                                key={role}
                                type="button"
                                onClick={() => update("role", role)}
                                className={`px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${
                                    data.role === role
                                        ? "bg-indigo-500/20 border border-indigo-500/50 text-indigo-300"
                                        : "bg-white/[0.02] border border-white/10 text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-300"
                                }`}
                            >
                                {data.role === role && <FiCheck className="inline mr-1.5 -mt-0.5" />}
                                {role}
                            </button>
                        ))}
                    </motion.div>
                );
            case 2:
                return (
                    <motion.div key="step-2" {...slideAnim} className="flex flex-wrap justify-center gap-2.5">
                        {SOURCE_OPTIONS.map(source => (
                            <button
                                key={source}
                                type="button"
                                onClick={() => update("source", source)}
                                className={`px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${
                                    data.source === source
                                        ? "bg-indigo-500/20 border border-indigo-500/50 text-indigo-300"
                                        : "bg-white/[0.02] border border-white/10 text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-300"
                                }`}
                            >
                                {data.source === source && <FiCheck className="inline mr-1.5 -mt-0.5" />}
                                {source}
                            </button>
                        ))}
                    </motion.div>
                );
            case 3:
                return (
                    <motion.div key="step-3" {...slideAnim}>
                        <input
                            type="tel"
                            placeholder="Phone number"
                            value={data.phone}
                            onChange={e => update("phone", e.target.value)}
                            className="w-full px-6 py-4 rounded-full bg-white/[0.02] border border-white/10 text-white placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/50 focus:bg-white/[0.04] text-xs transition-all"
                        />
                    </motion.div>
                );
            case 4:
                return (
                    <motion.div key="step-4" {...slideAnim}>
                        <input
                            type="email"
                            placeholder="Email address for updates"
                            value={data.email}
                            onChange={e => update("email", e.target.value)}
                            className="w-full px-6 py-4 rounded-full bg-white/[0.02] border border-white/10 text-white placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/50 focus:bg-white/[0.04] text-xs transition-all"
                        />
                    </motion.div>
                );
        }
    };

    return (
        <div className="max-w-lg mx-auto">
            <p className="text-zinc-400 text-xs font-dm-sans text-center mb-6">
                Step {step + 1} of 5 &mdash; {STEP_LABELS[step]}
            </p>

            <form onSubmit={e => { e.preventDefault(); if (step === 4) handleSubmit(); }}>
                <div className="relative min-h-[140px]">
                    <AnimatePresence mode="wait">
                        {renderStep()}
                    </AnimatePresence>
                </div>

                {/* Dots */}
                <div className="flex justify-center gap-2 mt-6">
                    {[0, 1, 2, 3, 4].map(i => (
                        <div
                            key={i}
                            className={`h-1.5 rounded-full transition-all duration-300 ${
                                i === step
                                    ? "w-6 bg-indigo-500"
                                    : i < step
                                        ? "w-1.5 bg-indigo-500/40"
                                        : "w-1.5 bg-white/10"
                            }`}
                        />
                    ))}
                </div>

                <div className="flex items-center justify-between mt-6">
                    {step > 0 ? (
                        <button
                            type="button"
                            onClick={prevStep}
                            className="px-6 py-3 rounded-full border border-white/10 text-zinc-400 text-xs font-bold hover:bg-white/[0.04] hover:text-white transition-all flex items-center gap-2 font-sora uppercase tracking-wider"
                        >
                            <FiArrowLeft /> Back
                        </button>
                    ) : (
                        <div />
                    )}

                    {step < 4 ? (
                        <button
                            type="button"
                            onClick={nextStep}
                            disabled={!canProceed()}
                            className="px-6 py-3 rounded-full bg-white text-zinc-950 text-xs font-bold hover:bg-zinc-200 transition-all active:scale-[0.96] flex items-center gap-2 font-sora uppercase tracking-wider disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            Next <FiArrowRight />
                        </button>
                    ) : (
                        <button
                            type="submit"
                            disabled={!canProceed() || isSubmitting}
                            className="px-6 py-3 rounded-full bg-indigo-500 text-white text-xs font-bold hover:bg-indigo-400 transition-all active:scale-[0.96] flex items-center gap-2 font-sora uppercase tracking-wider disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? "Submitting\u2026" : "Join Waitlist"}
                        </button>
                    )}
                </div>
            </form>
        </div>
    );
}
