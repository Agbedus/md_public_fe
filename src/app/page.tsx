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
import { motion, AnimatePresence } from 'framer-motion';
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

    const fadeIn = {
        initial: { opacity: 0, y: 15 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.5, ease: [0.23, 1, 0.32, 1] as const }
    };

    const containerRef = useRef<HTMLDivElement>(null);
    const zoomRef = useRef<HTMLDivElement>(null);

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
        const ctx = gsap.context(() => {
            const tl = gsap.timeline({
                scrollTrigger: {
                    trigger: containerRef.current,
                    start: "center center",
                    end: "+=300%",
                    scrub: 0.5,
                    pin: true,
                    anticipatePin: 1,
                    snap: [0, 1/5.5, 2/5.5, 3/5.5, 4/5.5, 5/5.5, 1],
                }
            });

            tl.to(zoomRef.current, {
                maxWidth: '100%',
                width: '100%',
                padding: '0 2rem',
                duration: 1,
                ease: "power2.inOut"
            });

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
    }, []);

    const faqs = [
        {
            q: "How does the AI assistant protect my data?",
            a: "MD-Dash leverages NVIDIA cloud AI (Minimax-M3) for intelligent assistance while keeping your raw data secure. All dashboard data is processed through encrypted API calls, and your privacy remains protected."
        },
        {
            q: "How does attendance geo-fencing work?",
            a: "Admins define office perimeters as geo-fenced zones with configurable radiuses. When team members clock in via the mobile web app, GPS coordinates are cross-referenced against the defined boundaries. Three zones — In Office (green), Grace (amber), and Out of Range (red) — determine attendance status automatically."
        },
        {
            q: "What can Pip AI do for my team?",
            a: "Pip generates monthly productivity reports, answers operational questions, analyzes task completion rates, identifies bottlenecks, and provides proactive recommendations — all through natural conversation. Powered by NVIDIA NIM (Minimax-M3) with enterprise-grade encryption."
        },
        {
            q: "How is data sync secured across devices?",
            a: "Your data is encrypted at rest and in transit. Role-based access controls ensure team members only see what they need. No third-party access to your organizational data."
        }
    ];

    return (
        <div className="min-h-screen bg-zinc-950 text-white selection:bg-emerald-500/30 overflow-x-hidden">
            <div className="absolute top-0 inset-x-0 h-[64rem] bg-radial-glow pointer-events-none -z-10" 
                style={{
                    backgroundImage: 'radial-gradient(circle at 50% 0%, rgba(16, 185, 129, 0.08) 0%, rgba(16, 185, 129, 0.02) 50%, transparent 100%)'
                }}
            />
            <div className="absolute top-0 inset-x-0 h-[64rem] opacity-[0.03] pointer-events-none -z-10 bg-[linear-gradient(to_right,rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[size:4rem_4rem]" />

            {/* Navigation */}
            <nav className="fixed top-0 inset-x-0 z-50 transition-all duration-300 px-6 pt-6">
                <div className="max-w-5xl mx-auto rounded-full bg-zinc-900/60 backdrop-blur-xl border border-white/10 px-6 py-3 flex items-center justify-between shadow-lg">
                    <Link href="/" className="flex items-center gap-3">
                        <Image src="/logo.svg" alt="MD Logo" width={26} height={26} className="w-6.5 h-6.5" />
                        <span className="text-base font-bold tracking-tightest font-sora text-white">
                            MD<span className="text-emerald-500">Dash</span>
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
                            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                                <Link 
                                    href="/login"
                                    className="px-5 py-2 rounded-full border border-white/10 text-zinc-300 hover:text-white hover:bg-white/[0.04] transition-all text-[10px] font-bold uppercase tracking-wider"
                                >
                                    Sign In
                                </Link>
                            </motion.div>
                            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                                <Link 
                                    href="/register"
                                    className="px-5 py-2 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white transition-all text-[10px] font-bold uppercase tracking-wider border border-emerald-400/30"
                                >
                                    Get Started
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
                            className="md:hidden absolute top-20 left-6 right-6 p-6 rounded-3xl bg-zinc-900 border border-white/10 shadow-2xl flex flex-col gap-4 font-dm-sans text-sm"
                        >
                            <Link href="#attendance" onClick={() => setMobileMenuOpen(false)} className="text-zinc-400 hover:text-white transition-colors py-2 border-b border-white/5 text-left">Attendance</Link>
                            <Link href="#pip-ai" onClick={() => setMobileMenuOpen(false)} className="text-zinc-400 hover:text-white transition-colors py-2 border-b border-white/5 text-left">Pip AI</Link>
                            <Link href="#features" onClick={() => setMobileMenuOpen(false)} className="text-zinc-400 hover:text-white transition-colors py-2 border-b border-white/5 text-left">Features</Link>
                            <Link href="#how-it-works" onClick={() => setMobileMenuOpen(false)} className="text-zinc-400 hover:text-white transition-colors py-2 border-b border-white/5 text-left">How It Works</Link>
                            <Link href="#pricing" onClick={() => setMobileMenuOpen(false)} className="text-zinc-400 hover:text-white transition-colors py-2 border-b border-white/5 text-left">Pricing</Link>
                            <Link href="/register" onClick={() => setMobileMenuOpen(false)} className="mt-2 w-full text-center px-4 py-3 rounded-full bg-emerald-600 text-white font-bold text-xs uppercase tracking-wider block">Get Started</Link>
                            <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="w-full text-center px-4 py-3 rounded-full border border-white/10 text-zinc-300 font-bold text-xs uppercase tracking-wider block">Sign In</Link>
                        </motion.div>
                    )}
                </AnimatePresence>
            </nav>

            {/* Hero */}
            <section className="relative pt-44 pb-20 px-6 overflow-hidden">
                <div className="max-w-7xl mx-auto text-center space-y-10">
                    <motion.div 
                        {...fadeIn}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 text-[9px] font-bold uppercase tracking-[0.3em] font-sora"
                    >
                        <FiZap size={12} />
                        Live — Production Ready
                    </motion.div>

                    <motion.h1 
                        {...fadeIn}
                        transition={{ delay: 0.1 }}
                        className="text-5xl md:text-[10rem] font-bold tracking-tightest leading-[0.92] text-white font-sora"
                    >
                        Strategic <br />
                        <span className="bg-gradient-to-r from-zinc-200 via-white to-zinc-400 bg-clip-text text-transparent">
                            Command Center
                        </span>
                    </motion.h1>

                    <motion.p 
                        {...fadeIn}
                        transition={{ delay: 0.2 }}
                        className="max-w-2xl mx-auto text-zinc-400 text-base md:text-lg leading-relaxed font-dm-sans"
                    >
                        GPS-verified attendance, AI-powered insights, and full team orchestration —
                        one command center for operations that matter.
                    </motion.p>

                    <motion.div 
                        {...fadeIn}
                        transition={{ delay: 0.3 }}
                        className="flex flex-col md:flex-row items-center justify-center gap-6 pt-4"
                    >
                        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="w-full md:w-auto">
                            <Link 
                                href="/register"
                                className="w-full md:w-auto px-10 py-5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-3 group transition-all border border-emerald-400/30 shadow-lg shadow-emerald-500/10"
                            >
                                Create Your Account <FiArrowRight className="group-hover:translate-x-1 transition-transform" />
                            </Link>
                        </motion.div>
                        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="w-full md:w-auto">
                            <Link 
                                href="/login" 
                                className="w-full md:w-auto px-10 py-5 rounded-full bg-white/[0.02] hover:bg-white/[0.04] border border-white/10 text-white text-xs font-bold uppercase tracking-widest transition-all"
                            >
                                Sign In
                            </Link>
                        </motion.div>
                    </motion.div>

                    {/* Interface Showcase */}
                    <div ref={containerRef} className="relative mt-20 pt-10 pb-36">
                        <div ref={zoomRef} className="relative mx-auto max-w-5xl">
                            <div className="absolute inset-0 bg-emerald-500/5 blur-[120px] rounded-[3rem] pointer-events-none -z-10" />
                            <div className="relative p-2 rounded-[2.5rem] bg-zinc-900/40 backdrop-blur-xl border border-white/10 overflow-hidden group">
                                <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000 pointer-events-none" />
                                <div className="rounded-[2rem] overflow-hidden border border-white/5 bg-zinc-950/50">
                                    <div className="h-14 border-b border-white/10 bg-zinc-900/30 flex items-center px-6 justify-between">
                                        <div className="flex gap-1.5">
                                            <div className="w-3 h-3 rounded-full bg-white/5 border border-white/10" />
                                            <div className="w-3 h-3 rounded-full bg-white/5 border border-white/10" />
                                            <div className="w-3 h-3 rounded-full bg-white/5 border border-white/10" />
                                        </div>
                                        <div className="flex items-center bg-white/[0.02] rounded-full p-1 border border-white/5 relative z-30">
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
                                    <div className="aspect-[16/10] bg-zinc-900 relative overflow-hidden">
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
                                        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-zinc-800 to-zinc-950" />
                                    </div>
                                </div>
                            </div>
                            <div className="absolute -top-6 -right-6 p-4 rounded-2xl bg-zinc-900/80 backdrop-blur-md border border-white/10 z-20 hidden md:block">
                                <div className="flex items-center gap-3">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 font-sora">System Live</span>
                                </div>
                            </div>
                            <div className="absolute -bottom-6 -left-6 p-4 rounded-2xl bg-zinc-900/80 backdrop-blur-md border border-white/10 z-20 hidden md:block">
                                <div className="flex items-center gap-3">
                                    <FiShield className="text-emerald-400" />
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 font-sora">End-to-End Encrypted</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Stats Bar */}
            <section className="py-20 px-6 border-t border-white/5 bg-zinc-950/50">
                <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
                    {[
                        { value: "Real-time", label: "Attendance Tracking" },
                        { value: "AI-Powered", label: "Assistant (Pip)" },
                        { value: "Multi-zone", label: "Geo-fencing" },
                        { value: "Role-based", label: "Access Control" },
                    ].map((stat, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.1 }}
                            className="text-center space-y-1"
                        >
                            <p className="text-xl md:text-2xl font-bold text-white font-sora tracking-tight">{stat.value}</p>
                            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{stat.label}</p>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* ── DEDICATED ATTENDANCE SECTION ── */}
            <section id="attendance" className="py-40 px-6 relative overflow-hidden bg-zinc-950 border-t border-white/5">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[600px] bg-emerald-500/3 blur-[120px] rounded-full pointer-events-none -z-10" />

                <div className="max-w-7xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="max-w-3xl space-y-6 mb-20"
                    >
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-widest font-sora">
                            <FiMapPin size={12} />
                            Geo-Fencing V2
                        </div>
                        <h2 className="text-4xl md:text-7xl font-bold tracking-tightest leading-[0.95] text-white font-sora">
                            Attendance,<br />
                            <span className="bg-gradient-to-r from-emerald-300 to-emerald-500 bg-clip-text text-transparent">Geographically Precise</span>
                        </h2>
                        <p className="text-zinc-400 text-lg leading-relaxed font-dm-sans max-w-2xl">
                            Define office perimeters as geo-fenced zones. Team members clock in with automatic GPS validation.
                            Three concentric zones determine attendance status — no manual entry, no disputes.
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
                                        desc: "Define up to three concentric zones — In Office (green), Grace Period (amber), and Out of Range (red). Radiuses are fully configurable per office location."
                                    },
                                    {
                                        icon: <FiNavigation size={18} />,
                                        title: "Automatic GPS Validation",
                                        desc: "When a team member clocks in via the mobile web app, their GPS coordinates are cross-referenced against the defined zones. Status is determined instantly and automatically."
                                    },
                                    {
                                        icon: <FiActivity size={18} />,
                                        title: "Real-time Attendance Map",
                                        desc: "View all team members on a live map with color-coded markers. See who's in the office, who's working remotely, and who's off-grid — all updated in real-time."
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
                                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
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
            <section id="pip-ai" className="py-40 px-6 relative overflow-hidden bg-zinc-950 border-t border-white/5">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-500/5 blur-[120px] rounded-full pointer-events-none -z-10" />
                <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-emerald-500/3 blur-[100px] rounded-full pointer-events-none -z-10" />

                <div className="max-w-7xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="max-w-3xl space-y-6 mb-20"
                    >
                        <h2 className="text-4xl md:text-7xl font-bold tracking-tightest leading-[0.95] text-white font-sora">
                            Meet Pip, Your<br />
                            <span className="bg-gradient-to-r from-emerald-300 via-emerald-400 to-emerald-500 bg-clip-text text-transparent">Command Co-Pilot</span>
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
                                <div className="absolute inset-0 bg-emerald-500/20 blur-[60px] rounded-full scale-150" />
                                <PipMascot variant="cyber" status="idle" size="lg" />
                            </div>
                            <div className="mt-6 text-center space-y-1">
                                <p className="text-lg font-bold text-white font-sora tracking-tight">Pip</p>
                                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">AI Command Co-Pilot</p>
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
                                    Powered by <span className="text-white font-bold">NVIDIA NIM (Minimax-M3)</span>, Pip understands your organization's data and delivers actionable insights through natural conversation — no complex queries, no training required.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {[
                                    {
                                        icon: <FiMessageSquare size={16} />,
                                        title: "Natural Language Reports",
                                        desc: "Ask Pip \"What did my team accomplish this month?\" and receive a formatted productivity report with task completion rates, trends, and recommendations.",
                                        color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20"
                                    },
                                    {
                                        icon: <FiActivity size={16} />,
                                        title: "Proactive Intelligence",
                                        desc: "Pip doesn't just answer — it alerts. Get notified of bottlenecks, overdue tasks, attendance anomalies, and project risks before they become problems.",
                                        color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20"
                                    },
                                    {
                                        icon: <FiUsers size={16} />,
                                        title: "Team Insights",
                                        desc: "Analyze individual and team performance. Identify top contributors, track workload distribution, and surface coaching opportunities.",
                                        color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20"
                                    },
                                    {
                                        icon: <FiGlobe size={16} />,
                                        title: "Enterprise-Grade Security",
                                        desc: "All queries are processed through encrypted API calls to NVIDIA NIM. Your organizational data is never used for model training or stored beyond your session.",
                                        color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20"
                                    }
                                ].map((item, i) => (
                                    <motion.div
                                        key={i}
                                        initial={{ opacity: 0, y: 10 }}
                                        whileInView={{ opacity: 1, y: 0 }}
                                        viewport={{ once: true }}
                                        transition={{ delay: 0.3 + i * 0.1 }}
                                        className="p-5 rounded-2xl border border-white/5 bg-white/[0.01] hover:bg-white/[0.02] hover:border-white/10 transition-all duration-300"
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
                                    <span key={i} className="px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/10 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* More Features Grid */}
            <section id="features" className="py-40 px-6 relative overflow-hidden bg-zinc-950 border-t border-white/5">
                <div className="max-w-7xl mx-auto space-y-16">
                    <div className="max-w-3xl mx-auto text-center space-y-6">
                        <h2 className="text-4xl md:text-5xl font-bold tracking-tightest leading-tight text-white font-sora">Everything Else You Need</h2>
                        <p className="text-zinc-400 text-base leading-relaxed font-dm-sans max-w-xl mx-auto">A complete ecosystem for managing your organization.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[
                            { icon: <FiClipboard size={20} />, title: "Task & Project Management", desc: "Kanban boards, deep-work timers, task dependencies, and role-based project dashboards.", color: "text-sky-400", bg: "bg-sky-500/10", border: "border-sky-500/20" },
                            { icon: <FiCalendar size={20} />, title: "Calendar & Time Off", desc: "Team calendar, time-off requests, approval workflows, and schedule conflict detection.", color: "text-violet-400", bg: "bg-violet-500/10", border: "border-violet-500/20" },
                            { icon: <FiUsers size={20} />, title: "Team Management", desc: "Role-based access controls, invite flows, member approvals, and organization hierarchies.", color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
                            { icon: <FiClock size={20} />, title: "Time Tracking", desc: "Built-in Pomodoro timer, task-level time billing, and productivity analytics per team member.", color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20" },
                            { icon: <FiLayers size={20} />, title: "Smart Notes & Wiki", desc: "Rich text notes with slash commands, organization wiki, and real-time collaborative editing.", color: "text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/20" },
                            { icon: <FiBell size={20} />, title: "Announcements & Notifications", desc: "Organization-wide announcements, real-time push notifications, and read receipts.", color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/20" },
                            { icon: <FiTarget size={20} />, title: "Decision Log", desc: "Track strategic decisions with context, rationale, and outcome tracking for organizational memory.", color: "text-cyan-400", bg: "bg-cyan-500/10", border: "border-cyan-500/20" },
                            { icon: <FiStar size={20} />, title: "Focus Mode", desc: "Distraction-free deep work sessions with Pomodoro integration and progress tracking.", color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/20" },
                            { icon: <FiServer size={20} />, title: "Role-Based Access", desc: "Granular permissions across Owner, Admin, Member, and Client roles with full audit logging.", color: "text-indigo-400", bg: "bg-indigo-500/10", border: "border-indigo-500/20" },
                        ].map((feature, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true, margin: "-50px" }}
                                transition={{ delay: i * 0.05, duration: 0.4 }}
                                whileHover={{ y: -4, backgroundColor: "rgba(255,255,255,0.02)" }}
                                className="p-6 rounded-2xl border border-white/5 bg-white/[0.01] space-y-4 group cursor-default transition-all duration-300"
                                style={{ borderColor: 'var(--border-color, rgba(255,255,255,0.05))' }}
                            >
                                <div className={`w-10 h-10 rounded-xl ${feature.bg} ${feature.border} flex items-center justify-center ${feature.color} group-hover:scale-105 transition-transform`}>
                                    {feature.icon}
                                </div>
                                <div className="space-y-1.5">
                                    <h4 className="text-sm font-bold text-white font-sora">{feature.title}</h4>
                                    <p className="text-xs text-zinc-500 leading-relaxed font-dm-sans">{feature.desc}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* How It Works */}
            <section id="how-it-works" className="py-40 px-6 relative overflow-hidden bg-zinc-950 border-t border-white/5">
                <div className="max-w-7xl mx-auto space-y-16">
                    <div className="max-w-3xl mx-auto text-center space-y-6">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-widest font-sora">
                            Three Simple Steps
                        </div>
                        <h2 className="text-4xl md:text-5xl font-bold tracking-tightest leading-tight text-white font-sora">From Zero to Fully Operational</h2>
                        <p className="text-zinc-400 text-base leading-relaxed font-dm-sans max-w-xl mx-auto">Get your team up and running in minutes, not days.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                        {[
                            { step: "01", icon: <FiStar size={24} />, title: "Create Your Organization", desc: "Sign up and set up your organization in seconds. Define your company name, configure working hours, and set up office locations with geo-fenced boundaries.", color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
                            { step: "02", icon: <FiUsers size={24} />, title: "Invite Your Team", desc: "Invite members via email or share your unique invite code. Assign roles — Owner, Admin, Member, or Client — and let team members join with a single click.", color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
                            { step: "03", icon: <FiZap size={24} />, title: "Start Commanding", desc: "Go live immediately. Track attendance, assign tasks, generate AI reports with Pip, manage projects, and orchestrate your entire operation from one place.", color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" }
                        ].map((step, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true, margin: "-50px" }}
                                transition={{ delay: i * 0.15, duration: 0.5 }}
                                className="relative p-8 rounded-[2rem] border border-white/5 bg-white/[0.01] text-left group hover:bg-white/[0.02] transition-all duration-500"
                            >
                                <div className="flex items-center gap-4 mb-6">
                                    <span className="text-5xl font-black text-white/5 font-sora leading-none">{step.step}</span>
                                    <div className={`w-12 h-12 rounded-2xl ${step.bg} ${step.border} flex items-center justify-center ${step.color} group-hover:scale-105 transition-transform`}>{step.icon}</div>
                                </div>
                                <h3 className="text-xl font-bold text-white font-sora mb-3">{step.title}</h3>
                                <p className="text-sm text-zinc-500 leading-relaxed font-dm-sans">{step.desc}</p>
                            </motion.div>
                        ))}
                    </div>

                    <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center pt-8">
                        <Link href="/register" className="inline-flex items-center gap-3 px-8 py-4 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase tracking-widest transition-all border border-emerald-400/30 shadow-lg shadow-emerald-500/10">
                            Get Started Now <FiArrowRight />
                        </Link>
                    </motion.div>
                </div>
            </section>

            {/* Security */}
            <section id="security" className="py-40 px-6 relative overflow-hidden bg-zinc-950 border-t border-white/5">
                <div className="max-w-7xl mx-auto space-y-16">
                    <div className="max-w-3xl space-y-6 text-left">
                        <h2 className="text-4xl md:text-6xl font-bold tracking-tightest leading-tight text-white font-sora">Data You Control, <br />Always</h2>
                        <p className="text-zinc-400 text-lg leading-relaxed font-dm-sans">Your workflows, tasks, logs, and calendar items remain completely encrypted. Enterprise-grade AI inference with zero telemetry leakage.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {[
                            { icon: <FiShield className="text-xl text-emerald-400" />, title: "100% Data Sovereignty", desc: "Your data stays on your infrastructure. No third-party cloud storage, no unauthorized access, complete control." },
                            { icon: <FiCpu className="text-xl text-emerald-400" />, title: "Encrypted AI Processing", desc: "Powered by NVIDIA NIM (Minimax-M3) with enterprise-grade encryption. Your prompts and data are never used for training." },
                            { icon: <FiServer className="text-xl text-emerald-400" />, title: "Role-Based Access Control", desc: "Granular permissions across Owner, Admin, Member, and Client roles. Full audit logging for every action taken." }
                        ].map((card, i) => (
                            <motion.div
                                key={i}
                                whileHover={{ y: -8, borderColor: "rgba(16, 185, 129, 0.2)", backgroundColor: "rgba(255,255,255,0.02)" }}
                                transition={{ duration: 0.3 }}
                                className="p-8 rounded-[2.5rem] bg-white/[0.01] border border-white/5 text-left space-y-6 group cursor-default"
                            >
                                <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center group-hover:scale-105 transition-transform duration-300">{card.icon}</div>
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
            <section id="pricing" className="py-40 px-6 relative overflow-hidden bg-zinc-950 border-t border-white/5">
                <div className="max-w-7xl mx-auto space-y-16 text-center">
                    <div className="space-y-6 max-w-3xl mx-auto text-center">
                        <span className="text-emerald-400 text-[10px] font-bold uppercase tracking-[0.4em] mb-2 block font-sora">Simple Scale</span>
                        <h2 className="text-4xl md:text-6xl font-bold tracking-tightest leading-tight text-white font-sora">Transparent Plans for Any Scale</h2>
                        <p className="text-zinc-400 text-base md:text-lg leading-relaxed font-dm-sans">Start free. Scale as you grow.</p>
                    </div>

                    <div className="relative flex items-center bg-white/[0.02] border border-white/5 rounded-full p-1 w-fit mx-auto z-10">
                        {['Monthly', 'Annual'].map((cycle) => (
                            <button
                                key={cycle}
                                onClick={() => setBillingCycle(cycle)}
                                className="px-5 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest relative z-30 transition-all font-sora"
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
                            { name: "Professional", price: billingCycle === 'Monthly' ? '29' : '19', desc: "For growing teams needing advanced features and AI insights.", features: ["Unlimited team members", "Advanced Pip AI reports", "Custom geo-fence zones", "Priority support"], popular: true },
                            { name: "Enterprise", price: "Custom", desc: "For organizations requiring dedicated infrastructure and SLAs.", features: ["Self-hosted deployment", "Custom AI model training", "Dedicated compliance", "24/7 support SLA"] }
                        ].map((tier, idx) => (
                            <motion.div
                                key={idx}
                                whileHover={{ y: -8 }}
                                transition={{ duration: 0.3 }}
                                className={`p-8 rounded-[2.5rem] border flex flex-col justify-between relative group ${tier.popular ? 'border-emerald-500/80 bg-zinc-900/40 shadow-xl shadow-emerald-500/5 hover:border-emerald-400' : 'border-zinc-800/80 bg-zinc-900/30 hover:border-zinc-700 hover:bg-zinc-900/50'}`}
                            >
                                {tier.popular && <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-emerald-500 text-white text-[8px] font-bold uppercase tracking-widest font-sora shadow-md">Most Popular</div>}
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
                                    <ul className="space-y-3 pt-6 border-t border-white/5 font-dm-sans flex-1 mt-6">
                                        {tier.features.map((feat, fIdx) => (
                                            <li key={fIdx} className="flex items-center gap-3 text-xs text-zinc-400 font-medium">
                                                <FiCheck className="text-emerald-500 flex-shrink-0 text-xs" />
                                                <span>{feat}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <div className="pt-8 mt-auto">
                                    <Link href="/register" className={`w-full text-center py-4 rounded-full text-[10px] font-bold uppercase tracking-wider block transition-all font-sora ${tier.popular ? 'bg-emerald-600 text-white hover:bg-emerald-500 border border-emerald-400/30' : 'bg-white/[0.03] text-white hover:bg-white/[0.06] border border-white/10'}`}>Get Started</Link>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* FAQ */}
            <section className="py-40 px-6 relative overflow-hidden bg-zinc-950 border-t border-white/5">
                <div className="max-w-4xl mx-auto space-y-16">
                    <div className="space-y-6 text-center">
                        <h2 className="text-4xl md:text-5xl font-bold tracking-tightest leading-tight text-white font-sora">Frequently Asked Questions</h2>
                        <p className="text-zinc-500 text-sm leading-relaxed max-w-xl mx-auto font-dm-sans">Everything you need to know about the platform, security, and getting started.</p>
                    </div>

                    <div className="space-y-4">
                        {faqs.map((faq, index) => (
                            <div key={index} className="rounded-3xl border border-white/5 bg-white/[0.01] overflow-hidden transition-all duration-300">
                                <button onClick={() => setActiveFaq(activeFaq === index ? null : index)} className="w-full px-8 py-6 flex items-center justify-between text-left group">
                                    <div className="flex items-center gap-4">
                                        <FiHelpCircle className="text-zinc-500 group-hover:text-emerald-400 transition-colors" />
                                        <span className="text-sm font-bold text-white uppercase tracking-tightest font-sora group-hover:text-zinc-200 transition-colors">{faq.q}</span>
                                    </div>
                                    <motion.div animate={{ rotate: activeFaq === index ? 180 : 0 }} transition={{ duration: 0.2 }}>
                                        <FiChevronDown className="text-zinc-500 group-hover:text-white transition-colors" />
                                    </motion.div>
                                </button>
                                <AnimatePresence initial={false}>
                                    {activeFaq === index && (
                                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}>
                                            <div className="px-8 pb-6 text-xs text-zinc-400 leading-relaxed font-dm-sans border-t border-white/5 pt-4">{faq.a}</div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Final CTA */}
            <section className="py-40 px-6 relative overflow-hidden bg-zinc-950 border-t border-white/5">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-emerald-500/5 blur-[120px] rounded-full pointer-events-none -z-10" />
                <div className="max-w-4xl mx-auto text-center space-y-10">
                    <h2 className="text-4xl md:text-8xl font-bold tracking-tightest leading-[0.95] text-white font-sora">Take Control of <br /> Your Operations</h2>
                    <p className="text-zinc-500 text-lg max-w-2xl mx-auto leading-relaxed font-dm-sans">Create your organization, invite your team, and start commanding in minutes. No credit card required.</p>
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                        <Link href="/register" className="inline-flex items-center gap-3 px-10 py-5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase tracking-widest transition-all border border-emerald-400/30 shadow-lg shadow-emerald-500/10">
                            Create Your Account <FiArrowRight />
                        </Link>
                    </motion.div>
                    <div className="flex flex-wrap items-center justify-center gap-6 text-zinc-500 text-xs font-medium pt-4">
                        <span className="flex items-center gap-2"><FiCheck className="text-emerald-500" /> No credit card required</span>
                        <span className="flex items-center gap-2"><FiCheck className="text-emerald-500" /> Free starter plan</span>
                        <span className="flex items-center gap-2"><FiCheck className="text-emerald-500" /> Cancel anytime</span>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-20 px-6 border-t border-white/5 bg-zinc-950">
                <div className="max-w-7xl mx-auto">
                    <div className="flex flex-col md:flex-row items-start justify-between gap-12 pb-16 text-left">
                        <div className="space-y-6">
                            <Link href="/" className="flex items-center gap-3">
                                <Image src="/logo.svg" alt="MD Logo" width={28} height={28} />
                                <span className="text-xl font-bold tracking-tightest font-sora">MD<span className="text-emerald-500">Dash</span></span>
                            </Link>
                            <p className="text-zinc-500 text-sm max-w-xs leading-relaxed font-dm-sans">The strategic command center for high-level management and precise operational execution.</p>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-16 font-sora text-[11px] font-bold uppercase tracking-widest">
                            <div className="space-y-4">
                                <h4 className="text-white">Platform</h4>
                                <ul className="space-y-2 text-zinc-500 font-bold uppercase tracking-widest">
                                    <li><Link href="#attendance" className="hover:text-emerald-400 transition-colors">Attendance</Link></li>
                                    <li><Link href="#pip-ai" className="hover:text-emerald-400 transition-colors">Pip AI</Link></li>
                                    <li><Link href="#features" className="hover:text-emerald-400 transition-colors">Features</Link></li>
                                    <li><Link href="#how-it-works" className="hover:text-emerald-400 transition-colors">How It Works</Link></li>
                                    <li><Link href="#pricing" className="hover:text-emerald-400 transition-colors">Pricing</Link></li>
                                    <li><Link href="/login" className="hover:text-emerald-400 transition-colors">Sign In</Link></li>
                                </ul>
                            </div>
                            <div className="space-y-4">
                                <h4 className="text-white">Compliance</h4>
                                <ul className="space-y-2 text-zinc-500 font-bold uppercase tracking-widest">
                                    <li><Link href="/privacy" className="hover:text-emerald-400 transition-colors">Privacy Policy</Link></li>
                                    <li><Link href="/terms" className="hover:text-emerald-400 transition-colors">Terms of Service</Link></li>
                                    <li><button onClick={() => window.dispatchEvent(new CustomEvent('open-cookie-settings'))} className="hover:text-emerald-400 transition-colors text-left">Cookie Settings</button></li>
                                </ul>
                            </div>
                            <div className="space-y-4">
                                <h4 className="text-white">Connect</h4>
                                <ul className="space-y-2 text-zinc-500 font-bold uppercase tracking-widest">
                                    <li><Link href="mailto:intelligence@md-dash.com" className="hover:text-emerald-400 transition-colors">Contact</Link></li>
                                    <li><Link href="#" className="hover:text-emerald-400 transition-colors">LinkedIn</Link></li>
                                    <li><Link href="#" className="hover:text-emerald-400 transition-colors">X / Twitter</Link></li>
                                </ul>
                            </div>
                        </div>
                    </div>
                    <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4 text-[9px] font-bold uppercase tracking-widest text-zinc-600 font-sora">
                        <span>© 2026 MD-DASH. ALL RIGHTS RESERVED.</span>
                        <div className="flex gap-6 text-zinc-500">
                            <span className="text-emerald-500/50">SYSTEM STATUS: OPTIMAL</span>
                            <span>VERSION 1.2.0</span>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
