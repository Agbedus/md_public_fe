'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
    FiInfo, 
    FiBookOpen, 
    FiDatabase, 
    FiCpu, 
    FiShield, 
    FiTarget, 
    FiLayers, 
    FiClock, 
    FiZap, 
    FiBarChart2, 
    FiMapPin, 
    FiBriefcase,
    FiHelpCircle,
    FiChevronRight,
    FiCheckCircle,
    FiActivity,
    FiChevronLeft,
    FiTerminal,
    FiSettings,
    FiAlertCircle,
    FiLock
} from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';

export default function WikiPage() {
    const router = useRouter();
    const [activeSection, setActiveSection] = useState('getting-started');

    const topics = [
        {
            id: 'getting-started',
            title: 'Mission & Infrastructure',
            icon: FiZap,
            color: 'text-[var(--pastel-yellow)]',
            bg: 'bg-[var(--pastel-yellow)]/10',
            subheadings: [
                { id: 'platform-vision', title: 'Platform Vision', icon: FiInfo },
                { id: 'technical-specs', title: 'Technical Requirements', icon: FiTerminal },
                { id: 'security-auth', title: 'Security & Auth', icon: FiShield },
            ]
        },
        {
            id: 'attendance-presence',
            title: 'Attendance & Presence',
            icon: FiMapPin,
            color: 'text-sky-400',
            bg: 'bg-sky-500/10',
            subheadings: [
                { id: 'how-to-clock-in', title: 'How to Clock In', icon: FiMapPin },
                { id: 'geofencing-logic', title: 'Geofencing Logic', icon: FiTarget },
                { id: 'admin-office-bounds', title: 'Admin Config', icon: FiSettings },
            ]
        },
        {
            id: 'operations-mastery',
            title: 'Operations & Tasks',
            icon: FiBriefcase,
            color: 'text-emerald-400',
            bg: 'bg-emerald-500/10',
            subheadings: [
                { id: 'kanban-mastery', title: 'Kanban Mastery', icon: FiLayers },
                { id: 'task-dynamics', title: 'Priority Dynamics', icon: FiActivity },
                { id: 'time-resource', title: 'Time Logging', icon: FiClock },
            ]
        },
        {
            id: 'ai-mission-control',
            title: 'Mission Control AI',
            icon: FiCpu,
            color: 'text-purple-400',
            bg: 'bg-purple-500/10',
            subheadings: [
                { id: 'ai-briefing', title: 'Intelligence partner', icon: FiZap },
                { id: 'local-llm-architecture', title: 'NVIDIA Cloud AI', icon: FiCpu },
            ]
        },
        {
            id: 'announcements-system',
            title: 'System Broadcasts',
            icon: FiBell,
            color: 'text-pink-400',
            bg: 'bg-pink-500/10',
            subheadings: [
                { id: 'broadcast-protocol', title: 'Broadcast Protocol', icon: FiBell },
                { id: 'priority-alerts', title: 'Priority Levels', icon: FiAlertCircle },
            ]
        }
    ];

    const scrollToSection = (id: string) => {
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
            setActiveSection(id);
        }
    };

    return (
        <div className="flex h-[calc(100vh-4rem)] md:h-[calc(100vh-6rem)] overflow-hidden bg-background relative border-t border-card-border">
            {/* Left Static Sidebar */}
            <aside className="w-80 h-full border-r border-card-border flex flex-col bg-card/10 backdrop-blur-md shrink-0">
                {/* Back Button and Branding */}
                <div className="p-6 border-b border-card-border space-y-6">
                    <button 
                        onClick={() => router.back()}
                        className="flex items-center gap-2 text-text-muted hover:text-foreground transition-all font-bold uppercase tracking-[0.2em] text-[10px] group"
                    >
                        <div className="p-1.5 rounded-lg bg-foreground/[0.03] border border-card-border group-hover:bg-foreground/[0.06] group-hover:border-card-border transition-all">
                            <FiChevronLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
                        </div>
                        Back to Platform
                    </button>

                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                            <FiBookOpen className="text-xl text-emerald-400" />
                        </div>
                        <div className="flex flex-col">
                            <h1 className="text-sm font-black text-foreground tracking-tight">Knowledge base</h1>
                            <span className="text-[9px] text-text-muted/50 font-bold uppercase tracking-widest mt-0.5">Platform Manual v1.4</span>
                        </div>
                    </div>
                </div>

                {/* Static Navigation */}
                <nav className="flex-1 overflow-y-auto p-4 space-y-8 custom-scrollbar">
                    {topics.map((topic) => (
                        <div key={topic.id} className="space-y-3">
                            <div className="flex items-center gap-3 px-2">
                                <div className={`p-1.5 rounded-lg border border-card-border ${topic.bg}`}>
                                    <topic.icon className={`text-base ${topic.color}`} />
                                </div>
                                <h3 className="text-[10px] font-bold text-text-muted uppercase tracking-widest opacity-80 leading-none">
                                    {topic.title}
                                </h3>
                            </div>
                            <div className="space-y-1">
                                {topic.subheadings.map((sub) => (
                                    <button
                                        key={sub.id}
                                        onClick={() => scrollToSection(sub.id)}
                                        className={`w-full flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl transition-all font-bold uppercase tracking-[0.15em] text-[9px] group ${
                                            activeSection === sub.id
                                                ? 'bg-foreground/[0.06] text-foreground border border-card-border'
                                                : 'text-text-muted hover:text-foreground hover:bg-foreground/[0.03] border border-transparent'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <sub.icon size={11} className="group-hover:scale-110 transition-transform" />
                                            {sub.title}
                                        </div>
                                        <FiChevronRight size={10} className={`opacity-0 group-hover:opacity-100 transition-opacity ${activeSection === sub.id ? 'opacity-100' : ''}`} />
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                </nav>

                {/* Footer Guide Status */}
                <div className="p-6 border-t border-card-border bg-card/5">
                    <div className="p-4 rounded-3xl bg-foreground/[0.02] border border-card-border flex items-center justify-between">
                        <div className="flex flex-col gap-1">
                            <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest">Administrator</span>
                            <span className="text-[8px] text-text-muted/50 font-bold uppercase tracking-[0.2em] mt-1">Manual Access Guaranteed</span>
                        </div>
                        <FiLock size={14} className="text-text-muted/30" />
                    </div>
                </div>
            </aside>

            {/* Content Area - Vertically Scrolling */}
            <main className="flex-1 overflow-y-auto h-full scroll-smooth custom-scrollbar bg-background">
                <div className="max-w-4xl mx-auto py-24 px-12 space-y-40">
                    
                    {/* Mission Architecture */}
                    <section id="getting-started" className="space-y-20">
                        <SectionHeader title="Infrastructure" icon={FiZap} color="text-[var(--pastel-yellow)]" />
                        
                        <article id="platform-vision" className="space-y-6">
                            <h3 className="text-2xl font-bold text-foreground tracking-tight tracking-[0.05em]">Platform philosophy</h3>
                            <p className="text-text-muted text-lg leading-relaxed font-medium">
                                The platform serves as a high-density operational gateway, centralizing mission-critical workflows into a single intelligence environment. Unlike traditional ERP systems, it utilizes a <strong>privacy-first AI bridge</strong> to synthesize data without compromising institutional sovereignty.
                            </p>
                        </article>

                        <article id="technical-specs" className="space-y-12">
                            <h3 className="text-xl font-bold text-foreground tracking-wider">Technical specifications</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <DocCard 
                                    title="Endpoint Compatibility" 
                                    description="Optimized for Chromium-based browsers (v110+). Requires active permissions for Geolocation and WebSocket connectivity for real-time alerting."
                                    icon={FiTerminal}
                                />
                                <DocCard 
                                    title="GPS Synchronization" 
                                    description="Requires GPS lock within 50m accuracy for automated presence verification. High-frequency polling is managed locally to preserve battery."
                                    icon={FiActivity}
                                />
                            </div>
                            <div className="p-10 rounded-[3rem] bg-card border border-card-border">
                                <h4 className="text-xs font-bold text-text-muted uppercase tracking-[0.2em] mb-6">Device standards</h4>
                                <div className="space-y-6">
                                    <div className="flex justify-between items-center py-4 border-b border-card-border">
                                        <span className="text-sm font-bold text-text-muted uppercase tracking-widest">WebSocket Latency</span>
                                        <span className="text-sm font-bold text-emerald-400">&lt; 150ms Guaranteed</span>
                                    </div>
                                    <div className="flex justify-between items-center py-4 border-b border-card-border">
                                        <span className="text-sm font-bold text-text-muted uppercase tracking-widest">Geolocation Precision</span>
                                        <span className="text-sm font-bold text-sky-400">Haversine Standard</span>
                                    </div>
                                    <div className="flex justify-between items-center py-4 border-b border-card-border last:border-0 text-text-muted">
                                        <span className="text-sm font-bold text-text-muted uppercase tracking-widest">Resource Persistence</span>
                                        <span className="text-sm font-bold text-purple-400">JWT / Local Cache</span>
                                    </div>
                                </div>
                            </div>
                        </article>

                        <article id="security-auth" className="space-y-6">
                            <h3 className="text-2xl font-bold text-foreground tracking-tight tracking-[0.05em]">Security & privacy protocols</h3>
                            <div className="p-12 rounded-[3.5rem] bg-indigo-500/[0.02] border border-indigo-500/10 space-y-8 group">
                                <p className="text-text-muted text-base leading-relaxed font-medium">
                                    All communications are secured via TLS 1.3. User identity is managed through <strong>JSON Web Tokens (JWT)</strong>, with a strict 24-hour expiration policy and automatic refresh orchestration.
                                </p>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-6 rounded-2xl bg-background border border-card-border">
                                        <FiShield className="text-emerald-400 mb-3" size={20} />
                                        <h5 className="text-[10px] font-bold text-foreground uppercase tracking-widest leading-none mb-2">Isolation Layer</h5>
                                        <p className="text-[11px] text-text-muted leading-relaxed">No data training or external leakage. AI reasoning is contained within the VPC.</p>
                                    </div>
                                    <div className="p-6 rounded-2xl bg-background border border-card-border">
                                        <FiLock className="text-blue-400 mb-3" size={20} />
                                        <h5 className="text-[10px] font-bold text-foreground uppercase tracking-widest leading-none mb-2">Access Control</h5>
                                        <p className="text-[11px] text-text-muted leading-relaxed">Role-Based Access (RBAC) enforced at the system core. Managers see aggregates, admins see infrastructure.</p>
                                    </div>
                                </div>
                            </div>
                        </article>
                    </section>

                    {/* Attendance Guide */}
                    <section id="attendance-presence" className="space-y-20">
                        <SectionHeader title="Presence protocol" icon={FiMapPin} color="text-sky-400" />
                        
                        <article id="how-to-clock-in" className="space-y-8">
                            <h4 className="text-xl font-bold text-foreground tracking-[0.1em]">User attendance manual</h4>
                            <div className="p-12 rounded-[3rem] bg-card border border-card-border space-y-10">
                                <p className="text-text-muted text-base leading-relaxed font-medium">
                                    To maintain operational integrity, attendance must be logged through the platform&apos;s geofenced interface. The system automates verification but requires browser permission.
                                </p>
                                <div className="space-y-12">
                                    <StepItem 
                                        num="01" 
                                        title="Initial Handshake" 
                                        body="Navigate to the Attendance dashboard. If prompted, grant location access. The system must query your device coordinates to establish a baseline."
                                    />
                                    <StepItem 
                                        num="02" 
                                        title="Verification (Haversine)" 
                                        body="The system calculates your exact distance from the configured office hub. You must be within the 200m operational perimeter to enable the Clock In trigger."
                                    />
                                    <StepItem 
                                        num="03" 
                                        title="Continuous Sync" 
                                        body="Once clocked in, enable the background tracking toggle. This ensures your presence state is preserved even if you minimize the application or exit the zone briefly."
                                    />
                                </div>
                            </div>
                        </article>

                        <article id="geofencing-logic" className="space-y-6">
                            <h3 className="text-xl font-bold text-foreground tracking-wider">Geofencing constraints</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="p-8 rounded-3xl bg-sky-500/[0.03] border border-sky-500/10 text-center">
                                    <span className="text-4xl font-bold text-sky-400 block mb-2 font-numbers">200m</span>
                                    <span className="text-[9px] font-bold text-text-muted uppercase tracking-[0.2em]">Hub Radius</span>
                                </div>
                                <div className="p-8 rounded-3xl bg-sky-500/[0.03] border border-sky-500/10 text-center">
                                    <span className="text-4xl font-bold text-sky-400 block mb-2 font-numbers">&lt;50m</span>
                                    <span className="text-[9px] font-bold text-text-muted uppercase tracking-[0.2em]">Precision Required</span>
                                </div>
                                <div className="p-8 rounded-3xl bg-sky-500/[0.03] border border-sky-500/10 text-center flex items-center justify-center">
                                    <FiActivity className="text-sky-500/50" size={32} />
                                </div>
                            </div>
                            <p className="text-text-muted text-sm leading-relaxed font-medium italic">
                                Note: High-accuracy GPS requires an unobstructed view of the sky. In deep architectural environments, the system may default to Wi-Fi triangulation which might reduce precision.
                            </p>
                        </article>

                        <article id="admin-office-bounds" className="space-y-6">
                            <h3 className="text-xl font-bold text-foreground tracking-wider">Admin: Regional configuration</h3>
                            <div className="p-10 rounded-[3rem] bg-foreground/[0.02] border border-card-border space-y-6">
                                <p className="text-text-muted text-sm leading-relaxed font-medium">
                                    Administrators can modify office hubs via the **Office Settings** panel. Ensure coordinates are formatted in Decimal Degrees (DD).
                                </p>
                                <div className="grid grid-cols-1 gap-3">
                                    <div className="flex items-center gap-4 px-6 py-4 rounded-2xl bg-background border border-card-border">
                                        <FiSettings className="text-text-muted/50" />
                                        <p className="text-xs font-bold text-text-muted uppercase tracking-widest">Adjust Perimeter Radius (Config-Only)</p>
                                    </div>
                                    <div className="flex items-center gap-4 px-6 py-4 rounded-2xl bg-background border border-card-border">
                                        <FiMapPin className="text-text-muted/50" />
                                        <p className="text-xs font-bold text-text-muted uppercase tracking-widest">Update Primary Hub Coordinates</p>
                                    </div>
                                </div>
                            </div>
                        </article>
                    </section>

                    {/* Operations Mastery */}
                    <section id="operations-mastery" className="space-y-20">
                        <SectionHeader title="Operational dynamics" icon={FiBriefcase} color="text-emerald-400" />
                        
                        <article id="kanban-mastery" className="space-y-8">
                            <h3 className="text-xl font-bold text-foreground tracking-wider">Kanban workflow strategy</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-6">
                                    <p className="text-text-muted text-sm leading-relaxed font-medium">
                                        The Tasks engine utilizes a non-linear flow. Items start in <strong>Backlog</strong> and progress through <strong>In Progress</strong> and <strong>In Review</strong> to final <strong>Delivery</strong>.
                                    </p>
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-3">
                                            <FiCheckCircle className="text-emerald-400" />
                                            <span className="text-xs font-bold text-foreground uppercase tracking-widest">Atomic Updates</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <FiCheckCircle className="text-emerald-400" />
                                            <span className="text-xs font-bold text-foreground uppercase tracking-widest">State-Preserving Drag-and-Drop</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="aspect-square rounded-[3rem] bg-emerald-500/[0.03] border border-emerald-500/10 flex items-center justify-center">
                                    <FiLayers size={64} className="text-emerald-500/20" />
                                </div>
                            </div>
                        </article>

                        <article id="task-dynamics" className="space-y-6">
                            <h3 className="text-xl font-bold text-foreground tracking-wider">Priority & weighting</h3>
                            <div className="p-10 rounded-[3rem] bg-card border border-card-border space-y-6">
                                <p className="text-text-muted text-sm leading-relaxed font-medium">
                                    Priority level is more than just a label. It affects the AI mission briefing sorting and notification urgency. High priority tasks trigger immediate system-wide WebSocket pushes for managers.
                                </p>
                            </div>
                        </article>
                    </section>

                    {/* AI Mission Control */}
                    <section id="ai-mission-control" className="space-y-20">
                        <SectionHeader title="Intelligence deck" icon={FiCpu} color="text-purple-400" />
                        
                        <article id="ai-briefing" className="space-y-8">
                            <h3 className="text-xl font-bold text-foreground tracking-wider">Strategic daily briefings</h3>
                            <p className="text-text-muted text-base leading-relaxed font-medium">
                                Each day, the platform synthesizes your upcoming tasks and past velocity to generate a natural language briefing. This briefing is processed locally, ensuring that private work details are never passed to external AI training sets.
                            </p>
                        </article>

                        <article id="local-llm-architecture" className="space-y-6">
                            <h3 className="text-xl font-bold text-foreground tracking-wider">NVIDIA Cloud AI (Minimax-M3)</h3>
                            <div className="p-10 rounded-[3rem] bg-purple-500/[0.05] border border-purple-500/20 space-y-6">
                                <p className="text-text-muted text-sm leading-relaxed font-medium">
                                    The platform interfaces with <strong>NVIDIA NIM</strong> using the <strong>Minimax-M3</strong> model. This cloud-powered engine delivers intelligent task analysis, monthly report generation, and productivity insights — all secured via encrypted API calls.
                                </p>
                                <div className="flex gap-4">
                                    <div className="px-4 py-2 rounded-xl bg-background border border-card-border text-[10px] font-bold text-purple-400 uppercase tracking-widest">NVIDIA NIM</div>
                                    <div className="px-4 py-2 rounded-xl bg-background border border-card-border text-[10px] font-bold text-purple-400 uppercase tracking-widest">Minimax-M3</div>
                                </div>
                            </div>
                        </article>
                    </section>

                    {/* System Broadcasts */}
                    <section id="announcements-system" className="space-y-20">
                        <SectionHeader title="Communication deck" icon={FiBell} color="text-pink-400" />
                        
                        <article id="broadcast-protocol" className="space-y-6 text-foreground">
                            <h3 className="text-xl font-bold text-foreground tracking-wider">Broadcast protocol</h3>
                            <p className="text-text-muted text-sm leading-relaxed font-medium">
                                Announcements are pushed to all active clients via an operational WebSocket bridge. Broadcasts can be initiated by Managers and Super Admins only.
                            </p>
                        </article>

                        <article id="priority-alerts" className="space-y-6">
                            <h3 className="text-xl font-bold text-foreground tracking-wider">Alert priority definitions</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="p-6 rounded-3xl bg-pink-500/[0.03] border border-pink-500/10">
                                    <h5 className="text-xs font-bold text-pink-400 uppercase tracking-widest mb-2">Critical Alpha</h5>
                                    <p className="text-xs text-text-muted leading-relaxed font-medium uppercase tracking-wider">Triggers visual alerts and pins at the top of the feed until acknowledged.</p>
                                </div>
                                <div className="p-6 rounded-3xl bg-blue-500/[0.03] border border-blue-500/10">
                                    <h5 className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-2">Informational Beta</h5>
                                    <p className="text-xs text-text-muted leading-relaxed font-medium uppercase tracking-wider">Standard system updates for general knowledge tracking.</p>
                                </div>
                            </div>
                        </article>
                    </section>

                    <div className="h-64" />
                </div>
            </main>
        </div>
    );
}

const SectionHeader = ({ title, icon: Icon, color }: { title: string, icon: any, color: string }) => (
    <div className="space-y-6">
        <div className={`w-16 h-16 rounded-ux flex items-center justify-center border bg-card  ${color.replace('text-', 'border-').replace('400', '400/10')}`}>
            <Icon className={`text-3xl ${color}`} />
        </div>
        <h2 className="text-3xl font-bold text-foreground tracking-tight tracking-[-0.02em]">{title}</h2>
        <div className={`h-1.5 w-32 bg-gradient-to-r ${color.replace('text-', 'from-').replace('400', '500/50')} to-transparent rounded-full`} />
    </div>
);

const DocCard = ({ title, description, icon: Icon }: { title: string, description: string, icon: any }) => (
    <div className="p-10 rounded-[2.5rem] bg-card border border-card-border hover:border-card-border transition-all duration-500 group">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center bg-foreground/[0.03] border border-card-border mb-8 group-hover:scale-110 group-hover:bg-foreground/[0.06] transition-all`}>
            <Icon className={`text-xl text-text-muted group-hover:text-foreground`} />
        </div>
        <h4 className="font-bold text-foreground text-xs uppercase tracking-[0.2em] mb-4">{title}</h4>
        <p className="text-text-muted text-[11px] leading-relaxed font-bold uppercase tracking-wider">{description}</p>
    </div>
);

const StepItem = ({ num, title, body }: { num: string, title: string, body: string }) => (
    <div className="flex gap-8 group">
        <div className="flex flex-col items-center">
            <div className="w-12 h-12 rounded-full border border-card-border flex items-center justify-center text-text-muted/30 font-bold group-hover:text-sky-400 group-hover:border-sky-400/50 transition-all text-sm font-numbers">
                {num}
            </div>
            <div className="w-px flex-1 bg-gradient-to-b from-card-border to-transparent mt-4" />
        </div>
        <div className="pt-2">
            <h5 className="text-base font-bold text-foreground uppercase tracking-tight mb-2 group-hover:text-sky-300 transition-colors">{title}</h5>
            <p className="text-text-muted text-sm font-medium leading-relaxed" dangerouslySetInnerHTML={{ __html: body }} />
        </div>
    </div>
);

// Fallback icons for missing primitives
const FiBell = (props: any) => (
  <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
    <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
  </svg>
);

const FiCheckSquare = (props: any) => (
  <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg" {...props}>
    <polyline points="9 11 12 14 22 4"></polyline>
    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
  </svg>
);

const FiSun = (props: any) => (
  <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg" {...props}>
    <circle cx="12" cy="12" r="5"></circle>
    <line x1="12" y1="1" x2="12" y2="3"></line>
    <line x1="12" y1="21" x2="12" y2="23"></line>
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
    <line x1="1" y1="12" x2="3" y2="12"></line>
    <line x1="21" y1="12" x2="23" y2="12"></line>
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
  </svg>
);
