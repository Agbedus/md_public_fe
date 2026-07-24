'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { FiArrowLeft, FiShield, FiLock, FiCpu, FiGlobe, FiEye, FiServer, FiDatabase, FiCheckCircle } from 'react-icons/fi';

export default function PrivacyPage() {
    const fadeIn = {
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.6 }
    };

    return (
        <div className="min-h-screen bg-[#090a0c] text-zinc-300 font-inter selection:bg-indigo-500/30 selection:text-white noise">
            {/* Top Navigation */}
            <nav className="fixed top-0 w-full z-50 bg-[#090a0c]/80 backdrop-blur-md border-b border-white/5">
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                        <Image src="/logo.svg" alt="MD Logo" width={32} height={32} />
                        <span className="text-xl font-bold tracking-tight text-white">MD<span className="text-emerald-500">Dash</span></span>
                    </Link>
                    <Link 
                        href="/" 
                        className="flex items-center gap-2 text-sm font-medium text-zinc-400 hover:text-white transition-colors"
                    >
                        <FiArrowLeft /> Back to Mission
                    </Link>
                </div>
            </nav>

            <main className="pt-40 pb-24 px-6">
                <div className="max-w-5xl mx-auto space-y-20">
                    {/* Header Section */}
                    <motion.div {...fadeIn} className="space-y-8 border-b border-white/5 pb-16">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-widest">
                            Privacy Policy v2.2
                        </div>
                        <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-white leading-[1.1]">Privacy <br /> Policy</h1>
                        <p className="text-zinc-500 text-xl max-w-2xl">How MD-Dash handles your data, protects your privacy, and ensures transparency in everything we build.</p>
                        <div className="flex items-center gap-6 pt-4 text-xs font-bold uppercase tracking-widest text-zinc-600">
                            <span>Revision: 07.06.2026</span>
                            <span>Status: Active</span>
                        </div>
                    </motion.div>

                    {/* Executive Summary / Focus */}
                    <motion.div 
                        {...fadeIn} 
                        transition={{ delay: 0.1 }}
                        className="grid grid-cols-1 md:grid-cols-3 gap-8"
                    >
                        <div className="p-8 rounded-[2.5rem] bg-indigo-500/5 border border-indigo-500/10 space-y-4">
                            <FiCpu className="text-2xl text-indigo-400" />
                            <h3 className="font-bold text-white">Data Privacy</h3>
                            <p className="text-xs text-zinc-500 leading-relaxed">Your dashboard data — tasks, notes, projects — stays encrypted and private. AI queries are sent to NVIDIA NIM cloud models; we never use your data for training.</p>
                        </div>
                        <div className="p-8 rounded-[2.5rem] bg-emerald-500/5 border border-emerald-500/10 space-y-4">
                            <FiLock className="text-2xl text-emerald-400" />
                            <h3 className="font-bold text-white">Zero-Knowledge</h3>
                            <p className="text-xs text-zinc-500 leading-relaxed">Our synchronization bridge uses client-side encryption. We cannot see, read, or process your synced mission data.</p>
                        </div>
                        <div className="p-8 rounded-[2.5rem] bg-zinc-900 border border-white/5 space-y-4">
                            <FiGlobe className="text-2xl text-zinc-400" />
                            <h3 className="font-bold text-white">Global Compliance</h3>
                            <p className="text-xs text-zinc-500 leading-relaxed">Aligned with GDPR, CCPA/CPRA, and NIST privacy frameworks for international operational safety.</p>
                        </div>
                    </motion.div>

                    {/* Detailed Content */}
                    <div className="space-y-24">
                        {/* Section 1 */}
                        <motion.section {...fadeIn} className="space-y-8">
                            <div className="flex items-start gap-6">
                                <span className="text-4xl font-black text-white/10 shrink-0">01</span>
                                <div className="space-y-4">
                                    <h2 className="text-3xl font-bold text-white">Information Taxonomy & Collection</h2>
                                    <p className="text-zinc-400 leading-relaxed px-1">We categorize data into three distinct operational tiers to ensure minimum necessary collection.</p>
                                    
                                    <div className="space-y-6 pt-4">
                                        <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 space-y-3">
                                            <h4 className="font-bold text-white flex items-center gap-2">
                                                <FiEye className="text-indigo-400" /> Tier I: Identity & Access Data
                                            </h4>
                                            <p className="text-sm text-zinc-500">Collected during registration and authentication. Includes email address, encrypted password hashes, and session tokens. <strong>Retained until account termination.</strong></p>
                                        </div>
                                        <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 space-y-3">
                                            <h4 className="font-bold text-white flex items-center gap-2">
                                                <FiDatabase className="text-emerald-400" /> Tier II: Operational Metadata
                                            </h4>
                                            <p className="text-sm text-zinc-500">Anonymized logs regarding system performance, feature usage frequency, and local AI error rates. <strong>Retained for 90 days for optimization.</strong></p>
                                        </div>
                                        <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 space-y-3">
                                            <h4 className="font-bold text-white flex items-center gap-2">
                                                <FiServer className="text-zinc-400" /> Tier III: Encrypted Mission Sync
                                            </h4>
                                            <p className="text-sm text-zinc-500">End-to-end encrypted mission materials (Tasks, Notes, Projects). We function as a passive conduit. <strong>MD-DASH has no access keys to Tier III data.</strong></p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.section>

                        {/* Section 2 */}
                        <motion.section {...fadeIn} className="space-y-8">
                            <div className="flex items-start gap-6">
                                <span className="text-4xl font-black text-white/10 shrink-0">02</span>
                                <div className="space-y-4">
                                    <h2 className="text-3xl font-bold text-white">AI Assistant & Data Privacy</h2>
                                    <p className="text-zinc-400 leading-relaxed">Pip AI, the MD-Dash AI assistant, is powered by NVIDIA NIM (Minimax-M3) cloud models. Here's how your data is handled:</p>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6">
                                        <div className="space-y-4">
                                            <h4 className="font-bold text-white underline decoration-indigo-500/50 underline-offset-4">Query Handling</h4>
                                            <p className="text-sm text-zinc-500">When you interact with Pip AI, your query is sent securely via encrypted API to NVIDIA NIM. We do not store prompts or responses beyond the current session. No training occurs on your data.</p>
                                        </div>
                                        <div className="space-y-4">
                                            <h4 className="font-bold text-white underline decoration-emerald-500/50 underline-offset-4">Data Isolation</h4>
                                            <p className="text-sm text-zinc-500">Your organizational data — tasks, notes, projects — remains in our encrypted database. Pip AI only sees what you explicitly ask about in each query. We never bulk-export your data to AI providers.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.section>

                        {/* Section 3 */}
                        <motion.section {...fadeIn} className="space-y-8">
                            <div className="flex items-start gap-6">
                                <span className="text-4xl font-black text-white/10 shrink-0">03</span>
                                <div className="space-y-4">
                                    <h2 className="text-3xl font-bold text-white">Legal Processing Bases (GDPR/CCPA)</h2>
                                    <p className="text-zinc-400 leading-relaxed">Under the General Data Protection Regulation (GDPR) and California Consumer Privacy Act (CCPA), we process your information based on the following legal pillars:</p>
                                    
                                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-4 list-none pl-0">
                                        {[
                                            { title: "Contractual Necessity", desc: "To provide the operational intelligence features you signed up for." },
                                            { title: "Legitimate Interest", desc: "To secure the platform against threats and optimize performance." },
                                            { title: "Explicit Consent", desc: "For optional features like multi-device cloud synchronization." },
                                            { title: "Legal Obligation", desc: "When required to comply with binding government directives." }
                                        ].map((base, i) => (
                                            <li key={i} className="p-4 rounded-xl bg-white/[0.01] border border-white/5 flex gap-3">
                                                <FiCheckCircle className="text-emerald-500 shrink-0 mt-1" />
                                                <div>
                                                    <span className="font-bold text-white block text-sm">{base.title}</span>
                                                    <span className="text-xs text-zinc-500">{base.desc}</span>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </motion.section>

                        {/* Section 4 */}
                        <motion.section {...fadeIn} className="space-y-8">
                            <div className="flex items-start gap-6">
                                <span className="text-4xl font-black text-white/10 shrink-0">04</span>
                                <div className="space-y-4">
                                    <h2 className="text-3xl font-bold text-white">International Data Transfers</h2>
                                    <p className="text-zinc-400 leading-relaxed">MD-Dash is a global platform. While your mission data stays local, Tier I and Tier II data may be processed in several jurisdictions. We utilize Standard Contractual Clauses (SCCs) to ensure equivalent protection levels across all boundaries.</p>
                                    
                                    <div className="p-8 rounded-[2rem] border border-white/5 bg-zinc-900/50 backdrop-blur-xl">
                                        <h4 className="font-bold text-white mb-4">Our Subprocessors</h4>
                                        <table className="w-full text-left text-sm">
                                            <thead>
                                                <tr className="border-b border-white/10">
                                                    <th className="py-4 font-bold text-zinc-400 uppercase tracking-widest text-[10px]">Entity</th>
                                                    <th className="py-4 font-bold text-zinc-400 uppercase tracking-widest text-[10px]">Purpose</th>
                                                    <th className="py-4 font-bold text-zinc-400 uppercase tracking-widest text-[10px]">Jurisdiction</th>
                                                </tr>
                                            </thead>
                                            <tbody className="text-zinc-500">
                                                <tr className="border-b border-white/5">
                                                    <td className="py-4 font-medium text-white">Vercel Inc.</td>
                                                    <td className="py-4">Edge Infrastructure / Frontend Deployment</td>
                                                    <td className="py-4">United States / Global</td>
                                                </tr>
                                                <tr className="border-b border-white/5">
                                                    <td className="py-4 font-medium text-white">Neon Database</td>
                                                    <td className="py-4">Serverless PostgreSQL (Metadata Only)</td>
                                                    <td className="py-4">United States / EU</td>
                                                </tr>
                                                <tr>
                                                    <td className="py-4 font-medium text-white">Clerk.com</td>
                                                    <td className="py-4">Identity Management / Authentication</td>
                                                    <td className="py-4">United States</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </motion.section>

                        {/* Section 5 */}
                        <motion.section {...fadeIn} className="space-y-8">
                            <div className="flex items-start gap-6">
                                <span className="text-4xl font-black text-white/10 shrink-0">05</span>
                                <div className="space-y-4">
                                    <h2 className="text-3xl font-bold text-white">Your Absolute Rights</h2>
                                    <p className="text-zinc-400 leading-relaxed">MD-Dash facilitates your right to be forgotten, right to access, and right to portability with automated tooling.</p>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {[
                                            "Right to Access Mission Metadata",
                                            "Right to Rectification of Profile Info",
                                            "Right to Erasure (Complete System Reset)",
                                            "Right to Restrict AI Processing",
                                            "Right to Personal Intelligence Portability",
                                            "Right to Object to Telemetry Collection"
                                        ].map((right, i) => (
                                            <div key={i} className="flex items-center gap-3 p-4 rounded-xl border border-white/5 bg-white/[0.01]">
                                                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                                                <span className="text-sm font-medium">{right}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </motion.section>
                    </div>

                    {/* Final CTA/Contact */}
                    <motion.div 
                        {...fadeIn}
                        className="p-12 rounded-[3rem] bg-indigo-500/10 border border-indigo-500/20 text-center space-y-6"
                    >
                        <h2 className="text-3xl font-bold text-white">Privacy Questions?</h2>
                        <p className="text-zinc-400 max-w-xl mx-auto">If you have questions about your data or privacy, reach out to our team anytime.</p>
                        <div className="pt-4 space-y-2">
                            <Link href="mailto:privacy@md-dash.com" className="text-xl font-bold text-indigo-400 hover:text-indigo-300 block transition-colors">
                                privacy@md-dash.com
                            </Link>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-600">MD-Dash — Privacy Team</span>
                        </div>
                    </motion.div>
                </div>
            </main>

            <footer className="py-20 border-t border-white/5 bg-[#090a0c]/50">
                <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-8 text-[10px] font-bold uppercase tracking-widest text-zinc-600">
                    <div className="flex items-center gap-8">
                        <span>© 2026 MD-Dash</span>
                        <span>GDPR COMPLIANT</span>
                        <span>CCPA ALIGNED</span>
                    </div>
                    <Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
                </div>
            </footer>
        </div>
    );
}
