"use client";

import React, { useState, useEffect, useRef, useLayoutEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { 
    FiArrowRight, 
    FiZap, 
    FiLock, 
    FiMenu, 
    FiX,
    FiCheck,
    FiShield,
    FiCpu,
    FiServer,
    FiChevronDown,
    FiHelpCircle
} from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import WaitlistForm from '@/components/ui/waitlist-form';
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
    const screensRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetch('/api/auth/session')
            .then(res => {
                const contentType = res.headers.get("content-type");
                if (contentType && contentType.indexOf("application/json") !== -1) {
                    return res.json();
                } else {
                    return null;
                }
            })
            .then(session => {
                if (!session) return;
                const searchParams = new URLSearchParams(window.location.search);
                if (Object.keys(session).length > 0 && searchParams.get('home') !== 'true') {
                    window.location.href = '/dashboard';
                }
            })
            .catch(err => console.error('Session check failed:', err));
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

            // 1. Expansion phase
            tl.to(zoomRef.current, {
                maxWidth: '100%',
                width: '100%',
                padding: '0 2rem',
                duration: 1,
                ease: "power2.inOut"
            });

            // 2. Playback phase - cycle through 5 screens
            const screens = ['Dashboard', 'Tasks', 'Notes', 'Users', 'Time Off'];
            screens.forEach((screen, index) => {
                if (index > 0) {
                    // Fade in next screen
                    tl.to(`.screen-${index}`, {
                        opacity: 1,
                        duration: 1,
                        onStart: () => setActiveTab(screen),
                        onReverseComplete: () => setActiveTab(screens[index-1])
                    }, `screen-${index}`);
                }
            });

            // Wait at the end
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
            q: "Do I need a continuous internet connection?",
            a: "No. The entire platform, including database storage, task tracking, and note taking, operates completely offline. An internet connection is only needed if you explicitly enable external sync integrations."
        },
        {
            q: "What local models are supported?",
            a: "The assistant uses NVIDIA cloud models (Minimax-M3) for intelligent task analysis, monthly report generation, and productivity insights. Policies ensure your data is handled with enterprise-grade security."
        },
        {
            q: "How is data sync secured across my devices?",
            a: "If you choose to sync multiple devices, MD-Dash uses peer-to-peer end-to-end encryption. Your devices connect directly to each other via secure keys without passing through intermediate cloud servers."
        }
    ];

    return (
        <div className="min-h-screen bg-zinc-950 text-white selection:bg-indigo-500/30 overflow-x-hidden">
            {/* Custom Grid / Backdrop glow effects */}
            <div className="absolute top-0 inset-x-0 h-[64rem] bg-radial-glow pointer-events-none -z-10" 
                style={{
                    backgroundImage: 'radial-gradient(circle at 50% 0%, rgba(99, 102, 241, 0.08) 0%, rgba(16, 185, 129, 0.02) 50%, transparent 100%)'
                }}
            />
            {/* Grid Pattern Mesh */}
            <div className="absolute top-0 inset-x-0 h-[64rem] opacity-[0.03] pointer-events-none -z-10 bg-[linear-gradient(to_right,rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[size:4rem_4rem]" />

            {/* Navigation Header - Floating Capsule Style */}
            <nav className="fixed top-0 inset-x-0 z-50 transition-all duration-300 px-6 pt-6">
                <div className="max-w-5xl mx-auto rounded-full bg-zinc-900/60 backdrop-blur-xl border border-white/10 px-6 py-3 flex items-center justify-between shadow-lg">
                    <div className="flex items-center gap-3">
                        <Image src="/logo.svg" alt="MD Logo" width={26} height={26} className="w-6.5 h-6.5" />
                        <span className="text-base font-bold tracking-tightest font-sora text-white">
                            MD<span className="text-emerald-500">Dash</span>
                        </span>
                    </div>

                    {/* Desktop Menu */}
                    <div className="hidden md:flex items-center gap-8 font-dm-sans text-xs font-semibold">
                        <Link href="#features" className="text-zinc-400 hover:text-white transition-colors relative group py-1.5">
                            Features
                            <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-indigo-500 group-hover:w-full transition-all duration-300" />
                        </Link>
                        <Link href="#security" className="text-zinc-400 hover:text-white transition-colors relative group py-1.5">
                            Security
                            <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-indigo-500 group-hover:w-full transition-all duration-300" />
                        </Link>
                        <Link href="#pricing" className="text-zinc-400 hover:text-white transition-colors relative group py-1.5">
                            Pricing
                            <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-indigo-500 group-hover:w-full transition-all duration-300" />
                        </Link>
                        <Link href="/wiki" className="text-zinc-400 hover:text-white transition-colors relative group py-1.5">
                            Wiki
                            <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-indigo-500 group-hover:w-full transition-all duration-300" />
                        </Link>
                        <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                            <Link 
                                href="#waitlist" 
                                className="px-4 py-2 rounded-full bg-white text-zinc-950 hover:bg-zinc-200 transition-all text-[10px] font-bold uppercase tracking-wider"
                            >
                                Request Access
                            </Link>
                        </motion.div>
                    </div>

                    {/* Mobile Menu Toggle */}
                    <button 
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        className="md:hidden text-zinc-400 hover:text-white transition-colors"
                    >
                        {mobileMenuOpen ? <FiX className="text-xl" /> : <FiMenu className="text-xl" />}
                    </button>
                </div>

                {/* Mobile Dropdown Menu */}
                <AnimatePresence>
                    {mobileMenuOpen && (
                        <motion.div 
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                            className="md:hidden absolute top-20 left-6 right-6 p-6 rounded-3xl bg-zinc-900 border border-white/10 shadow-2xl flex flex-col gap-4 font-dm-sans text-sm"
                        >
                            <Link 
                                href="#features" 
                                onClick={() => setMobileMenuOpen(false)}
                                className="text-zinc-400 hover:text-white transition-colors py-2 border-b border-white/5 text-left"
                            >
                                Features
                            </Link>
                            <Link 
                                href="#security" 
                                onClick={() => setMobileMenuOpen(false)}
                                className="text-zinc-400 hover:text-white transition-colors py-2 border-b border-white/5 text-left"
                            >
                                Security
                            </Link>
                            <Link 
                                href="#pricing" 
                                onClick={() => setMobileMenuOpen(false)}
                                className="text-zinc-400 hover:text-white transition-colors py-2 border-b border-white/5 text-left"
                            >
                                Pricing
                            </Link>
                            <Link 
                                href="/wiki" 
                                onClick={() => setMobileMenuOpen(false)}
                                className="text-zinc-400 hover:text-white transition-colors py-2 border-b border-white/5 text-left"
                            >
                                Wiki
                            </Link>
                            <Link 
                                href="#waitlist" 
                                onClick={() => setMobileMenuOpen(false)}
                                className="mt-2 w-full text-center px-4 py-3 rounded-full bg-white text-zinc-950 font-bold text-xs uppercase tracking-wider block"
                            >
                                Request Access
                            </Link>
                        </motion.div>
                    )}
                </AnimatePresence>
            </nav>

            {/* Hero Section */}
            <section className="relative pt-44 pb-20 px-6 overflow-hidden">
                <div className="max-w-7xl mx-auto text-center space-y-10">
                    <motion.div 
                        {...fadeIn}
                        className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full border border-indigo-500/20 bg-indigo-500/5 text-indigo-400 text-[9px] font-bold uppercase tracking-[0.3em] font-sora"
                    >
                        <span className="relative flex h-1.5 w-1.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                        </span>
                        Private Beta — Join the Waitlist
                    </motion.div>

                    <motion.h1 
                        {...fadeIn}
                        transition={{ delay: 0.1 }}
                        className="text-5xl md:text-[7.2rem] font-bold tracking-tightest leading-[0.98] text-white font-sora"
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
                        A premium, AI-powered productivity platform designed for high-level management. 
                        Join the waitlist for early access and shape the future of strategic command.
                    </motion.p>

                    <motion.div 
                        {...fadeIn}
                        transition={{ delay: 0.3 }}
                        className="flex flex-col md:flex-row items-center justify-center gap-6 pt-4"
                    >
                        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="w-full md:w-auto">
                            <Link 
                                href="#waitlist" 
                                className="w-full md:w-auto px-10 py-5 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-3 group transition-all border border-indigo-400/30 shadow-lg shadow-indigo-500/10"
                            >
                                Join the Waitlist <FiArrowRight className="group-hover:translate-x-1 transition-transform" />
                            </Link>
                        </motion.div>
                        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="w-full md:w-auto">
                            <Link 
                                href="/login" 
                                className="w-full md:w-auto px-10 py-5 rounded-full bg-white/[0.02] hover:bg-white/[0.04] border border-white/10 text-white text-xs font-bold uppercase tracking-widest transition-all"
                            >
                                Executive Login
                            </Link>
                        </motion.div>
                    </motion.div>

                    {/* Interface Showcase with GSAP Zoom */}
                    <div ref={containerRef} className="relative mt-20 pt-10 pb-36">
                        <div ref={zoomRef} className="relative mx-auto max-w-5xl">
                            {/* Glow behind container */}
                            <div className="absolute inset-0 bg-indigo-500/5 blur-[120px] rounded-[3rem] pointer-events-none -z-10" />

                            <div className="relative p-2 rounded-[2.5rem] bg-zinc-900/40 backdrop-blur-xl border border-white/10 overflow-hidden group">
                                <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000 pointer-events-none" />
                                
                                {/* Interface Content / Carousel */}
                                <div className="rounded-[2rem] overflow-hidden border border-white/5 bg-zinc-950/50">
                                    <div className="h-14 border-b border-white/10 bg-zinc-900/30 flex items-center px-6 justify-between">
                                        <div className="flex gap-1.5">
                                            <div className="w-3 h-3 rounded-full bg-white/5 border border-white/10" />
                                            <div className="w-3 h-3 rounded-full bg-white/5 border border-white/10" />
                                            <div className="w-3 h-3 rounded-full bg-white/5 border border-white/10" />
                                        </div>
                                        
                                        {/* Carousel Tabs */}
                                        <div className="flex items-center bg-white/[0.02] rounded-full p-1 border border-white/5 relative z-30">
                                            {['Dashboard', 'Tasks', 'Notes', 'Users', 'Time Off'].map((tab) => (
                                                <button
                                                    key={tab}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setActiveTab(tab);
                                                    }}
                                                    className="px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all relative z-40 font-sora"
                                                    style={{ color: activeTab === tab ? '#09090b' : '#71717a' }}
                                                >
                                                    {activeTab === tab && (
                                                        <motion.div
                                                            layoutId="active-showcase-tab"
                                                            className="absolute inset-0 bg-white rounded-full -z-10"
                                                            transition={{ type: "spring", stiffness: 380, damping: 30 }}
                                                        />
                                                    )}
                                                    <span className="relative z-50">{tab}</span>
                                                </button>
                                            ))}
                                        </div>

                                        <div className="w-20 flex justify-end">
                                            <Image src="/logo.svg" alt="Logo" width={20} height={20} className="opacity-50" />
                                        </div>
                                    </div>
                                    
                                    <div ref={screensRef} className="aspect-[16/10] bg-zinc-900 relative overflow-hidden">
                                        {/* Stacked Screen Images for GSAP Playback */}
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
                                                <Image 
                                                    src={`/screenshots/${screen.file}.png`}
                                                    alt={`${screen.name} Interface`}
                                                    fill
                                                    className="object-cover"
                                                    priority={index === 0}
                                                />
                                            </div>
                                        ))}
                                        {/* Glare Glass Overlay */}
                                        <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/[0.02] to-white/0 pointer-events-none z-20" />
                                        {/* Fallback pattern */}
                                        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-zinc-800 to-zinc-950" />
                                    </div>
                                </div>
                            </div>
                            
                            {/* Floating Stats / Indicators */}
                            <div className="absolute -top-6 -right-6 p-4 rounded-2xl bg-zinc-900/80 backdrop-blur-md border border-white/10 z-20 hidden md:block">
                                <div className="flex items-center gap-3">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 font-sora">System Live</span>
                                </div>
                            </div>
                            <div className="absolute -bottom-6 -left-6 p-4 rounded-2xl bg-zinc-900/80 backdrop-blur-md border border-white/10 z-20 hidden md:block">
                                <div className="flex items-center gap-3">
                                    <FiLock className="text-indigo-400" />
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 font-sora">End-to-End Encrypted</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section - Clean Product Spec Rows */}
            <section id="features" className="py-40 px-6 relative overflow-hidden bg-zinc-950 border-t border-white/5 noise">
                <div className="max-w-7xl mx-auto space-y-32">
                    <div className="max-w-3xl space-y-6 text-left">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-widest font-sora">
                            Platform Pillars
                        </div>
                        <h2 className="text-4xl md:text-6xl font-bold tracking-tightest leading-tight text-white font-sora">Built for Professional <br /> Orchestration</h2>
                        <p className="text-zinc-400 text-lg leading-relaxed font-dm-sans">
                            MD-Dash is built from the ground up for high-level management. An elegant ecosystem designed to amplify cognitive focus and minimize organizational overhead.
                        </p>
                    </div>

                    <div className="space-y-40">
                        {[
                            {
                                title: "AI-Powered Command Center",
                                subtitle: "INTELLIGENCE V1.2",
                                desc: "Our local-first intelligence generates proactive daily briefings, prioritizes your agenda, and decomposes complex objectives into actionable paths.",
                                image: "/screenshots/ai.png",
                                reverse: false
                            },
                            {
                                title: "Precision Task Ecosystem",
                                subtitle: "OPERATIONS",
                                desc: "The Task Grid combines deep-work timers with integrated decision synthesis. Manage high-level projects with absolute clarity and zero friction.",
                                image: "/screenshots/tasks.png",
                                reverse: true
                            },
                            {
                                title: "Zero-Cloud Sovereignty",
                                subtitle: "PRIVACY FIRST",
                                desc: "Enterprise-grade AI powered by NVIDIA cloud models (Minimax-M3). Smart analysis, monthly reports, and productivity insights on demand.",
                                image: "/screenshots/team.png",
                                reverse: false
                            }
                        ].map((feature, i) => (
                            <motion.div 
                                key={i}
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true, margin: "-100px" }}
                                transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] as const }}
                                className={`flex flex-col ${feature.reverse ? 'lg:flex-row-reverse' : 'lg:flex-row'} gap-16 lg:gap-24 items-center`}
                            >
                                <div className="flex-1 space-y-6 text-left">
                                    <span className="text-indigo-400 text-[10px] font-bold uppercase tracking-[0.4em] mb-2 block font-sora">{feature.subtitle}</span>
                                    <h3 className="text-3xl md:text-5xl font-bold tracking-tightest leading-tight text-white font-sora">{feature.title}</h3>
                                    <p className="text-zinc-400 text-base md:text-lg leading-relaxed font-dm-sans">{feature.desc}</p>
                                </div>
                                <div className="flex-1 w-full relative">
                                    <motion.div 
                                        whileHover={{ scale: 1.01 }}
                                        className="relative rounded-3xl overflow-hidden border border-white/10 bg-zinc-900 group shadow-2xl"
                                    >
                                        <div className="absolute inset-0 bg-indigo-500/5 group-hover:bg-transparent transition-colors duration-700 z-10 pointer-events-none" />
                                        <Image 
                                            src={feature.image} 
                                            alt={feature.title} 
                                            width={800}
                                            height={600}
                                            className="w-full h-auto group-hover:scale-103 transition-transform duration-1000" 
                                        />
                                    </motion.div>
                                    {/* Accent Decoration */}
                                    <div className={`absolute -bottom-6 ${feature.reverse ? '-left-6' : '-right-6'} w-32 h-32 bg-indigo-500/5 blur-3xl opacity-50 -z-10`} />
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Security Section (Local First Spec) */}
            <section id="security" className="py-40 px-6 relative overflow-hidden bg-zinc-950 border-t border-white/5 noise">
                <div className="max-w-7xl mx-auto space-y-16">
                    <div className="max-w-3xl space-y-6 text-left">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-bold uppercase tracking-widest font-sora">
                            Zero Cloud
                        </div>
                        <h2 className="text-4xl md:text-6xl font-bold tracking-tightest leading-tight text-white font-sora">Military Grade Local Security</h2>
                        <p className="text-zinc-400 text-lg leading-relaxed font-dm-sans">
                            Your workflows, tasks, logs, and calendar items remain completely encrypted on your workspace hardware. Secure LLM inference runs locally with zero telemetry leakage.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {[
                            {
                                icon: <FiShield className="text-xl text-indigo-400" />,
                                title: "100% Local Inference",
                                desc: "Integrated LLM weights run on-device via Apple Metal and CUDA, preventing private files from touching external servers."
                            },
                            {
                                icon: <FiCpu className="text-xl text-emerald-400" />,
                                title: "Hardware Isolation",
                                desc: "Utilizes secure enclaves and hardware-isolated SQLite vaults to seal task databases, keys, and session cookies."
                            },
                            {
                                icon: <FiServer className="text-xl text-indigo-400" />,
                                title: "Zero Third-Party Sync",
                                desc: "No centralized cloud DBs. Multi-device calendar and notes sync occurs via peer-to-peer end-to-end encrypted networks."
                            }
                        ].map((card, i) => (
                            <motion.div
                                key={i}
                                whileHover={{ y: -8, borderColor: "rgba(99, 102, 241, 0.2)", backgroundColor: "rgba(255,255,255,0.02)" }}
                                transition={{ duration: 0.3 }}
                                className="p-8 rounded-[2.5rem] bg-white/[0.01] border border-white/5 text-left space-y-6 group cursor-default"
                            >
                                <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
                                    {card.icon}
                                </div>
                                <div className="space-y-2">
                                    <h4 className="text-lg font-bold text-white font-sora">{card.title}</h4>
                                    <p className="text-zinc-500 text-sm leading-relaxed font-dm-sans">{card.desc}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Pricing Section (Interactive Plan Selector) */}
            <section id="pricing" className="py-40 px-6 relative overflow-hidden bg-zinc-950 border-t border-white/5 noise">
                <div className="max-w-7xl mx-auto space-y-16 text-center">
                    <div className="space-y-6 max-w-3xl mx-auto text-center">
                        <span className="text-emerald-400 text-[10px] font-bold uppercase tracking-[0.4em] mb-2 block font-sora">Simple Scale</span>
                        <h2 className="text-4xl md:text-6xl font-bold tracking-tightest leading-tight text-white font-sora">Transparent Plans for Any Scale</h2>
                        <p className="text-zinc-400 text-base md:text-lg leading-relaxed font-dm-sans">
                            Deploy MD-Dash on your team hardware. Choose the tier that matches your processing power and sovereignty needs.
                        </p>
                    </div>

                    {/* Billing Toggle */}
                    <div className="relative flex items-center bg-white/[0.02] border border-white/5 rounded-full p-1 w-fit mx-auto z-10">
                        {['Monthly', 'Annual'].map((cycle) => (
                            <button
                                key={cycle}
                                onClick={() => setBillingCycle(cycle)}
                                className="px-5 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest relative z-30 transition-all font-sora"
                                style={{ color: billingCycle === cycle ? '#09090b' : '#71717a' }}
                            >
                                {billingCycle === cycle && (
                                    <motion.div
                                        layoutId="billing-pill"
                                        className="absolute inset-0 bg-white rounded-full -z-10"
                                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                                    />
                                )}
                                <span className="relative z-40">{cycle}</span>
                            </button>
                        ))}
                    </div>

                    {/* Pricing Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto pt-10 text-left items-stretch">
                        {[
                            {
                                name: "Developer",
                                price: "0",
                                desc: "For individual executives testing secure local-first operations.",
                                features: ["Single-device databases", "Llama 3/Mistral local parsing", "Daily executive briefings", "Standard support"]
                            },
                            {
                                name: "Professional",
                                price: billingCycle === 'Monthly' ? '29' : '19',
                                desc: "For management seeking advanced multi-device sync and local adapters.",
                                features: ["Up to 3 devices peer-to-sync", "Accelerated GPU model pipeline", "Custom prompt adapter training", "Priority Slack support"],
                                popular: true
                            },
                            {
                                name: "Enterprise",
                                price: "Custom",
                                desc: "For corporations requiring site-wide offline licenses and private weights.",
                                features: ["Unlimited team licensing", "Bespoke fine-tuned models", "Dedicated compliance consulting", "24/7 dedicated response SLA"]
                            }
                        ].map((tier, idx) => (
                            <motion.div
                                key={idx}
                                whileHover={{ y: -8 }}
                                transition={{ duration: 0.3 }}
                                className={`p-8 rounded-[2.5rem] border flex flex-col justify-between relative group ${
                                    tier.popular 
                                    ? 'border-indigo-500/80 bg-zinc-900/40 shadow-xl shadow-indigo-500/5 hover:border-indigo-400' 
                                    : 'border-zinc-800/80 bg-zinc-900/30 hover:border-zinc-700 hover:bg-zinc-900/50'
                                }`}
                            >
                                {tier.popular && (
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-indigo-500 text-white text-[8px] font-bold uppercase tracking-widest font-sora shadow-md">
                                        Most Popular
                                    </div>
                                )}
                                <div className="space-y-8 flex-1 flex flex-col justify-between">
                                    <div className="space-y-6">
                                        <div className="space-y-2">
                                            <h4 className="text-xl font-bold text-white font-sora">{tier.name}</h4>
                                            <p className="text-zinc-500 text-xs leading-relaxed font-dm-sans">{tier.desc}</p>
                                        </div>
                                        
                                        <div className="space-y-1.5">
                                            <div className="flex items-baseline gap-1 text-white font-sora">
                                                <span className="text-4xl font-extrabold tracking-tight">
                                                    {tier.price === 'Custom' ? 'Custom' : `$${tier.price}`}
                                                </span>
                                                {tier.price !== 'Custom' && (
                                                    <span className="text-zinc-500 text-xs font-semibold">/month</span>
                                                )}
                                            </div>
                                            <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 font-sora block">
                                                {tier.price === 'Custom' ? 'For large organizations' : (tier.price === '0' ? 'Free forever' : (billingCycle === 'Monthly' ? 'Billed monthly' : 'Billed annually ($228/yr)'))}
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
                                    <Link
                                        href="#waitlist"
                                        className={`w-full text-center py-4 rounded-full text-[10px] font-bold uppercase tracking-wider block transition-all font-sora ${
                                            tier.popular
                                            ? 'bg-indigo-600 text-white hover:bg-indigo-500 border border-indigo-400/30'
                                            : 'bg-white/[0.03] text-white hover:bg-white/[0.06] border border-white/10'
                                        }`}
                                    >
                                        Get Started
                                    </Link>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* FAQ Section (Accordion with heights) */}
            <section className="py-40 px-6 relative overflow-hidden bg-zinc-950 border-t border-white/5 noise">
                <div className="max-w-4xl mx-auto space-y-16">
                    <div className="space-y-6 text-center">
                        <span className="text-indigo-400 text-[10px] font-bold uppercase tracking-[0.4em] mb-2 block font-sora">Clear Answers</span>
                        <h2 className="text-4xl md:text-5xl font-bold tracking-tightest leading-tight text-white font-sora">Frequently Asked Questions</h2>
                        <p className="text-zinc-500 text-sm leading-relaxed max-w-xl mx-auto font-dm-sans">Everything you need to know about the local-first architecture, hardware requirements, and data sovereignty policies.</p>
                    </div>

                    <div className="space-y-4">
                        {faqs.map((faq, index) => (
                            <div 
                                key={index}
                                className="rounded-3xl border border-white/5 bg-white/[0.01] overflow-hidden transition-all duration-300"
                            >
                                <button
                                    onClick={() => setActiveFaq(activeFaq === index ? null : index)}
                                    className="w-full px-8 py-6 flex items-center justify-between text-left group"
                                >
                                    <div className="flex items-center gap-4">
                                        <FiHelpCircle className="text-zinc-500 group-hover:text-indigo-400 transition-colors" />
                                        <span className="text-sm font-bold text-white uppercase tracking-tightest font-sora group-hover:text-zinc-200 transition-colors">{faq.q}</span>
                                    </div>
                                    <motion.div
                                        animate={{ rotate: activeFaq === index ? 180 : 0 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        <FiChevronDown className="text-zinc-500 group-hover:text-white transition-colors" />
                                    </motion.div>
                                </button>
                                
                                <AnimatePresence initial={false}>
                                    {activeFaq === index && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: "auto", opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
                                        >
                                            <div className="px-8 pb-6 text-xs text-zinc-400 leading-relaxed font-dm-sans border-t border-white/5 pt-4">
                                                {faq.a}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA / Waitlist Section */}
            <section id="waitlist" className="py-40 px-6 relative overflow-hidden bg-zinc-950 border-t border-white/5 noise">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-indigo-500/5 blur-[120px] rounded-full pointer-events-none -z-10" />
                
                <div className="max-w-4xl mx-auto text-center space-y-12">
                    <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full border border-indigo-500/20 bg-indigo-500/5 text-indigo-400 text-[10px] font-bold uppercase tracking-widest font-sora">
                        Deployment Wave 04 — Limited Spots
                    </div>
                    <h2 className="text-4xl md:text-8xl font-bold tracking-tightest leading-[0.95] text-white font-sora">Ready for Operational <br /> Mastery?</h2>
                    <p className="text-zinc-500 text-lg max-w-2xl mx-auto leading-relaxed font-dm-sans">
                        Join 200+ executive leaders already on the waitlist. Early adopters get priority access, exclusive features, and a direct line to shape the platform.
                    </p>
                    
                    <WaitlistForm />

                    <div className="flex flex-wrap items-center justify-center gap-6 text-zinc-500 text-xs font-medium">
                        <span className="flex items-center gap-2"><FiCheck className="text-emerald-500" /> No credit card required</span>
                        <span className="flex items-center gap-2"><FiCheck className="text-emerald-500" /> Cancel anytime</span>
                        <span className="flex items-center gap-2"><FiCheck className="text-emerald-500" /> Private beta access</span>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-20 px-6 border-t border-white/5 bg-zinc-950 noise">
                <div className="max-w-7xl mx-auto">
                    <div className="flex flex-col md:flex-row items-start justify-between gap-12 pb-16 text-left">
                        <div className="space-y-6">
                            <div className="flex items-center gap-3">
                                <Image src="/logo.svg" alt="MD Logo" width={28} height={28} />
                                <span className="text-xl font-bold tracking-tightest font-sora">MD<span className="text-emerald-500">Dash</span></span>
                            </div>
                            <p className="text-zinc-500 text-sm max-w-xs leading-relaxed font-dm-sans">
                                The strategic command center for high-level management and precise operational execution.
                            </p>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-16 font-sora text-[11px] font-bold uppercase tracking-widest">
                            <div className="space-y-4">
                                <h4 className="text-white">Platform</h4>
                                <ul className="space-y-2 text-zinc-500 font-bold uppercase tracking-widest">
                                    <li><Link href="#features" className="hover:text-indigo-400 transition-colors font-bold uppercase tracking-widest">Features</Link></li>
                                    <li><Link href="#security" className="hover:text-indigo-400 transition-colors font-bold uppercase tracking-widest">Security</Link></li>
                                    <li><Link href="#pricing" className="hover:text-indigo-400 transition-colors font-bold uppercase tracking-widest">Pricing</Link></li>
                                    <li><Link href="/wiki" className="hover:text-indigo-400 transition-colors font-bold uppercase tracking-widest font-bold uppercase tracking-widest">Wiki</Link></li>
                                    <li><Link href="/login" className="hover:text-indigo-400 transition-colors font-bold uppercase tracking-widest font-bold uppercase tracking-widest">Enterprise Login</Link></li>
                                </ul>
                            </div>
                            <div className="space-y-4">
                                <h4 className="text-white">Compliance</h4>
                                <ul className="space-y-2 text-zinc-500 font-bold uppercase tracking-widest">
                                    <li><Link href="/privacy" className="hover:text-indigo-400 transition-colors font-bold uppercase tracking-widest">Privacy Policy</Link></li>
                                    <li><Link href="/terms" className="hover:text-indigo-400 transition-colors font-bold uppercase tracking-widest">Terms of Service</Link></li>
                                    <li>
                                        <button 
                                            onClick={() => window.dispatchEvent(new CustomEvent('open-cookie-settings'))}
                                            className="hover:text-indigo-400 transition-colors text-left font-bold uppercase tracking-widest"
                                        >
                                            Cookie Settings
                                        </button>
                                    </li>
                                </ul>
                            </div>
                            <div className="space-y-4">
                                <h4 className="text-white">Connect</h4>
                                <ul className="space-y-2 text-zinc-500 font-bold uppercase tracking-widest">
                                    <li><Link href="mailto:intelligence@md-dash.com" className="hover:text-indigo-400 transition-colors font-bold uppercase tracking-widest">Contact</Link></li>
                                    <li><Link href="#" className="hover:text-indigo-400 transition-colors font-bold uppercase tracking-widest font-bold uppercase tracking-widest font-bold uppercase tracking-widest font-bold uppercase tracking-widest font-bold uppercase tracking-widest">LinkedIn</Link></li>
                                    <li><Link href="#" className="hover:text-indigo-400 transition-colors font-bold uppercase tracking-widest font-bold uppercase tracking-widest font-bold uppercase tracking-widest font-bold uppercase tracking-widest font-bold uppercase tracking-widest">X / Twitter</Link></li>
                                </ul>
                            </div>
                        </div>
                    </div>
                    <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4 text-[9px] font-bold uppercase tracking-widest text-zinc-600 font-sora">
                        <span>© 2026 MD-DASH INTELLIGENCE SYSTEM. ALL RIGHTS RESERVED.</span>
                        <div className="flex gap-6 text-zinc-500">
                            <span className="text-emerald-500/50">SYSTEM STATUS: OPTIMAL</span>
                            <span>VERSION 1.2.0-ALPHA</span>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
