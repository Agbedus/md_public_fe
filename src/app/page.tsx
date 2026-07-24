"use client";

import React, { useState, useEffect, useRef, useLayoutEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { 
    FiArrowRight, 
    FiMenu, 
    FiX,
    FiCheck,
    FiShield,
    FiCpu,
    FiServer,
    FiChevronDown,
    FiHelpCircle,
    FiMapPin,
    FiClock,
    FiUsers,
    FiMessageSquare,
    FiCalendar,
    FiClipboard,
    FiLayers,
    FiTarget,
    FiStar,
    FiZap,
    FiBell,
    FiActivity,
    FiNavigation,
    FiGlobe,
    FiCommand,
    FiCrosshair,
    FiRadio,
    FiTrendingUp,
    FiAward
} from 'react-icons/fi';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import PipMascot from '@/components/ui/assistant/pip-mascot';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/dist/ScrollTrigger';

if (typeof window !== 'undefined') {
    gsap.registerPlugin(ScrollTrigger);
}

export default function LandingPage() {
    const [activeTab, setActiveTab] = useState('Dashboard');
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [billingCycle, setBillingCycle] = useState('Monthly');
    const [activeFaq, setActiveFaq] = useState<number | null>(null);

    const reduceMotion = useReducedMotion();

    // Entry motion carries hierarchy: the eye lands on the headline, then the
    // subtext, then the CTAs. Under reduced motion it collapses to a plain
    // render rather than animating anything.
    const fadeIn = reduceMotion
        ? { initial: false as const, animate: { opacity: 1, y: 0 } }
        : {
            initial: { opacity: 0, y: 15 },
            animate: { opacity: 1, y: 0 },
            transition: { duration: 0.5, ease: [0.23, 1, 0.32, 1] as const }
        };

    // Scroll reveal for section content below the fold.
    const revealOnScroll = reduceMotion
        ? {}
        : {
            initial: { opacity: 0, y: 24 },
            whileInView: { opacity: 1, y: 0 },
            viewport: { once: true, amount: 0.25 },
            transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const }
        };

    const containerRef = useRef<HTMLDivElement>(null);
    const zoomRef = useRef<HTMLDivElement>(null);

    const pipVariants = ['cyber', 'smart', 'classic', 'cool', 'shocked', 'spicy', 'lovely', 'sleepy'] as const;
    type PipVariant = typeof pipVariants[number];
    const [pipVariant, setPipVariant] = useState<PipVariant>('cyber');

    useEffect(() => {
        const interval = setInterval(() => {
            setPipVariant(prev => {
                const idx = pipVariants.indexOf(prev);
                return pipVariants[(idx + 1) % pipVariants.length];
            });
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        fetch('/api/auth/session')
            .then(res => {
                const contentType = res.headers.get("content-type");
                if (contentType && contentType.indexOf("application/json") !== -1) {
                    return res.json();
                }
                return null;
            })
            .then(session => {
                if (!session) return;
                const searchParams = new URLSearchParams(window.location.search);
                if (Object.keys(session).length > 0 && searchParams.get('home') !== 'true') {
                    window.location.href = '/dashboard';
                }
            })
            .catch(() => {});
    }, []);

    useLayoutEffect(() => {
        // The pinned zoom is the one scroll hijack on this page. It earns its
        // place by walking through the product surfaces in sequence, but it must
        // not run for people who have asked for less motion.
        if (reduceMotion) return;

        const ctx = gsap.context(() => {
            const tl = gsap.timeline({
                scrollTrigger: {
                    trigger: containerRef.current,
                    // The nav is a fixed pill occupying ~76px from the top of the
                    // viewport. Pinning at "top top" parked the showcase flush
                    // against the viewport edge, so its top slid underneath the
                    // nav. Offsetting the pin start leaves a clear gap below it.
                    start: "top top+=96",
                    end: "+=300%",
                    scrub: 0.5,
                    pin: true,
                    anticipatePin: 1,
                    snap: [0, 1/5.5, 2/5.5, 3/5.5, 4/5.5, 5/5.5, 1],
                }
            });

            // Zoom IN as the section is scrolled past: the showcase starts a touch
            // back and pushes toward the viewer. The previous version widened the
            // frame from max-w-5xl out to 100%, which reads as pulling back rather
            // than moving closer. The hero section clips overflow, so the scale-up
            // crops into the frame instead of spilling sideways.
            // Growing from the top edge rather than the centre keeps the top of the
            // showcase parked below the nav. With a centre origin the element
            // expanded upward as well, which is what pushed it back under the nav.
            tl.fromTo(zoomRef.current,
                { scale: 0.94, transformOrigin: "center top" },
                // Capped so the frame still fits the viewport at full zoom: with the
                // top parked ~147px down, anything past ~1.10 pushes the bottom of
                // the showcase off-screen.
                { scale: 1.08, duration: 1, ease: "power2.inOut", transformOrigin: "center top" }
            );

            const screens = ['Dashboard', 'Tasks', 'Notes', 'Users', 'Time Off'];
            screens.forEach((screen, index) => {
                if (index > 0) {
                    tl.to(`.screen-${index}`, {
                        opacity: 1,
                        duration: 1,
                        onStart: () => setActiveTab(screen),
                        onReverseComplete: () => setActiveTab(screens[index-1])
                    }, `screen-${index}`);
                }
            });

            tl.to({}, { duration: 0.5 });

        }, containerRef);
        return () => ctx.revert();
    }, [reduceMotion]);

    const faqs = [
        {
            q: "How does the AI assistant protect my data?",
            a: "MD-Dash leverages NVIDIA cloud AI (Minimax-M3) for intelligent assistance while keeping your raw data secure. All dashboard data is processed through encrypted API calls, and your privacy remains protected."
        },
        {
            q: "How does attendance geo-fencing work?",
            a: "Admins define office perimeters as geo-fenced zones with configurable radiuses. When team members clock in via the mobile web app, GPS coordinates are cross-referenced against the defined boundaries. Three zones (In Office, Grace, and Out of Range) determine attendance status automatically."
        },
        {
            q: "What can Pip AI do for my team?",
            a: "Pip generates monthly productivity reports, answers operational questions, analyzes task completion rates, identifies bottlenecks, and provides proactive recommendations, all through natural conversation. Powered by NVIDIA NIM (Minimax-M3) with enterprise-grade encryption."
        },
        {
            q: "How is data sync secured across devices?",
            a: "Your data is encrypted at rest and in transit. Role-based access controls ensure team members only see what they need. No third-party access to your organizational data."
        }
    ];

    const sectionBg = "bg-[#0b0d12]";
    const sectionAlt = "bg-[#11141a]";

    return (
        <div className="min-h-screen bg-[#090a0c] text-white selection:bg-emerald-500/30 overflow-x-hidden">
            <div className="absolute top-0 inset-x-0 h-[80rem] pointer-events-none -z-10"
                style={{
                    backgroundImage: 'radial-gradient(circle at 30% 0%, rgba(16, 185, 129, 0.06) 0%, rgba(16, 185, 129, 0.01) 50%, transparent 60%), radial-gradient(circle at 70% 10%, rgba(99, 102, 241, 0.04) 0%, transparent 50%)'
                }}
            />
            <div className="absolute top-0 inset-x-0 h-[64rem] opacity-[0.02] pointer-events-none -z-10 bg-[linear-gradient(to_right,rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[size:4rem_4rem]" />

            {/* Navigation */}
            <nav className="fixed top-0 inset-x-0 z-50 transition-all duration-300 px-6 pt-6">
                <div className="max-w-5xl mx-auto rounded-full bg-[#13161b]/70 backdrop-blur-xl border border-white/[0.07] px-6 py-3 flex items-center justify-between shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] shadow-lg shadow-black/20">
                    <Link href="/" className="flex items-center gap-3">
                        <Image src="/logo.svg" alt="MD Logo" width={26} height={26} className="w-6.5 h-6.5" />
                        <span className="text-base font-bold tracking-tightest font-sora text-white">
                            MD<span className="text-emerald-400">Dash</span>
                        </span>
                    </Link>

                    <div className="hidden md:flex items-center gap-8 font-dm-sans text-xs font-semibold">
                        <Link href="#attendance" className="text-zinc-400 hover:text-white transition-colors">
                            Attendance
                        </Link>
                        <Link href="#pip-ai" className="text-zinc-400 hover:text-white transition-colors">
                            Pip AI
                        </Link>
                        <Link href="#features" className="text-zinc-400 hover:text-white transition-colors">
                            Features
                        </Link>
                        <Link href="#how-it-works" className="text-zinc-400 hover:text-white transition-colors">
                            How It Works
                        </Link>
                        <Link href="#pricing" className="text-zinc-400 hover:text-white transition-colors">
                            Pricing
                        </Link>
                        <div className="flex items-center gap-3 ml-4">
                            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                                <Link 
                                    href="/login"
                                    className="px-5 py-2 rounded-full border border-white/10 text-zinc-400 hover:text-white hover:border-white/20 hover:bg-white/[0.05] transition-all duration-300 text-sm font-semibold tracking-tight"
                                >
                                    Sign in
                                </Link>
                            </motion.div>
                            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                                <Link 
                                    href="/register"
                                    className="px-5 py-2 rounded-full bg-emerald-400 text-[#07090c] hover:bg-emerald-300 transition-colors duration-200 text-sm font-semibold tracking-tight"
                                >
                                    Get started
                                </Link>
                            </motion.div>
                        </div>
                    </div>

                    <button 
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        className="md:hidden text-zinc-400 hover:text-white transition-colors"
                    >
                        {mobileMenuOpen ? <FiX className="text-xl" /> : <FiMenu className="text-xl" />}
                    </button>
                </div>

                <AnimatePresence>
                    {mobileMenuOpen && (
                        <motion.div 
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                            className="md:hidden absolute top-20 left-6 right-6 p-6 rounded-3xl bg-[#13161b] border border-white/[0.08] shadow-2xl flex flex-col gap-4 font-dm-sans text-sm"
                        >
                            <Link href="#attendance" onClick={() => setMobileMenuOpen(false)} className="text-zinc-400 hover:text-white transition-colors py-2 border-b border-white/5 text-left">Attendance</Link>
                            <Link href="#pip-ai" onClick={() => setMobileMenuOpen(false)} className="text-zinc-400 hover:text-white transition-colors py-2 border-b border-white/5 text-left">Pip AI</Link>
                            <Link href="#features" onClick={() => setMobileMenuOpen(false)} className="text-zinc-400 hover:text-white transition-colors py-2 border-b border-white/5 text-left">Features</Link>
                            <Link href="#how-it-works" onClick={() => setMobileMenuOpen(false)} className="text-zinc-400 hover:text-white transition-colors py-2 border-b border-white/5 text-left">How It Works</Link>
                            <Link href="#pricing" onClick={() => setMobileMenuOpen(false)} className="text-zinc-400 hover:text-white transition-colors py-2 border-b border-white/5 text-left">Pricing</Link>
                            <Link href="/register" onClick={() => setMobileMenuOpen(false)} className="mt-2 w-full text-center px-4 py-3 rounded-full bg-white/[0.07] backdrop-blur-sm border border-white/20 text-white text-sm font-semibold tracking-tight block shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">Get started</Link>
                            <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="w-full text-center px-4 py-3 rounded-full border border-white/10 text-zinc-400 hover:text-white hover:border-white/20 hover:bg-white/[0.05] text-sm font-semibold tracking-tight block">Sign in</Link>
                        </motion.div>
                    )}
                </AnimatePresence>
            </nav>

            {/* Hero */}
            {/* The nav is a fixed pill: pt-6 (24px) + py-3 pill + ~30px content,
                so it occupies roughly 78px from the top of the viewport. The hero
                padding clears that and then adds real breathing room, rather than
                starting immediately underneath it. */}
            <section className="relative pt-40 md:pt-48 lg:pt-52 pb-20 px-6 overflow-hidden">
                <div className="max-w-6xl mx-auto text-center space-y-8">
                    {/* The Astryx reset that ships ahead of Tailwind's utility layer
                        overrides font-size on h1-h6, so `text-*` utilities placed
                        directly on a heading element are ignored (an h1 with
                        `text-5xl` still computes to the 24px UA size). Putting the
                        type utilities on an inner span keeps the semantic <h1> and
                        lets the size actually apply. */}
                    <motion.h1 {...fadeIn} className="font-sora">
                        <span className="block text-5xl leading-[1.05] font-bold tracking-tight text-white">
                            Run your team
                            <br />
                            from one place.
                        </span>
                    </motion.h1>

                    <motion.p
                        {...fadeIn}
                        transition={{ delay: 0.1 }}
                        className="max-w-xl mx-auto text-zinc-400 text-base md:text-lg leading-relaxed font-dm-sans"
                    >
                        Attendance, projects, tasks and time off in one workspace,
                        built for how teams actually work day to day.
                    </motion.p>

                    <motion.div
                        {...fadeIn}
                        transition={{ delay: 0.2 }}
                        className="flex flex-col md:flex-row items-center justify-center gap-4 pt-2"
                    >
                        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="w-full md:w-auto">
                            <Link 
                                href="/register"
                                className="w-full md:w-auto px-8 py-4 rounded-full bg-emerald-400 text-[#07090c] hover:bg-emerald-300 text-sm font-semibold tracking-tight flex items-center justify-center gap-2 group transition-colors duration-200 active:scale-[0.98]"
                            >
                                Create your account <FiArrowRight className="group-hover:translate-x-0.5 transition-transform" />
                            </Link>
                        </motion.div>
                        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="w-full md:w-auto">
                            <Link 
                                href="/login" 
                                className="w-full md:w-auto px-8 py-4 rounded-full border border-white/15 text-zinc-300 hover:text-white hover:border-white/30 hover:bg-white/[0.04] text-sm font-semibold tracking-tight transition-colors duration-200 active:scale-[0.98]"
                            >
                                Sign in
                            </Link>
                        </motion.div>
                    </motion.div>

                    {/* Interface Showcase */}
                    <div ref={containerRef} className="relative mt-20 pt-10 pb-36">
                        <div ref={zoomRef} className="relative mx-auto max-w-5xl">
                            <div className="absolute inset-0 bg-emerald-500/5 blur-[120px] rounded-[3rem] pointer-events-none -z-10" />
                            <div className="relative p-2 rounded-[2.5rem] bg-[#13161b]/50 backdrop-blur-xl border border-white/[0.08] overflow-hidden group shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                                <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000 pointer-events-none" />
                                <div className="rounded-[2rem] overflow-hidden border border-white/5 bg-[#090a0c]/60">
                                    <div className="h-14 border-b border-white/[0.06] bg-[#13161b]/50 flex items-center px-6 justify-between">
                                        <div className="flex gap-1.5">
                                            <div className="w-3 h-3 rounded-full bg-rose-500/40 border border-rose-400/30" />
                                            <div className="w-3 h-3 rounded-full bg-amber-500/40 border border-amber-400/30" />
                                            <div className="w-3 h-3 rounded-full bg-emerald-500/40 border border-emerald-400/30" />
                                        </div>
                                        <div className="flex items-center bg-white/[0.03] rounded-full p-1 border border-white/[0.06] relative z-30">
                                            {['Dashboard', 'Tasks', 'Notes', 'Users', 'Time Off'].map((tab) => (
                                                <button
                                                    key={tab}
                                                    onClick={(e) => { e.stopPropagation(); setActiveTab(tab); }}
                                                    className="px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all relative z-40 font-sora"
                                                    style={{ color: activeTab === tab ? '#09090b' : '#71717a' }}
                                                >
                                                    {activeTab === tab && (
                                                        <motion.div layoutId="active-showcase-tab" className="absolute inset-0 bg-white rounded-full -z-10" transition={{ type: "spring", stiffness: 380, damping: 30 }} />
                                                    )}
                                                    <span className="relative z-50">{tab}</span>
                                                </button>
                                            ))}
                                        </div>
                                        <div className="w-20 flex justify-end">
                                            <Image src="/logo.svg" alt="Logo" width={20} height={20} className="opacity-50" />
                                        </div>
                                    </div>
                                    <div className="aspect-[16/10] bg-[#0b0d12] relative overflow-hidden">
                                        {[
                                            { name: 'Dashboard', file: 'dashboard' },
                                            { name: 'Tasks', file: 'tasks' },
                                            { name: 'Notes', file: 'notes' },
                                            { name: 'Users', file: 'team' },
                                            { name: 'Time Off', file: 'approvals' }
                                        ].map((screen, index) => (
                                            <div 
                                                key={screen.name}
                                                className={`absolute inset-0 screen-${index} transition-all duration-300`}
                                                style={{ opacity: activeTab === screen.name ? 1 : 0, zIndex: index }}
                                            >
                                                <Image src={`/screenshots/${screen.file}.png`} alt={`${screen.name} Interface`} fill className="object-cover" priority={index === 0} />
                                            </div>
                                        ))}
                                        <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/[0.02] to-white/0 pointer-events-none z-20" />
                                        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-[#13161b] to-[#090a0c]" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Stats Bar */}
            <section className="py-20 px-6 border-t border-white/[0.04] bg-[#090a0c]/50">
                <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
                    {[
                        { value: "Attendance tracking", label: "Live, GPS verified" },
                        { value: "Pip assistant", label: "Answers in plain language" },
                        { value: "Geo-fencing", label: "Up to three zones per office" },
                        { value: "Access control", label: "Owner, admin, member, client" },
                    ].map((stat, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.1 }}
                            className="text-center space-y-1"
                        >
                            <p className="text-lg md:text-xl font-semibold text-white font-sora tracking-tight">{stat.value}</p>
                            <p className="text-sm text-zinc-500 font-dm-sans">{stat.label}</p>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* ── DEDICATED ATTENDANCE SECTION ── */}
            <section id="attendance" className={`py-40 px-6 relative overflow-hidden ${sectionAlt} border-t border-white/[0.04]`}>
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[600px] bg-emerald-500/3 blur-[120px] rounded-full pointer-events-none -z-10" />

                <div className="max-w-7xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="max-w-3xl space-y-6 mb-20"
                    >
                        <h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-[4.25rem] font-bold tracking-tight leading-[1.02] text-white font-sora">
                            Attendance that<br />
                            <span className="text-emerald-300">checks itself.</span>
                        </h2>
                        <p className="text-zinc-400 text-lg leading-relaxed font-dm-sans max-w-2xl">
                            Define office perimeters as geo-fenced zones. Team members clock in with automatic GPS validation.
                            Three concentric zones set attendance status automatically, so there is no manual entry and nothing to dispute.
                        </p>
                    </motion.div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.7 }}
                            className="relative"
                        >
                            <div className="relative aspect-square max-w-lg mx-auto w-full">
                                {/* Outer glow */}
                                <div className="absolute inset-0 rounded-full bg-rose-500/5 blur-[60px]" />
                                <div className="absolute inset-[15%] rounded-full bg-amber-500/5 blur-[40px]" />
                                <div className="absolute inset-[30%] rounded-full bg-emerald-500/10 blur-[30px]" />

                                {/* Crosshair lines */}
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-zinc-600/30 to-transparent" />
                                </div>
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <div className="h-full w-[1px] bg-gradient-to-b from-transparent via-zinc-600/30 to-transparent" />
                                </div>

                                {/* Diagonal crosshairs */}
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none rotate-45">
                                    <div className="w-full h-[1px] bg-zinc-700/20" />
                                </div>
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none -rotate-45">
                                    <div className="w-full h-[1px] bg-zinc-700/20" />
                                </div>

                                {/* Ring 1 - Out of Range (Rose) */}
                                <div className="absolute inset-[3%] flex items-center justify-center">
                                    <motion.div
                                        initial={{ scale: 0.8, opacity: 0 }}
                                        whileInView={{ scale: 1, opacity: 1 }}
                                        viewport={{ once: true }}
                                        transition={{ duration: 0.6 }}
                                        className="w-full h-full rounded-full border border-rose-500/25"
                                    />
                                </div>

                                {/* Ring 2 - Out of Range (Rose, dashed) */}
                                <div className="absolute inset-[8%] flex items-center justify-center">
                                    <motion.div
                                        initial={{ scale: 0.8, opacity: 0 }}
                                        whileInView={{ scale: 1, opacity: 1 }}
                                        viewport={{ once: true }}
                                        transition={{ duration: 0.6, delay: 0.1 }}
                                        className="w-full h-full rounded-full border border-rose-500/15 border-dashed"
                                    />
                                </div>

                                {/* Ring 3 - Grace Zone (Amber) */}
                                <div className="absolute inset-[15%] flex items-center justify-center">
                                    <motion.div
                                        initial={{ scale: 0.8, opacity: 0 }}
                                        whileInView={{ scale: 1, opacity: 1 }}
                                        viewport={{ once: true }}
                                        transition={{ duration: 0.6, delay: 0.2 }}
                                        className="w-full h-full rounded-full border border-amber-500/30"
                                    />
                                </div>

                                {/* Ring 4 - Grace Zone (Amber, dashed) */}
                                <div className="absolute inset-[20%] flex items-center justify-center">
                                    <motion.div
                                        initial={{ scale: 0.8, opacity: 0 }}
                                        whileInView={{ scale: 1, opacity: 1 }}
                                        viewport={{ once: true }}
                                        transition={{ duration: 0.6, delay: 0.3 }}
                                        className="w-full h-full rounded-full border border-amber-500/20 border-dashed"
                                    />
                                </div>

                                {/* Ring 5 - In Office (Emerald) */}
                                <div className="absolute inset-[28%] flex items-center justify-center">
                                    <motion.div
                                        initial={{ scale: 0.8, opacity: 0 }}
                                        whileInView={{ scale: 1, opacity: 1 }}
                                        viewport={{ once: true }}
                                        transition={{ duration: 0.6, delay: 0.4 }}
                                        className="w-full h-full rounded-full border-2 border-emerald-500/40"
                                        style={{ boxShadow: '0 0 30px rgba(16,185,129,0.08), inset 0 0 30px rgba(16,185,129,0.04)' }}
                                    />
                                </div>

                                {/* Ring 6 - In Office (Emerald, solid) */}
                                <div className="absolute inset-[33%] flex items-center justify-center">
                                    <motion.div
                                        initial={{ scale: 0.8, opacity: 0 }}
                                        whileInView={{ scale: 1, opacity: 1 }}
                                        viewport={{ once: true }}
                                        transition={{ duration: 0.6, delay: 0.5 }}
                                        className="w-full h-full rounded-full border-[3px] border-emerald-400/50"
                                        style={{ boxShadow: '0 0 50px rgba(16,185,129,0.15), inset 0 0 50px rgba(16,185,129,0.06)' }}
                                    />
                                </div>

                                {/* Tick marks on outer ring */}
                                {Array.from({ length: 12 }).map((_, i) => (
                                    <div
                                        key={i}
                                        className="absolute top-0 left-1/2 -translate-x-1/2 w-0.5 h-[3%] bg-zinc-600/20"
                                        style={{ transformOrigin: '50% 50%', rotate: `${i * 30}deg`, translate: '0 28px' }}
                                    />
                                ))}

                                {/* Center target */}
                                <div className="absolute inset-[42%] flex items-center justify-center">
                                    <motion.div
                                        animate={{ scale: [1, 1.04, 1] }}
                                        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                                        className="w-full h-full rounded-full bg-emerald-500/15 border-[2px] border-emerald-400/60 flex items-center justify-center"
                                        style={{ boxShadow: '0 0 40px rgba(16,185,129,0.2)' }}
                                    >
                                        <div className="w-[30%] h-[30%] rounded-full bg-emerald-400/80" />
                                    </motion.div>
                                </div>

                                {/* Absolute dot at center */}
                                <div className="absolute inset-[48.5%] flex items-center justify-center pointer-events-none">
                                    <div className="w-[3%] h-[3%] rounded-full bg-emerald-300 shadow-[0_0_10px_rgba(110,231,183,0.6)]" />
                                </div>

                                {/* Zone Labels */}
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    whileInView={{ opacity: 1 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: 0.8 }}
                                    className="absolute top-[2%] right-[18%] flex items-center gap-1.5"
                                >
                                    <div className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                                    <span className="text-[8px] font-bold text-rose-400/60 uppercase tracking-widest">Out of Range</span>
                                </motion.div>
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    whileInView={{ opacity: 1 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: 1 }}
                                    className="absolute bottom-[28%] right-[4%] flex items-center gap-1.5"
                                >
                                    <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                                    <span className="text-[8px] font-bold text-amber-400/60 uppercase tracking-widest">Grace Zone</span>
                                </motion.div>
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    whileInView={{ opacity: 1 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: 1.2 }}
                                    className="absolute top-[38%] left-[2%] flex items-center gap-1.5"
                                >
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                    <span className="text-[8px] font-bold text-emerald-400/60 uppercase tracking-widest">In Office</span>
                                </motion.div>

                                {/* Pulsing user dots */}
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    whileInView={{ opacity: 1 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: 1.4 }}
                                    className="absolute top-[20%] left-[58%]"
                                >
                                    <div className="relative">
                                        <motion.div
                                            animate={{ scale: [1, 2, 1], opacity: [0.5, 0, 0.5] }}
                                            transition={{ duration: 2.5, repeat: Infinity }}
                                            className="absolute -inset-2 rounded-full bg-emerald-500/20"
                                        />
                                        <div className="w-3 h-3 rounded-full bg-emerald-400 border-2 border-zinc-950 relative z-10" />
                                    </div>
                                </motion.div>
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    whileInView={{ opacity: 1 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: 1.6 }}
                                    className="absolute bottom-[22%] right-[22%]"
                                >
                                    <div className="relative">
                                        <motion.div
                                            animate={{ scale: [1, 2, 1], opacity: [0.5, 0, 0.5] }}
                                            transition={{ duration: 2.5, repeat: Infinity, delay: 0.8 }}
                                            className="absolute -inset-2 rounded-full bg-amber-500/20"
                                        />
                                        <div className="w-2.5 h-2.5 rounded-full bg-amber-400 border-2 border-zinc-950 relative z-10" />
                                    </div>
                                </motion.div>
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    whileInView={{ opacity: 1 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: 1.8 }}
                                    className="absolute top-[10%] right-[12%]"
                                >
                                    <div className="relative">
                                        <motion.div
                                            animate={{ scale: [1, 2, 1], opacity: [0.5, 0, 0.5] }}
                                            transition={{ duration: 2.5, repeat: Infinity, delay: 1.6 }}
                                            className="absolute -inset-2 rounded-full bg-rose-500/20"
                                        />
                                        <div className="w-2 h-2 rounded-full bg-rose-400 border-2 border-zinc-950 relative z-10" />
                                    </div>
                                </motion.div>
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6 }}
                            className="space-y-10"
                        >
                            <div className="space-y-8">
                                {[
                                    {
                                        icon: <FiTarget size={18} />,
                                        title: "Precision Geo-Fencing",
                                        desc: "Define up to three concentric zones: In Office, Grace Period, and Out of Range. Radiuses are configurable per office location."
                                    },
                                    {
                                        icon: <FiNavigation size={18} />,
                                        title: "Automatic GPS Validation",
                                        desc: "When a team member clocks in via the mobile web app, their GPS coordinates are cross-referenced against the defined zones. Status is determined instantly and automatically."
                                    },
                                    {
                                        icon: <FiActivity size={18} />,
                                        title: "Real-time Attendance Map",
                                        desc: "View all team members on a live map with color-coded markers. See who's in the office, who's working remotely, and who has not checked in, updated in real time."
                                    },
                                    {
                                        icon: <FiClock size={18} />,
                                        title: "Compliance & Reporting",
                                        desc: "Automated attendance logs with timestamps, zone history, and late arrival tracking. Export reports for payroll, compliance, or performance review."
                                    }
                                ].map((item, i) => (
                                    <motion.div
                                        key={i}
                                        initial={{ opacity: 0, y: 10 }}
                                        whileInView={{ opacity: 1, y: 0 }}
                                        viewport={{ once: true }}
                                        transition={{ delay: 0.2 + i * 0.1 }}
                                        className="flex gap-4"
                                    >
                                        <div className="w-10 h-10 rounded-xl bg-emerald-400/10 border border-emerald-400/20 flex items-center justify-center text-emerald-300 shrink-0">
                                            {item.icon}
                                        </div>
                                        <div className="space-y-1">
                                            <h4 className="text-sm font-bold text-white font-sora">{item.title}</h4>
                                            <p className="text-sm text-zinc-500 leading-relaxed font-dm-sans">{item.desc}</p>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* ── DEDICATED PIP AI SECTION ── */}
            <section id="pip-ai" className={`py-40 px-6 relative overflow-hidden ${sectionBg} border-t border-white/[0.04]`}>
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/5 blur-[120px] rounded-full pointer-events-none -z-10" />
                <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-emerald-500/3 blur-[100px] rounded-full pointer-events-none -z-10" />

                <div className="max-w-7xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="max-w-3xl space-y-6 mb-20"
                    >
                        <h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-[4.25rem] font-bold tracking-tight leading-[1.02] text-white font-sora">
                            Ask Pip what your<br />
                            <span className="text-emerald-300">team is working on.</span>
                        </h2>
                    </motion.div>

                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-16 items-center">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6, type: 'spring' }}
                            className="lg:col-span-2 flex flex-col items-center justify-center"
                        >
                            <div className="relative">
                                <div className="absolute inset-0 bg-indigo-500/20 blur-[60px] rounded-full scale-150" />
                                <AnimatePresence mode="wait">
                                    <motion.div
                                        key={pipVariant}
                                        initial={{ scale: 0.85, opacity: 0, rotateY: 90 }}
                                        animate={{ scale: 1, opacity: 1, rotateY: 0 }}
                                        exit={{ scale: 0.85, opacity: 0, rotateY: -90 }}
                                        transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
                                    >
                                        <PipMascot variant={pipVariant} status="idle" size="xl" />
                                    </motion.div>
                                </AnimatePresence>
                            </div>
                            <div className="mt-6 text-center space-y-1">
                                <p className="text-lg font-bold text-white font-sora tracking-tight">Pip</p>
                                <p className="text-sm text-zinc-500 font-dm-sans">Built-in AI assistant</p>
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6 }}
                            className="lg:col-span-3 space-y-10"
                        >
                            <div className="space-y-5">
                                <p className="text-zinc-400 text-lg leading-relaxed font-dm-sans">
                                    Pip is an intelligent AI assistant purpose-built for operational command. 
                                    Powered by <span className="text-white font-bold">NVIDIA NIM (Minimax-M3)</span>, Pip understands your organization&apos;s data and answers questions in plain language, so nobody needs to learn a query syntax.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {[
                                    {
                                        icon: <FiMessageSquare size={16} />,
                                        title: "Natural Language Reports",
                                        desc: "Ask Pip \"What did my team accomplish this month?\" and receive a formatted productivity report with task completion rates, trends, and recommendations.",
                                        color: "text-indigo-300", bg: "bg-indigo-400/10", border: "border-indigo-400/20"
                                    },
                                    {
                                        icon: <FiActivity size={16} />,
                                        title: "Proactive Intelligence",
                                        desc: "Pip does not wait to be asked. Get notified of bottlenecks, overdue tasks, attendance anomalies, and project risks before they become problems.",
                                        color: "text-emerald-300", bg: "bg-emerald-400/10", border: "border-emerald-400/20"
                                    },
                                    {
                                        icon: <FiUsers size={16} />,
                                        title: "Team Insights",
                                        desc: "Analyze individual and team performance. Identify top contributors, track workload distribution, and surface coaching opportunities.",
                                        color: "text-teal-300", bg: "bg-teal-400/10", border: "border-teal-400/20"
                                    },
                                    {
                                        icon: <FiGlobe size={16} />,
                                        title: "Enterprise-Grade Security",
                                        desc: "All queries are processed through encrypted API calls to NVIDIA NIM. Your organizational data is never used for model training or stored beyond your session.",
                                        color: "text-indigo-300", bg: "bg-indigo-400/10", border: "border-indigo-400/20"
                                    }
                                ].map((item, i) => (
                                    <motion.div
                                        key={i}
                                        initial={{ opacity: 0, y: 10 }}
                                        whileInView={{ opacity: 1, y: 0 }}
                                        viewport={{ once: true }}
                                        transition={{ delay: 0.3 + i * 0.1 }}
                                        className="p-5 rounded-2xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.12] transition-all duration-300"
                                    >
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className={`w-8 h-8 rounded-lg ${item.bg} ${item.border} flex items-center justify-center ${item.color}`}>
                                                {item.icon}
                                            </div>
                                            <h4 className="text-sm font-bold text-white font-sora">{item.title}</h4>
                                        </div>
                                        <p className="text-xs text-zinc-500 leading-relaxed font-dm-sans">{item.desc}</p>
                                    </motion.div>
                                ))}
                            </div>

                            <div className="flex flex-wrap gap-3 pt-2">
                                {["Monthly Reports", "Productivity Analysis", "Task Insights", "Natural Language", "Proactive Alerts"].map((tag, i) => (
                                    <span key={i} className="px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* More Features Grid */}
            <section id="features" className={`py-40 px-6 relative overflow-hidden ${sectionAlt} border-t border-white/[0.04]`}>
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-emerald-500/3 blur-[150px] rounded-full pointer-events-none -z-10" />
                <div className="max-w-7xl mx-auto space-y-16">
                    <div className="max-w-3xl mx-auto text-center space-y-6">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-400/10 border border-emerald-400/20 text-emerald-300 text-[10px] font-bold uppercase tracking-widest font-sora">
                            <FiLayers size={12} />
                            One workspace
                        </div>
                        <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-[1.05] text-white font-sora">Everything else<br className="md:hidden" /> your team needs</h2>
                        <p className="text-zinc-400 text-base leading-relaxed font-dm-sans max-w-xl mx-auto">Everything your organisation runs on, without stitching five tools together.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 auto-rows-min">
                        {/* Hero Card: Task & Project Management (2x2) */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            className="md:col-span-2 md:row-span-2 p-8 rounded-2xl border border-sky-400/15 bg-gradient-to-br from-sky-500/5 to-transparent group cursor-default hover:border-sky-400/25 transition-all duration-500"
                        >
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-xl bg-sky-400/10 border border-sky-400/20 flex items-center justify-center text-sky-300 group-hover:scale-105 transition-transform">
                                    <FiClipboard size={20} />
                                </div>
                                <div>
                                    <h4 className="text-base font-bold text-white font-sora">Task & Project Management</h4>
                                </div>
                            </div>
                            <p className="text-sm text-zinc-400 leading-relaxed font-dm-sans">Kanban boards, deep-work timers, task dependencies, and role-based project dashboards for the work your team delivers.</p>
                        </motion.div>

                        {/* Calendar & Time Off */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.05 }}
                            className="p-6 rounded-2xl border border-white/[0.06] bg-white/[0.015] group cursor-default hover:bg-white/[0.03] hover:border-white/[0.12] transition-all duration-300 hover:shadow-lg hover:shadow-black/20"
                        >
                            <div className="w-10 h-10 rounded-xl bg-violet-400/10 border border-violet-400/20 flex items-center justify-center text-violet-300 group-hover:scale-105 transition-transform mb-3">
                                <FiCalendar size={20} />
                            </div>
                            <h4 className="text-sm font-bold text-white font-sora mb-1.5">Calendar & Time Off</h4>
                            <p className="text-xs text-zinc-500 leading-relaxed font-dm-sans">Team calendar, time-off requests, approval workflows, and schedule conflict detection.</p>
                        </motion.div>

                        {/* Team Management */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.1 }}
                            className="p-6 rounded-2xl border border-white/[0.06] bg-white/[0.015] group cursor-default hover:bg-white/[0.03] hover:border-white/[0.12] transition-all duration-300 hover:shadow-lg hover:shadow-black/20"
                        >
                            <div className="w-10 h-10 rounded-xl bg-emerald-400/10 border border-emerald-400/20 flex items-center justify-center text-emerald-300 group-hover:scale-105 transition-transform mb-3">
                                <FiUsers size={20} />
                            </div>
                            <h4 className="text-sm font-bold text-white font-sora mb-1.5">Team Management</h4>
                            <p className="text-xs text-zinc-500 leading-relaxed font-dm-sans">Role-based access controls, invite flows, member approvals, and organization hierarchies.</p>
                        </motion.div>

                        {/* Time Tracking */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.15 }}
                            className="p-6 rounded-2xl border border-white/[0.06] bg-white/[0.015] group cursor-default hover:bg-white/[0.03] hover:border-white/[0.12] transition-all duration-300 hover:shadow-lg hover:shadow-black/20"
                        >
                            <div className="w-10 h-10 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-amber-300 group-hover:scale-105 transition-transform mb-3">
                                <FiClock size={20} />
                            </div>
                            <h4 className="text-sm font-bold text-white font-sora mb-1.5">Time Tracking</h4>
                            <p className="text-xs text-zinc-500 leading-relaxed font-dm-sans">Built-in Pomodoro timer, task-level time billing, and productivity analytics per team member.</p>
                        </motion.div>

                        {/* Smart Notes & Wiki: wide */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.2 }}
                            className="md:col-span-2 p-6 rounded-2xl border border-rose-400/15 bg-gradient-to-r from-rose-500/5 to-transparent group cursor-default hover:border-rose-400/25 transition-all duration-500"
                        >
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 rounded-xl bg-rose-400/10 border border-rose-400/20 flex items-center justify-center text-rose-300 group-hover:scale-105 transition-transform">
                                    <FiLayers size={20} />
                                </div>
                                <h4 className="text-sm font-bold text-white font-sora">Smart Notes & Wiki</h4>
                            </div>
                            <p className="text-sm text-zinc-400 leading-relaxed font-dm-sans">Rich text notes with slash commands, organization wiki, and real-time collaborative editing, so what your team learns stays findable.</p>
                        </motion.div>

                        {/* Announcements & Notifications */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.25 }}
                            className="p-6 rounded-2xl border border-white/[0.06] bg-white/[0.015] group cursor-default hover:bg-white/[0.03] hover:border-white/[0.12] transition-all duration-300 hover:shadow-lg hover:shadow-black/20"
                        >
                            <div className="w-10 h-10 rounded-xl bg-purple-400/10 border border-purple-400/20 flex items-center justify-center text-purple-300 group-hover:scale-105 transition-transform mb-3">
                                <FiBell size={20} />
                            </div>
                            <h4 className="text-sm font-bold text-white font-sora mb-1.5">Announcements & Notifications</h4>
                            <p className="text-xs text-zinc-500 leading-relaxed font-dm-sans">Organization-wide announcements, real-time push notifications, and read receipts.</p>
                        </motion.div>

                        {/* Decision Log */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.3 }}
                            className="p-6 rounded-2xl border border-white/[0.06] bg-white/[0.015] group cursor-default hover:bg-white/[0.03] hover:border-white/[0.12] transition-all duration-300 hover:shadow-lg hover:shadow-black/20"
                        >
                            <div className="w-10 h-10 rounded-xl bg-cyan-400/10 border border-cyan-400/20 flex items-center justify-center text-cyan-300 group-hover:scale-105 transition-transform mb-3">
                                <FiTarget size={20} />
                            </div>
                            <h4 className="text-sm font-bold text-white font-sora mb-1.5">Decision Log</h4>
                            <p className="text-xs text-zinc-500 leading-relaxed font-dm-sans">Track strategic decisions with context, rationale, and outcome tracking for organizational memory.</p>
                        </motion.div>

                        {/* Focus Mode */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.35 }}
                            className="p-6 rounded-2xl border border-white/[0.06] bg-white/[0.015] group cursor-default hover:bg-white/[0.03] hover:border-white/[0.12] transition-all duration-300 hover:shadow-lg hover:shadow-black/20"
                        >
                            <div className="w-10 h-10 rounded-xl bg-orange-400/10 border border-orange-400/20 flex items-center justify-center text-orange-300 group-hover:scale-105 transition-transform mb-3">
                                <FiStar size={20} />
                            </div>
                            <h4 className="text-sm font-bold text-white font-sora mb-1.5">Focus Mode</h4>
                            <p className="text-xs text-zinc-500 leading-relaxed font-dm-sans">Distraction-free deep work sessions with Pomodoro integration and progress tracking.</p>
                        </motion.div>

                        {/* Role-Based Access: full width */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.4 }}
                            className="md:col-span-3 p-6 rounded-2xl border border-indigo-400/15 bg-gradient-to-r from-indigo-500/5 via-transparent to-indigo-500/5 group cursor-default hover:border-indigo-400/25 transition-all duration-500"
                        >
                            <div className="flex items-center gap-4 justify-center flex-wrap">
                                <div className="w-10 h-10 rounded-xl bg-indigo-400/10 border border-indigo-400/20 flex items-center justify-center text-indigo-300 group-hover:scale-105 transition-transform">
                                    <FiServer size={20} />
                                </div>
                                <div className="text-center md:text-left">
                                    <h4 className="text-sm font-bold text-white font-sora mb-0.5">Role-Based Access</h4>
                                    <p className="text-sm text-zinc-400 leading-relaxed font-dm-sans">Granular permissions across Owner, Admin, Member, and Client roles with full audit logging.</p>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* How It Works */}
            <section id="how-it-works" className={`py-40 px-6 relative overflow-hidden ${sectionBg} border-t border-white/[0.04]`}>
                <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-emerald-500/4 blur-[150px] rounded-full pointer-events-none -z-10" />
                <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-indigo-500/3 blur-[100px] rounded-full pointer-events-none -z-10" />
                <div className="max-w-7xl mx-auto space-y-16">
                    <div className="max-w-3xl mx-auto text-center space-y-6">
                        <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-[1.05] text-white font-sora">Up and running in three steps</h2>
                        <p className="text-zinc-400 text-base leading-relaxed font-dm-sans max-w-xl mx-auto">Get your team up and running in minutes, not days.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                        {[
                            { step: "01", icon: <FiStar size={24} />, title: "Create Your Organization", desc: "Sign up and set up your organization in seconds. Define your company name, configure working hours, and set up office locations with geo-fenced boundaries.", color: "text-emerald-300", bg: "bg-emerald-400/10", border: "border-emerald-400/20" },
                            { step: "02", icon: <FiUsers size={24} />, title: "Invite Your Team", desc: "Invite members via email or share your unique invite code. Assign roles (Owner, Admin, Member, or Client) and let people join with a single click.", color: "text-emerald-300", bg: "bg-emerald-400/10", border: "border-emerald-400/20" },
                            { step: "03", icon: <FiZap size={24} />, title: "Get to work", desc: "Track attendance, assign tasks, manage projects, and pull reports from Pip. Everything runs from the same workspace.", color: "text-emerald-300", bg: "bg-emerald-400/10", border: "border-emerald-400/20" }
                        ].map((step, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true, margin: "-50px" }}
                                transition={{ delay: i * 0.15, duration: 0.5 }}
                                className="relative p-8 rounded-[2rem] border border-white/[0.06] bg-white/[0.015] text-left group hover:bg-white/[0.03] hover:border-white/[0.12] transition-all duration-500 hover:shadow-lg hover:shadow-black/20"
                            >
                                <div className="flex items-center gap-4 mb-6">
                                    <span className="text-5xl font-black text-white/[0.04] font-sora leading-none">{step.step}</span>
                                    <div className={`w-12 h-12 rounded-2xl ${step.bg} ${step.border} flex items-center justify-center ${step.color} group-hover:scale-105 transition-transform`}>{step.icon}</div>
                                </div>
                                <h3 className="text-xl font-bold text-white font-sora mb-3">{step.title}</h3>
                                <p className="text-sm text-zinc-500 leading-relaxed font-dm-sans">{step.desc}</p>
                            </motion.div>
                        ))}
                    </div>

                    <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center pt-8">
                        <Link href="/register" className="inline-flex items-center gap-3 px-8 py-4 rounded-full bg-emerald-400 text-[#07090c] hover:bg-emerald-300 text-sm font-semibold tracking-tight transition-colors duration-200 active:scale-[0.98]">
                            Get Started Now <FiArrowRight />
                        </Link>
                    </motion.div>
                </div>
            </section>

            {/* Security */}
            <section id="security" className={`py-40 px-6 relative overflow-hidden ${sectionAlt} border-t border-white/[0.04]`}>
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-emerald-500/3 blur-[140px] rounded-full pointer-events-none -z-10" />
                <div className="max-w-7xl mx-auto space-y-16">
                    <div className="max-w-3xl space-y-6 text-left">
                        <h2 className="text-4xl md:text-6xl font-bold tracking-tightest leading-tight text-white font-sora">Data You Control, <br />Always</h2>
                        <p className="text-zinc-400 text-lg leading-relaxed font-dm-sans">Your workflows, tasks, logs, and calendar items remain completely encrypted. Enterprise-grade AI inference with zero telemetry leakage.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {[
                            { icon: <FiShield className="text-xl text-emerald-300" />, title: "100% Data Sovereignty", desc: "Your data stays on your infrastructure. No third-party cloud storage, no unauthorized access, complete control." },
                            { icon: <FiCpu className="text-xl text-emerald-300" />, title: "Encrypted AI Processing", desc: "Powered by NVIDIA NIM (Minimax-M3) with enterprise-grade encryption. Your prompts and data are never used for training." },
                            { icon: <FiServer className="text-xl text-emerald-300" />, title: "Role-Based Access Control", desc: "Granular permissions across Owner, Admin, Member, and Client roles. Full audit logging for every action taken." }
                        ].map((card, i) => (
                            <motion.div
                                key={i}
                                whileHover={{ y: -8, borderColor: "rgba(255,255,255,0.12)", backgroundColor: "rgba(255,255,255,0.03)" }}
                                transition={{ duration: 0.3 }}
                                className="p-8 rounded-[2.5rem] bg-white/[0.015] border border-white/[0.06] text-left space-y-6 group cursor-default hover:shadow-lg hover:shadow-black/20"
                            >
                                <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center group-hover:scale-105 transition-transform duration-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">{card.icon}</div>
                                <div className="space-y-2">
                                    <h4 className="text-lg font-bold text-white font-sora">{card.title}</h4>
                                    <p className="text-zinc-500 text-sm leading-relaxed font-dm-sans">{card.desc}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Pricing */}
            <section id="pricing" className={`py-40 px-6 relative overflow-hidden ${sectionBg} border-t border-white/[0.04]`}>
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/4 blur-[120px] rounded-full pointer-events-none -z-10" />
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-emerald-500/3 blur-[120px] rounded-full pointer-events-none -z-10" />
                <div className="max-w-7xl mx-auto space-y-16 text-center">
                    <div className="space-y-6 max-w-3xl mx-auto text-center">
                        <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-[1.05] text-white font-sora">Simple, transparent pricing</h2>
                        <p className="text-zinc-400 text-base md:text-lg leading-relaxed font-dm-sans">Start free. Add people as the team grows.</p>
                    </div>

                    <div className="relative flex items-center bg-white/[0.03] border border-white/[0.08] rounded-full p-1 w-fit mx-auto z-10">
                        {['Monthly', 'Annual'].map((cycle) => (
                            <button
                                key={cycle}
                                onClick={() => setBillingCycle(cycle)}
                                className="px-5 py-2 rounded-full text-sm font-semibold tracking-tight relative z-30 transition-all font-sora"
                                style={{ color: billingCycle === cycle ? '#09090b' : '#71717a' }}
                            >
                                {billingCycle === cycle && <motion.div layoutId="billing-pill" className="absolute inset-0 bg-white rounded-full -z-10" transition={{ type: "spring", stiffness: 380, damping: 30 }} />}
                                <span className="relative z-40">{cycle}</span>
                            </button>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto pt-10 text-left items-stretch">
                        {[
                            { name: "Starter", price: "0", desc: "For small teams getting started with operational command.", features: ["Up to 10 team members", "Geo-fenced attendance", "Task & project management", "Basic Pip AI access"] },
                            { name: "Professional", price: "15", desc: "For growing teams needing advanced features and AI insights.", features: ["Unlimited team members", "Advanced Pip AI reports", "Custom geo-fence zones", "Priority support"], popular: true },
                            { name: "Enterprise", price: "Custom", desc: "For organizations requiring dedicated infrastructure and SLAs.", features: ["Self-hosted deployment", "Custom AI model training", "Dedicated compliance", "24/7 support SLA"] }
                        ].map((tier, idx) => (
                            <motion.div
                                key={idx}
                                whileHover={{ y: -8 }}
                                transition={{ duration: 0.3 }}
                                className={`p-8 rounded-[2.5rem] border flex flex-col justify-between relative group ${tier.popular ? 'border-emerald-500/40 bg-emerald-500/[0.04] shadow-xl shadow-emerald-500/5 hover:border-emerald-400/60' : 'border-white/[0.06] bg-white/[0.015] hover:border-white/[0.12] hover:bg-white/[0.025]'}`}
                            >
                                {tier.popular && <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-white/[0.12] backdrop-blur-sm border border-white/20 text-white text-xs font-semibold tracking-tight font-sora shadow-md">Most popular</div>}
                                <div className="space-y-8 flex-1 flex flex-col justify-between">
                                    <div className="space-y-6">
                                        <div className="space-y-2">
                                            <h4 className="text-xl font-bold text-white font-sora">{tier.name}</h4>
                                            <p className="text-zinc-500 text-xs leading-relaxed font-dm-sans">{tier.desc}</p>
                                        </div>
                                        <div className="space-y-1.5">
                                            <div className="flex items-baseline gap-1 text-white font-sora">
                                                <span className="text-4xl font-extrabold tracking-tight">{tier.price === 'Custom' ? 'Custom' : `$${tier.price}`}</span>
                                                {tier.price !== 'Custom' && <span className="text-zinc-500 text-xs font-semibold">/month</span>}
                                            </div>
                                            <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 font-sora block">
                                                {tier.price === 'Custom' ? 'Contact for pricing' : (tier.price === '0' ? 'Free forever' : (billingCycle === 'Monthly' ? 'Billed monthly' : 'Billed annually'))}
                                            </span>
                                        </div>
                                    </div>
                                    <ul className="space-y-3 pt-6 border-t border-white/[0.06] font-dm-sans flex-1 mt-6">
                                        {tier.features.map((feat, fIdx) => (
                                            <li key={fIdx} className="flex items-center gap-3 text-xs text-zinc-400 font-medium">
                                                <FiCheck className="text-emerald-400 flex-shrink-0 text-xs" />
                                                <span>{feat}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <div className="pt-8 mt-auto">
                                    <Link href="/register" className={`w-full text-center py-4 rounded-full text-sm font-semibold tracking-tight block transition-colors duration-200 font-sora ${tier.popular ? 'bg-emerald-400 text-[#07090c] hover:bg-emerald-300' : 'border border-white/[0.08] text-zinc-400 hover:text-white hover:border-white/20 hover:bg-white/[0.05]'}`}>Get started</Link>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* FAQ */}
            <section className={`py-40 px-6 relative overflow-hidden ${sectionAlt} border-t border-white/[0.04]`}>
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-emerald-500/3 blur-[120px] rounded-full pointer-events-none -z-10" />
                <div className="max-w-4xl mx-auto space-y-16">
                    <div className="space-y-6 text-center">
                        <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-[1.05] text-white font-sora">Questions, answered</h2>
                        <p className="text-zinc-500 text-sm leading-relaxed max-w-xl mx-auto font-dm-sans">Everything you need to know about the platform, security, and getting started.</p>
                    </div>

                    <div className="space-y-4">
                        {faqs.map((faq, index) => (
                            <div key={index} className="rounded-3xl border border-white/[0.06] bg-white/[0.015] overflow-hidden transition-all duration-300 hover:border-white/[0.12]">
                                <button onClick={() => setActiveFaq(activeFaq === index ? null : index)} className="w-full px-8 py-6 flex items-center justify-between text-left group">
                                    <div className="flex items-center gap-4">
                                        <FiHelpCircle className="text-zinc-500 group-hover:text-emerald-300 transition-colors" />
                                        <span className="text-base md:text-lg font-semibold text-white/90 tracking-tight font-sora group-hover:text-white transition-colors text-left">{faq.q}</span>
                                    </div>
                                    <motion.div animate={{ rotate: activeFaq === index ? 180 : 0 }} transition={{ duration: 0.2 }}>
                                        <FiChevronDown className="text-zinc-500 group-hover:text-white transition-colors" />
                                    </motion.div>
                                </button>
                                <AnimatePresence initial={false}>
                                    {activeFaq === index && (
                                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}>
                                            <div className="px-8 pb-6 text-xs text-zinc-400 leading-relaxed font-dm-sans border-t border-white/[0.06] pt-4">{faq.a}</div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Final CTA */}
            <section className={`py-40 px-6 relative overflow-hidden ${sectionBg} border-t border-white/[0.04]`}>
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-gradient-to-r from-emerald-500/5 via-indigo-500/5 to-emerald-500/5 blur-[120px] rounded-full pointer-events-none -z-10" />
                <div className="max-w-4xl mx-auto text-center space-y-10">
                    <h2 className="text-4xl md:text-8xl font-bold tracking-tightest leading-[0.95] text-white font-sora">Take Control of <br /> Your Operations</h2>
                    <p className="text-zinc-500 text-lg max-w-2xl mx-auto leading-relaxed font-dm-sans">Create your organization, invite your team, and start commanding in minutes. No credit card required.</p>
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                        <Link href="/register" className="inline-flex items-center gap-3 px-8 py-4 rounded-full bg-emerald-400 text-[#07090c] hover:bg-emerald-300 text-sm font-semibold tracking-tight transition-colors duration-200 active:scale-[0.98]">
                            Create Your Account <FiArrowRight />
                        </Link>
                    </motion.div>
                    <div className="flex flex-wrap items-center justify-center gap-6 text-zinc-500 text-xs font-medium pt-4">
                        <span className="flex items-center gap-2"><FiCheck className="text-emerald-400" /> No credit card required</span>
                        <span className="flex items-center gap-2"><FiCheck className="text-emerald-400" /> Free starter plan</span>
                        <span className="flex items-center gap-2"><FiCheck className="text-emerald-400" /> Cancel anytime</span>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className={`py-20 px-6 border-t border-white/[0.04] ${sectionBg}`}>
                <div className="max-w-7xl mx-auto">
                    <div className="flex flex-col md:flex-row items-start justify-between gap-12 pb-16 text-left">
                        <div className="space-y-6">
                            <Link href="/" className="flex items-center gap-3">
                                <Image src="/logo.svg" alt="MD Logo" width={28} height={28} />
                                <span className="text-xl font-bold tracking-tightest font-sora">MD<span className="text-emerald-400">Dash</span></span>
                            </Link>
                            <p className="text-zinc-500 text-sm max-w-xs leading-relaxed font-dm-sans">One workspace for attendance, projects, people and everything in between.</p>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-16 font-sora text-sm">
                            <div className="space-y-4">
                                <h4 className="text-white">Platform</h4>
                                <ul className="space-y-2 text-zinc-500">
                                    <li><Link href="#attendance" className="hover:text-emerald-300 transition-colors">Attendance</Link></li>
                                    <li><Link href="#pip-ai" className="hover:text-emerald-300 transition-colors">Pip AI</Link></li>
                                    <li><Link href="#features" className="hover:text-emerald-300 transition-colors">Features</Link></li>
                                    <li><Link href="#how-it-works" className="hover:text-emerald-300 transition-colors">How It Works</Link></li>
                                    <li><Link href="#pricing" className="hover:text-emerald-300 transition-colors">Pricing</Link></li>
                                    <li><Link href="/login" className="hover:text-emerald-300 transition-colors">Sign in</Link></li>
                                </ul>
                            </div>
                            <div className="space-y-4">
                                <h4 className="text-white">Compliance</h4>
                                <ul className="space-y-2 text-zinc-500">
                                    <li><Link href="/privacy" className="hover:text-emerald-300 transition-colors">Privacy Policy</Link></li>
                                    <li><Link href="/terms" className="hover:text-emerald-300 transition-colors">Terms of Service</Link></li>
                                    <li><button onClick={() => window.dispatchEvent(new CustomEvent('open-cookie-settings'))} className="hover:text-emerald-300 transition-colors text-left">Cookie Settings</button></li>
                                </ul>
                            </div>
                            <div className="space-y-4">
                                <h4 className="text-white">Connect</h4>
                                <ul className="space-y-2 text-zinc-500">
                                    <li><Link href="mailto:intelligence@md-dash.com" className="hover:text-emerald-300 transition-colors">Contact</Link></li>
                                    <li><Link href="#" className="hover:text-emerald-300 transition-colors">LinkedIn</Link></li>
                                    <li><Link href="#" className="hover:text-emerald-300 transition-colors">X / Twitter</Link></li>
                                </ul>
                            </div>
                        </div>
                    </div>
                    <div className="pt-8 border-t border-white/[0.04] flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-zinc-600 font-sora">
                        <span>© 2026 MD-DASH. ALL RIGHTS RESERVED.</span>
                        <div className="flex gap-6 text-zinc-500">
                            <span className="text-emerald-400/50">SYSTEM STATUS: OPTIMAL</span>
                            <span>VERSION 1.2.0</span>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
