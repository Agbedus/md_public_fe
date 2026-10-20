"use client";

import React, { useState, useEffect, useRef } from "react";
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
    FiAward,
    FiPhoneCall,
    FiArrowUpRight,
    FiSun,
    FiMoon,
    FiMonitor
} from 'react-icons/fi';
import { motion, AnimatePresence, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import PipMascot from '@/components/ui/assistant/pip-mascot';
import { ShareButton } from '@/components/ui/sharing/share-button';
import { landingPageStructuredData } from '@/lib/seo';
import { useTheme, type Theme } from '@/providers/theme-provider';
import './landing.css';

const SHOWCASE_SCREENS = [
    { name: 'Dashboard', file: 'dashboard', detail: 'See the day clearly' },
    { name: 'Tasks', file: 'tasks', detail: 'Move work forward' },
    { name: 'Notes', file: 'notes', detail: 'Keep context close' },
    { name: 'Team', file: 'team', detail: 'Know who is working' },
    { name: 'Time off', file: 'approvals', detail: 'Plan with confidence' },
] as const;

// People orbiting the attendance zones. Angles and sizes are fixed rather than
// generated so the server and client render the same layout, but they are
// deliberately uneven to read as a scattered team. `size` is a percentage of
// the orbit's width, so the avatars scale with it.
const ORBIT_ZONES = [
    {
        id: 'inside', label: 'In office', seconds: 70, isReversed: false,
        people: [
            { face: '01', angle: 28, size: 9 },
            { face: '06', angle: 158, size: 6 },
            { face: '12', angle: 262, size: 7.5 },
        ],
    },
    {
        id: 'grace', label: 'Grace zone', seconds: 95, isReversed: true,
        people: [
            { face: '02', angle: 8, size: 6 },
            { face: '05', angle: 92, size: 8.5 },
            { face: '09', angle: 151, size: 5 },
            { face: '11', angle: 223, size: 7 },
            { face: '13', angle: 304, size: 5.5 },
        ],
    },
    {
        id: 'outside', label: 'Out of range', seconds: 130, isReversed: false,
        people: [
            { face: '03', angle: 52, size: 7.5 },
            { face: '04', angle: 117, size: 5 },
            { face: '07', angle: 183, size: 9 },
            { face: '08', angle: 241, size: 5.5 },
            { face: '10', angle: 296, size: 8 },
            { face: '14', angle: 347, size: 5 },
        ],
    },
] as const;

interface PricingCurrency {
    country: string;
    currency: string;
    rate: number;
}

const PRICING_TIERS = [
    {
        name: 'Startups',
        priceUsd: 0,
        priceGhs: 0,
        desc: 'For founders and small teams building their operating rhythm.',
        features: ['Up to 7 team members', 'One team workspace', 'Geo-fenced attendance', 'Tasks, projects and clients', 'Core Pip AI assistance'],
        popular: false,
    },
    {
        name: 'Teams',
        priceUsd: 8,
        priceGhs: 90,
        desc: 'For growing teams that need deeper visibility and smarter reporting.',
        features: ['Up to 50 team members', 'Advanced Pip AI reports', 'Downloadable PDF reports', 'Multiple office locations', 'Priority support'],
        popular: true,
    },
    {
        name: 'Business',
        priceUsd: 15,
        priceGhs: 165,
        desc: 'For established businesses coordinating more people, offices and work.',
        features: ['Unlimited team members', 'Everything in Teams', 'Expanded AI reporting', 'Advanced workspace controls', 'Priority onboarding support'],
        popular: false,
    },
    {
        name: 'Scale',
        priceUsd: null,
        priceGhs: null,
        desc: 'For larger organizations with tailored deployment and support needs.',
        features: ['Unlimited team members', 'Dedicated deployment options', 'Tailored AI configuration', 'Compliance and audit support', 'Guided onboarding'],
        popular: false,
    },
] as const;

const APPEARANCE_OPTIONS: { value: Theme; label: string; icon: React.ReactNode }[] = [
    { value: 'system', label: 'System', icon: <FiMonitor aria-hidden="true" /> },
    { value: 'light', label: 'Light', icon: <FiSun aria-hidden="true" /> },
    { value: 'dark', label: 'Dark', icon: <FiMoon aria-hidden="true" /> },
];

// The round chip that sits at the end of a pill button, inset evenly on three
// sides the same way the nav bar wraps its last control.
function ButtonIcon({ children }: { children: React.ReactNode }) {
    return <span className="landing-button-icon" aria-hidden="true">{children}</span>;
}

function LandingAppearanceMenu() {
    const { theme, setTheme } = useTheme();
    const reduceMotion = useReducedMotion();
    const [open, setOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const currentTheme = mounted ? theme : 'system';
    const currentOption = APPEARANCE_OPTIONS.find((option) => option.value === currentTheme) ?? APPEARANCE_OPTIONS[0];

    useEffect(() => {
        const timer = setTimeout(() => setMounted(true), 0);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        if (!open) return;
        const onPointerDown = (event: PointerEvent) => {
            if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
        };
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setOpen(false);
                containerRef.current?.querySelector<HTMLButtonElement>('.landing-theme-trigger')?.focus();
            }
        };
        document.addEventListener('pointerdown', onPointerDown);
        document.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('pointerdown', onPointerDown);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [open]);

    return (
        <div className="landing-theme" ref={containerRef}>
            <button
                type="button"
                className="landing-theme-trigger"
                aria-label={`Appearance: ${currentOption.label}. Choose theme`}
                aria-expanded={open}
                aria-controls="landing-theme-options"
                onClick={() => setOpen((previous) => !previous)}
            >
                {currentOption.icon}
                <span className="landing-theme-trigger-label">Theme</span>
            </button>
            <AnimatePresence>
                {open && (
                    <motion.div
                        id="landing-theme-options"
                        className="landing-theme-options"
                        role="group"
                        aria-label="Appearance"
                        initial={reduceMotion ? false : { opacity: 0, y: -5, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -5, scale: 0.98 }}
                        transition={{ duration: reduceMotion ? 0 : 0.16, ease: [0.23, 1, 0.32, 1] }}
                    >
                        {APPEARANCE_OPTIONS.map((option) => (
                            <button
                                key={option.value}
                                type="button"
                                className="landing-theme-option"
                                aria-pressed={currentTheme === option.value}
                                onClick={() => {
                                    setTheme(option.value);
                                    setOpen(false);
                                }}
                            >
                                {option.icon}
                                <span>{option.label}</span>
                                {currentTheme === option.value && <FiCheck className="landing-theme-check" aria-hidden="true" />}
                            </button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default function LandingPage() {
    const [activeTab, setActiveTab] = useState<(typeof SHOWCASE_SCREENS)[number]['name']>('Dashboard');
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [billingCycle, setBillingCycle] = useState('Monthly');
    const [activeFaq, setActiveFaq] = useState(0);
    const [pricingCurrency, setPricingCurrency] = useState<PricingCurrency>({ country: 'US', currency: 'USD', rate: 1 });

    const reduceMotion = useReducedMotion();

    // Entry motion carries hierarchy: the eye lands on the headline, then the
    // subtext, then the CTAs. Under reduced motion it collapses to a plain
    // render rather than animating anything.
    const enterAt = (delay: number) => reduceMotion
        ? { initial: false as const, animate: { opacity: 1, y: 0 } }
        : {
            initial: { opacity: 0, y: 15 },
            animate: { opacity: 1, y: 0 },
            transition: { duration: 0.42, ease: [0.23, 1, 0.32, 1] as const, delay }
        };

    // Scroll reveal for section content below the fold. `revealAt` staggers a
    // row of siblings by passing each one a slightly later delay.
    const revealAt = (delay: number) => reduceMotion
        ? { initial: false as const, animate: { opacity: 1, y: 0 } }
        : {
            initial: { opacity: 0, y: 16 },
            whileInView: { opacity: 1, y: 0 },
            viewport: { once: true, amount: 0.25 },
            transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] as const, delay }
        };
    const revealOnScroll = revealAt(0);

    // A short haptic tick on touch presses of the page's controls, alongside the
    // CSS press scale. Phones without vibration support simply skip it.
    const handlePressFeedback = (event: React.PointerEvent<HTMLElement>) => {
        if (event.pointerType !== 'touch' || reduceMotion || !('vibrate' in navigator)) return;
        if (!(event.target as Element).closest('.landing-button, .landing-showcase-tab, .landing-toggle-option, .landing-faq-item')) return;
        navigator.vibrate(8);
    };

    // The product screenshot leans back slightly below the fold and settles flat
    // as it scrolls into place, so the hero ends on the product, not a wall.
    const showcaseRef = useRef<HTMLDivElement>(null);
    const { scrollYProgress: showcaseProgress } = useScroll({ target: showcaseRef, offset: ['start end', 'start 30%'] });
    const showcaseTilt = useTransform(showcaseProgress, [0, 1], [12, 0]);
    const showcaseScale = useTransform(showcaseProgress, [0, 1], [0.94, 1]);

    const activeScreen = SHOWCASE_SCREENS.find((screen) => screen.name === activeTab) ?? SHOWCASE_SCREENS[0];
    const pipVariant = 'classic';

    useEffect(() => {
        const locale = navigator.language;
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const params = new URLSearchParams({ locale, timezone });

        fetch(`/api/pricing/currency?${params.toString()}`)
            .then((response) => response.ok ? response.json() : null)
            .then((data: PricingCurrency | null) => {
                if (data?.currency && Number.isFinite(data.rate) && data.rate > 0) setPricingCurrency(data);
            })
            .catch(() => {});
    }, []);

    const formatPrice = (usdPrice: number, ghsPrice: number) => {
        const billingMultiplier = billingCycle === 'Annual' ? 0.9 : 1;
        const regionalPrice = pricingCurrency.currency === 'GHS' ? ghsPrice : usdPrice * pricingCurrency.rate;

        return new Intl.NumberFormat(undefined, {
            style: 'currency',
            currency: pricingCurrency.currency,
            currencyDisplay: 'narrowSymbol',
            maximumFractionDigits: pricingCurrency.currency === 'GHS' ? 0 : 2,
        }).format(regionalPrice * billingMultiplier);
    };

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

    const faqs = [
        {
            category: 'Platform',
            q: 'What does MyndDesk bring together?',
            a: 'MyndDesk gives your team one workspace for attendance, tasks, projects, clients, notes, calendars, time off and operational reporting. Tasks can roll into projects, logged time contributes to project visibility, approved leave appears on the shared calendar, and relevant activity reaches the right people through live notifications. Each organization keeps its own records, membership and permissions, so day-to-day work stays connected without exposing one workspace to another.'
        },
        {
            category: 'Attendance',
            q: 'How does automatic attendance work?',
            a: 'Owners and Admins register each office with a name, coordinates, attendance radius, working days, expected start time and clock-in window. During the configured window, MyndDesk checks the member’s device location and can clock them in when they arrive within range, then clock them out when they leave. The attendance view distinguishes whether someone is in the office, within an allowed grace area, or outside the configured range. Location permission is required, and Managers can monitor team attendance without gaining permission to rewrite organization-wide rules.'
        },
        {
            category: 'Attendance',
            q: 'What happens if a device cannot get its location?',
            a: 'A temporary unavailable-position response is not treated as a permanent denial or an automatic clock-out. MyndDesk keeps attendance tracking recoverable and continues checking while tracking is active, which helps when GPS briefly drops indoors or a mobile connection changes. A genuine permission denial is handled separately: attendance cannot record location until the member restores access in the browser’s site settings. The office name is preserved when an administrator uses the current-location helper to capture coordinates.'
        },
        {
            category: 'AI',
            q: 'What can I ask Pip?',
            a: 'Ask in ordinary language about tasks, projects, notes, clients, events, attendance, time off, people or dashboard metrics—there is no query syntax to learn. Pip can find overdue work, compare project progress, summarize notes and decisions, identify upcoming leave, explain operational trends, or recommend what deserves attention today. It can also present concrete records in native MyndDesk widgets and create supported tasks, notes, projects or calendar events when you ask directly. Every result stays within your active organization and your role permissions.'
        },
        {
            category: 'AI',
            q: 'Can Pip create and download reports?',
            a: 'Yes. Ask for a monthly review, end-of-month summary or a focused operational report and Pip analyzes the workspace information you are allowed to access. The response streams into the conversation as it is written, so you can follow its progress instead of waiting on a frozen page. When it is complete, you can download a formal A4 PDF containing workspace and recipient details, an executive summary, structured sections, tables, confidentiality treatment, and consistent page headers and footers. Important figures should still be reviewed before the report is shared externally.'
        },
        {
            category: 'Permissions',
            q: 'Does Pip see everything in the company?',
            a: 'No. Pip follows the same organization boundary and role permissions as the rest of MyndDesk. Owners and Admins have broad operational access, Managers can see organization-wide work without inheriting every administrative power, Members work with their own or assigned records, and Guests remain read-only on explicitly shared information. Pip cannot reveal a hidden record, cross into another organization, or complete an action your role could not perform through the normal interface. It reports the actual result of supported actions rather than pretending a change succeeded.'
        },
        {
            category: 'Organizations',
            q: 'Can one person belong to multiple organizations?',
            a: 'Yes. A person can join an invited organization or create another organization with the same account, without registering again. If an existing user opens an invitation while signed out, they sign in once and continue into the invited workspace; if already signed in, the membership can be accepted directly. The organization switcher then lists every workspace they belong to, including their role in each one. Switching changes the active tasks, projects, people, attendance and notifications so records never blend across organizations.'
        },
        {
            category: 'Teams',
            q: 'How do invitations and roles work?',
            a: 'Owners and Admins invite colleagues by email or organization link and choose the role they should receive. A new person completes registration, while an existing account signs in and joins without creating duplicate credentials. Roles range from Owner and Admin through Manager, Member and Guest, and the same visibility rules apply across tasks, projects, notes, clients, attendance and notifications. Access can later be changed or suspended without deleting the person’s historical work.'
        },
        {
            category: 'Collaboration',
            q: 'Do teammates need to refresh to see changes?',
            a: 'No. Tasks, shared notes, projects, announcements and notifications update live as colleagues work, so most changes appear without a page refresh. Notifications are permission-scoped: you are only alerted about a record you are allowed to open. If the live connection drops, MyndDesk reconnects and catches up rather than requiring the user to restart the workspace. Personal notification preferences can be adjusted from Settings.'
        },
        {
            category: 'Pricing',
            q: 'How do plans and seat pricing work?',
            a: 'Startups is free for teams of up to 7 people and includes the core workspace, attendance, project tools and Pip assistance. Teams supports up to 50 people, while Business supports unlimited members and adds broader reporting and operational controls. Paid plans are priced per seat per month; choosing annual billing reduces the displayed monthly equivalent by 10% and the subscription is billed annually. Ghana has reduced fixed local prices, other supported regions receive an approximate local conversion, and organizations needing tailored deployment, AI configuration, compliance support or guided onboarding can book a custom-plan conversation.'
        }
    ];

    const structuredData = {
        '@context': 'https://schema.org',
        '@graph': [
            ...landingPageStructuredData['@graph'],
            {
                '@type': 'FAQPage',
                mainEntity: faqs.map((faq) => ({
                    '@type': 'Question',
                    name: faq.q,
                    acceptedAnswer: {
                        '@type': 'Answer',
                        text: faq.a,
                    },
                })),
            },
        ],
    };

    const sectionBg = "landing-section landing-section--base";
    const sectionAlt = "landing-section landing-section--alt";

    return (
        <main className="landing-page min-h-screen text-white overflow-x-hidden" onPointerDown={handlePressFeedback}>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify(structuredData).replace(/</g, '\\u003c'),
                }}
            />
            {/* Navigation */}
            <nav className="landing-nav fixed top-0 inset-x-0 z-50 px-4 pt-4 sm:px-6 sm:pt-5" aria-label="Main navigation">
                <div className="landing-nav-shell mx-auto flex max-w-7xl items-center justify-between gap-4">
                    <Link href="/" className="flex items-center gap-3">
                        <Image src="/mynd_desk_logo_dark.png" alt="MyndDesk" width={1020} height={323} className="landing-logo--dark h-7 w-auto" priority />
                        <Image src="/mynd_desk_logo_light.png" alt="" aria-hidden="true" width={1020} height={323} className="landing-logo--light h-7 w-auto" />
                    </Link>

                    <div className="landing-nav-content">
                        <div className="landing-nav-links hidden lg:flex">
                            <Link href="#attendance" className="landing-nav-link text-zinc-400">Attendance</Link>
                            <Link href="#pip-ai" className="landing-nav-link text-zinc-400">Pip AI</Link>
                            <Link href="#features" className="landing-nav-link text-zinc-400">Features</Link>
                            <Link href="#how-it-works" className="landing-nav-link text-zinc-400">How It Works</Link>
                            <Link href="#pricing" className="landing-nav-link text-zinc-400">Pricing</Link>
                        </div>
                        <div className="landing-nav-actions">
                            <LandingAppearanceMenu />
                            <div className="landing-nav-auth hidden lg:flex">
                                <Link href="/login" className="landing-nav-link">Sign in</Link>
                                <Link 
                                    href="/register"
                                    className="landing-button landing-button--primary has-icon"
                                >
                                    Get started <ButtonIcon><FiArrowRight /></ButtonIcon>
                                </Link>
                            </div>
                            <button
                                type="button"
                                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                                aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
                                aria-expanded={mobileMenuOpen}
                                aria-controls="landing-mobile-menu"
                                className="landing-menu-button lg:hidden"
                            >
                                {mobileMenuOpen ? <FiX className="text-xl" /> : <FiMenu className="text-xl" />}
                            </button>
                        </div>
                    </div>
                </div>

                <AnimatePresence>
                    {mobileMenuOpen && (
                        <motion.div 
                            id="landing-mobile-menu"
                            initial={reduceMotion ? false : { opacity: 0, transform: 'translateY(-8px)' }}
                            animate={{ opacity: 1, transform: 'translateY(0)' }}
                            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, transform: 'translateY(-8px)' }}
                            transition={{ duration: reduceMotion ? 0 : 0.18, ease: [0.23, 1, 0.32, 1] }}
                            className="landing-mobile-menu lg:hidden absolute top-[5.25rem] left-4 right-4 flex flex-col gap-1 rounded-[1.25rem] p-4 font-dm-sans text-sm sm:left-6 sm:right-6"
                        >
                            <Link href="#attendance" onClick={() => setMobileMenuOpen(false)} className="text-zinc-400 hover:text-white transition-colors py-2 border-b border-white/5 text-left">Attendance</Link>
                            <Link href="#pip-ai" onClick={() => setMobileMenuOpen(false)} className="text-zinc-400 hover:text-white transition-colors py-2 border-b border-white/5 text-left">Pip AI</Link>
                            <Link href="#features" onClick={() => setMobileMenuOpen(false)} className="text-zinc-400 hover:text-white transition-colors py-2 border-b border-white/5 text-left">Features</Link>
                            <Link href="#how-it-works" onClick={() => setMobileMenuOpen(false)} className="text-zinc-400 hover:text-white transition-colors py-2 border-b border-white/5 text-left">How It Works</Link>
                            <Link href="#pricing" onClick={() => setMobileMenuOpen(false)} className="text-zinc-400 hover:text-white transition-colors py-2 border-b border-white/5 text-left">Pricing</Link>
                            <Link href="/register" onClick={() => setMobileMenuOpen(false)} className="landing-button landing-button--primary landing-button--block has-icon mt-2 w-full">Get started <ButtonIcon><FiArrowRight /></ButtonIcon></Link>
                            <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="landing-button landing-button--quiet w-full">Sign in</Link>
                        </motion.div>
                    )}
                </AnimatePresence>
            </nav>

            {/* Hero: one message, one primary action, then the product itself. */}
            <section className="landing-hero relative overflow-hidden px-4 sm:px-6">
                <div className="relative mx-auto max-w-7xl">
                    <div className="landing-hero-intro">
                        <h1 className="landing-display font-sora">
                            <motion.span {...enterAt(0)}>Know where work stands.</motion.span>
                            <motion.span {...enterAt(0.07)} className="landing-display-accent">Make the next move.</motion.span>
                        </h1>
                        <motion.p {...enterAt(0.14)} className="landing-hero-lede">
                            Attendance, projects, tasks and time off stay connected, so your team can act with a clear picture of the day.
                        </motion.p>
                        <motion.div {...enterAt(0.2)} className="landing-hero-actions">
                            <Link href="/register" className="landing-button landing-button--primary landing-button--lg has-icon">
                                Create your workspace <ButtonIcon><FiArrowRight /></ButtonIcon>
                            </Link>
                            <Link href="#showcase" className="landing-button landing-button--quiet landing-button--lg">
                                Explore the platform
                            </Link>
                        </motion.div>
                        <motion.div {...enterAt(0.26)} className="landing-hero-note">
                            <span className="landing-hero-faces" aria-hidden="true">
                                {['01', '05', '03', '09'].map((face) => (
                                    <Image key={face} src={`/landing/faces/face-${face}.webp`} alt="" width={64} height={64} />
                                ))}
                            </span>
                            <span>Start free · No credit card required</span>
                        </motion.div>
                    </div>

                    <motion.div
                        ref={showcaseRef}
                        id="showcase"
                        style={reduceMotion ? undefined : { rotateX: showcaseTilt, scale: showcaseScale, transformPerspective: 1600 }}
                        className="landing-showcase relative scroll-mt-28"
                    >
                        <div className="landing-showcase-top flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5">
                            <div className="flex items-center gap-2 font-dm-sans text-xs font-medium">
                                <span className="landing-status-dot" aria-hidden="true" />
                                <span>{activeScreen.detail}</span>
                            </div>
                            <div className="landing-showcase-tabs flex max-w-full items-center gap-1 overflow-x-auto" role="tablist" aria-label="Preview MyndDesk features">
                                {SHOWCASE_SCREENS.map((screen) => (
                                    <button
                                        key={screen.name}
                                        id={`landing-tab-${screen.file}`}
                                        type="button"
                                        role="tab"
                                        aria-selected={activeTab === screen.name}
                                        aria-controls="landing-showcase-panel"
                                        tabIndex={activeTab === screen.name ? 0 : -1}
                                        onClick={() => setActiveTab(screen.name)}
                                        onKeyDown={(event) => {
                                            if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
                                            event.preventDefault();
                                            const current = SHOWCASE_SCREENS.findIndex((item) => item.name === activeTab);
                                            const offset = event.key === 'ArrowRight' ? 1 : -1;
                                            const next = SHOWCASE_SCREENS[(current + offset + SHOWCASE_SCREENS.length) % SHOWCASE_SCREENS.length];
                                            setActiveTab(next.name);
                                            document.getElementById(`landing-tab-${next.file}`)?.focus();
                                        }}
                                        className={`landing-showcase-tab ${activeTab === screen.name ? 'is-active' : ''}`}
                                    >
                                        {activeTab === screen.name && (
                                            <motion.span
                                                layoutId="landing-showcase-pill"
                                                className="landing-showcase-pill"
                                                transition={reduceMotion ? { duration: 0 } : { type: 'spring', duration: 0.4, bounce: 0 }}
                                                aria-hidden="true"
                                            />
                                        )}
                                        <span className="relative">{screen.name}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div
                            id="landing-showcase-panel"
                            className="landing-showcase-screen relative aspect-[3600/2262] overflow-hidden"
                            role="tabpanel"
                            aria-labelledby={`landing-tab-${activeScreen.file}`}
                        >
                            <AnimatePresence mode="sync" initial={false}>
                                <motion.div
                                    key={activeScreen.file}
                                    initial={reduceMotion ? false : { opacity: 0, transform: 'translateY(8px)' }}
                                    animate={{ opacity: 1, transform: 'translateY(0)' }}
                                    exit={reduceMotion ? { opacity: 0 } : { opacity: 0, transform: 'translateY(-8px)' }}
                                    transition={{ duration: reduceMotion ? 0 : 0.18, ease: [0.23, 1, 0.32, 1] }}
                                    className="absolute inset-0"
                                >
                                    <Image
                                        src={`/screenshots/${activeScreen.file}.png`}
                                        alt={`MyndDesk ${activeScreen.name} screen`}
                                        fill
                                        priority={activeScreen.name === 'Dashboard'}
                                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 94vw, 1216px"
                                        className="object-cover object-top"
                                    />
                                </motion.div>
                            </AnimatePresence>
                        </div>
                    </motion.div>
                </div>
            </section>

            <section className="landing-capabilities px-4 py-8 sm:px-6" aria-label="Platform capabilities">
                <div className="mx-auto grid max-w-7xl grid-cols-2 gap-x-5 gap-y-8 lg:grid-cols-4 lg:gap-0">
                    {[
                        { icon: <FiMapPin aria-hidden="true" />, title: 'Attendance', detail: 'Know who is where' },
                        { icon: <FiClipboard aria-hidden="true" />, title: 'Work', detail: 'See what is moving' },
                        { icon: <FiUsers aria-hidden="true" />, title: 'People', detail: 'Keep the team aligned' },
                        { icon: <FiCpu aria-hidden="true" />, title: 'Pip AI', detail: 'Ask what needs attention' },
                    ].map((item, i) => (
                        <motion.div key={item.title} {...revealAt(i * 0.06)} className="landing-capability flex items-start gap-3 lg:px-7 first:lg:pl-0">
                            <span className="landing-capability-icon mt-0.5 text-lg">{item.icon}</span>
                            <div>
                                <p className="font-sora text-sm font-semibold text-white">{item.title}</p>
                                <p className="mt-0.5 text-xs text-[#a0b4ac] sm:text-sm">{item.detail}</p>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* ── DEDICATED ATTENDANCE SECTION ── */}
            <section id="attendance" className={`px-6 relative overflow-hidden ${sectionAlt} border-t`}>
                <div className="max-w-7xl mx-auto">
                    <motion.div {...revealOnScroll} className="landing-section-head max-w-3xl space-y-6">
                        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight leading-[1.02] text-white font-sora">
                            Attendance that<br />
                            <span className="landing-section-accent">checks itself.</span>
                        </h2>
                        <p className="text-zinc-400 text-lg leading-relaxed font-dm-sans max-w-2xl">
                            Define office perimeters as geo-fenced zones. Team members clock in with automatic GPS validation.
                            Three concentric zones set attendance status automatically, so there is no manual entry and nothing to dispute.
                        </p>
                    </motion.div>

                    <div className="grid grid-cols-1 items-center gap-14 lg:grid-cols-2 lg:gap-20">
                        <motion.div {...revealOnScroll}>
                            <div className="landing-orbit" role="img" aria-label="Team members orbiting an office across three attendance zones: in office, grace zone, and out of range">
                                {ORBIT_ZONES.map((zone) => (
                                    <div
                                        key={zone.id}
                                        className={`landing-orbit-ring landing-orbit-ring--${zone.id}`}
                                        style={{ '--orbit-duration': `${zone.seconds}s` } as React.CSSProperties}
                                    >
                                        <div className={`landing-orbit-track ${zone.isReversed ? 'is-reversed' : ''}`}>
                                            {zone.people.map((person) => (
                                                <span
                                                    key={person.face}
                                                    className="landing-orbit-person"
                                                    style={{ '--angle': `${person.angle}deg`, '--size': person.size } as React.CSSProperties}
                                                >
                                                    <Image
                                                        src={`/landing/faces/face-${person.face}.webp`}
                                                        alt=""
                                                        width={80}
                                                        height={80}
                                                        className="landing-orbit-face"
                                                    />
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                                <div className="landing-orbit-center"><FiMapPin aria-hidden="true" /></div>
                            </div>
                            <ul className="landing-orbit-legend" aria-hidden="true">
                                {ORBIT_ZONES.slice().reverse().map((zone) => (
                                    <li key={zone.id}><span className={`landing-orbit-dot landing-orbit-dot--${zone.id}`} />{zone.label}</li>
                                ))}
                            </ul>
                        </motion.div>

                        <div className="landing-divider-list">
                                {[
                                    {
                                        title: "Precision geo-fencing",
                                        desc: "Define up to three concentric zones: In Office, Grace Period, and Out of Range. Radiuses are configurable per office location."
                                    },
                                    {
                                        title: "Automatic GPS validation",
                                        desc: "When a team member clocks in via the mobile web app, their GPS coordinates are cross-referenced against the defined zones. Status is determined instantly and automatically."
                                    },
                                    {
                                        title: "Real-time attendance map",
                                        desc: "View all team members on a live map with color-coded markers. See who's in the office, who's working remotely, and who has not checked in, updated in real time."
                                    },
                                    {
                                        title: "Compliance and reporting",
                                        desc: "Automated attendance logs with timestamps, zone history, and late arrival tracking. Export reports for payroll, compliance, or performance review."
                                    }
                                ].map((item, i) => (
                                    <motion.div key={item.title} {...revealAt(i * 0.06)} className="landing-divider-row">
                                        <h4>{item.title}</h4>
                                        <p>{item.desc}</p>
                                    </motion.div>
                                ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* ── DEDICATED PIP AI SECTION ── */}
            <section id="pip-ai" className={`px-6 relative overflow-hidden ${sectionBg} border-t`}>
                <div className="max-w-7xl mx-auto">
                    <motion.div {...revealOnScroll} className="landing-section-head max-w-3xl space-y-6">
                        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight leading-[1.02] text-white font-sora">
                            Ask Pip what your<br />
                            <span className="landing-section-accent">team is working on.</span>
                        </h2>
                    </motion.div>

                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-16 items-center">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.96 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6, type: 'spring' }}
                            className="lg:col-span-2 flex flex-col items-center justify-center"
                        >
                            <div className="relative">
                                <AnimatePresence mode="wait">
                                    <motion.div
                                        key={pipVariant}
                                        initial={{ scale: 0.96, opacity: 0, rotateY: 14 }}
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
                            initial={{ opacity: 0, x: 12 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6 }}
                            className="lg:col-span-3 space-y-10"
                        >
                            <div className="space-y-5">
                                <p className="text-zinc-400 text-lg leading-relaxed font-dm-sans">
                                    Pip is an intelligent AI assistant purpose-built for operational command. It understands the workspace information you are allowed to access and answers questions in plain language, so nobody needs to learn query syntax.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                {[
                                    {
                                        icon: <FiMessageSquare size={16} />,
                                        title: "Natural language reports",
                                        desc: "Ask Pip \"What did my team accomplish this month?\" and receive a formatted productivity report with task completion rates, trends, and recommendations.",
                                        color: "text-zinc-300", bg: "bg-white/[0.05]", border: "border-white/[0.12]"
                                    },
                                    {
                                        icon: <FiActivity size={16} />,
                                        title: "Proactive intelligence",
                                        desc: "Pip does not wait to be asked. Get notified of bottlenecks, overdue tasks, attendance anomalies, and project risks before they become problems.",
                                        color: "text-zinc-300", bg: "bg-white/[0.05]", border: "border-white/[0.12]"
                                    },
                                    {
                                        icon: <FiUsers size={16} />,
                                        title: "Team insights",
                                        desc: "Analyze individual and team performance. Identify top contributors, track workload distribution, and surface coaching opportunities.",
                                        color: "text-zinc-300", bg: "bg-white/[0.05]", border: "border-white/[0.12]"
                                    },
                                    {
                                        icon: <FiGlobe size={16} />,
                                        title: "Enterprise-grade security",
                                        desc: "Pip follows the same organization boundaries and role permissions as the rest of MyndDesk, so answers and actions stay within the information you are allowed to access.",
                                        color: "text-zinc-300", bg: "bg-white/[0.05]", border: "border-white/[0.12]"
                                    }
                                ].map((item, i) => (
                                    <motion.div key={item.title} {...revealAt(i * 0.06)} className="landing-card p-7">
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className={`w-9 h-9 rounded-xl ${item.bg} ${item.border} flex items-center justify-center ${item.color}`}>
                                                {item.icon}
                                            </div>
                                            <h4 className="text-sm font-bold text-white font-sora">{item.title}</h4>
                                        </div>
                                        <p className="text-sm text-zinc-500 leading-relaxed font-dm-sans">{item.desc}</p>
                                    </motion.div>
                                ))}
                            </div>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* Feature overview: one product view, two supporting pillars, then an open list. */}
            <section id="features" className={`landing-features landing-section px-6 ${sectionAlt} border-t`}>
                <div className="mx-auto max-w-7xl">
                    <div className="landing-features-intro">
                        <h2 className="text-white">Everything your team needs.<br />Nothing in the way.</h2>
                        <p>Projects, people, and the small details that keep work moving—together in one clear view.</p>
                    </div>

                    <div className="landing-feature-primary">
                        <motion.article {...revealOnScroll} className="landing-feature-card landing-feature-card--lead">
                            <div className="landing-feature-card-copy">
                                <span className="landing-feature-icon landing-feature-icon--sky"><FiClipboard aria-hidden="true" /></span>
                                <div>
                                    <h3>Tasks and projects, in focus.</h3>
                                    <p>Keep boards, priorities, and progress in one place so everyone knows what moves next.</p>
                                </div>
                            </div>
                            <div className="landing-feature-preview relative overflow-hidden">
                                <Image src="/screenshots/tasks.png" alt="MyndDesk task board preview" fill sizes="(max-width: 768px) 90vw, 780px" className="object-cover object-top" />
                            </div>
                        </motion.article>
                        <div className="landing-feature-secondary">
                            <motion.article {...revealOnScroll} className="landing-feature-card landing-feature-card--secondary">
                                <span className="landing-feature-icon landing-feature-icon--violet"><FiCalendar aria-hidden="true" /></span>
                                <div>
                                    <h3>Calendar and time off.</h3>
                                    <p>See the team schedule, request leave, and handle approvals without losing the rhythm of the week.</p>
                                </div>
                            </motion.article>
                            <motion.article {...revealAt(0.06)} className="landing-feature-card landing-feature-card--secondary">
                                <span className="landing-feature-icon landing-feature-icon--blue"><FiUsers aria-hidden="true" /></span>
                                <div>
                                    <h3>Everyone has a place.</h3>
                                    <p>Invite teammates, manage roles, and give each person the right view of the work.</p>
                                </div>
                            </motion.article>
                        </div>
                    </div>

                    <div className="landing-feature-list">
                        <div className="landing-feature-list-heading">
                            <p>Thoughtful tools for the rest of the day.</p>
                        </div>
                        <div className="landing-feature-items">
                            {[
                                { icon: <FiClock aria-hidden="true" />, tone: 'amber', title: 'Time tracking', desc: 'Focus sessions and time spent on every task.' },
                                { icon: <FiLayers aria-hidden="true" />, tone: 'rose', title: 'Notes and wiki', desc: 'Keep shared knowledge easy to find.' },
                                { icon: <FiBell aria-hidden="true" />, tone: 'violet', title: 'Announcements', desc: 'Reach the right people at the right time.' },
                                { icon: <FiTarget aria-hidden="true" />, tone: 'cyan', title: 'Decision log', desc: 'Remember the context behind each choice.' },
                                { icon: <FiStar aria-hidden="true" />, tone: 'orange', title: 'Focus mode', desc: 'Make room for uninterrupted deep work.' },
                                { icon: <FiShield aria-hidden="true" />, tone: 'indigo', title: 'Role-based access', desc: 'Give every teammate the access they need.' },
                            ].map((feature, i) => (
                                <motion.div key={feature.title} {...revealAt((i % 3) * 0.06)} className="landing-feature-item">
                                    <span className={`landing-feature-list-icon landing-feature-icon--${feature.tone}`}>{feature.icon}</span>
                                    <div>
                                        <h4>{feature.title}</h4>
                                        <p>{feature.desc}</p>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* How It Works */}
            <section id="how-it-works" className={`px-6 relative overflow-hidden ${sectionBg} border-t`}>
                <div className="max-w-7xl mx-auto space-y-16">
                    <div className="max-w-3xl mx-auto text-center space-y-6">
                        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight leading-[1.05] text-white font-sora">Up and running in three steps</h2>
                        <p className="text-zinc-400 text-base leading-relaxed font-dm-sans max-w-xl mx-auto">Get your team up and running in minutes, not days.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                        {[
                            { step: "01", icon: <FiStar size={24} />, title: "Create your organization", desc: "Sign up and set up your organization in seconds. Define your company name, configure working hours, and set up office locations with geo-fenced boundaries.", color: "text-zinc-300", bg: "bg-white/[0.05]", border: "border-white/[0.12]" },
                            { step: "02", icon: <FiUsers size={24} />, title: "Invite your team", desc: "Invite members via email or share your unique invite code. Assign roles (Owner, Admin, Member, or Client) and let people join with a single click.", color: "text-zinc-300", bg: "bg-white/[0.05]", border: "border-white/[0.12]" },
                            { step: "03", icon: <FiZap size={24} />, title: "Get to work", desc: "Track attendance, assign tasks, manage projects, and pull reports from Pip. Everything runs from the same workspace.", color: "text-zinc-300", bg: "bg-white/[0.05]", border: "border-white/[0.12]" }
                        ].map((step, i) => (
                            <motion.div key={step.step} {...revealAt(i * 0.06)} className="landing-card relative p-8 text-left">
                                <div className="flex items-center justify-between gap-4 mb-8">
                                    <div className={`w-12 h-12 rounded-2xl ${step.bg} ${step.border} flex items-center justify-center ${step.color}`}>{step.icon}</div>
                                    <span className="landing-step-number font-sora" aria-hidden="true">{step.step}</span>
                                </div>
                                <h3 className="text-xl font-bold text-white font-sora mb-3">{step.title}</h3>
                                <p className="text-sm text-zinc-500 leading-relaxed font-dm-sans">{step.desc}</p>
                            </motion.div>
                        ))}
                    </div>

                </div>
            </section>

            {/* Security */}
            <section id="security" className={`px-6 relative overflow-hidden ${sectionAlt} border-t`}>
                <div className="max-w-7xl mx-auto space-y-16">
                    <div className="max-w-3xl space-y-6 text-left">
                        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tightest leading-tight text-white font-sora">Data you control, <br />always.</h2>
                        <p className="text-zinc-400 text-lg leading-relaxed font-dm-sans">Your workflows, tasks, logs, and calendar items remain completely encrypted. Enterprise-grade AI inference with zero telemetry leakage.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[
                            { icon: <FiShield className="text-xl text-zinc-300" />, title: "100% data sovereignty", desc: "Your data stays on your infrastructure. No third-party cloud storage, no unauthorized access, complete control." },
                            { icon: <FiCpu className="text-xl text-zinc-300" />, title: "Permission-aware AI", desc: "Pip works within your active organization and respects the same role-based access rules as the rest of the platform." },
                            { icon: <FiServer className="text-xl text-zinc-300" />, title: "Role-based access control", desc: "Granular permissions across Owner, Admin, Member, and Client roles. Full audit logging for every action taken." }
                        ].map((card, i) => (
                            <motion.div key={card.title} {...revealAt(i * 0.06)} className="landing-card p-8 text-left space-y-8">
                                <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center">{card.icon}</div>
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
            <section id="pricing" className={`px-6 relative overflow-hidden ${sectionBg} border-t`}>
                <div className="max-w-7xl mx-auto space-y-16 text-center">
                    <div className="space-y-6 max-w-3xl mx-auto text-center">
                        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight leading-[1.05] text-white font-sora">Simple, transparent pricing</h2>
                        <p className="text-zinc-400 text-base md:text-lg leading-relaxed font-dm-sans">Start with the essentials. Add deeper intelligence and support as your team grows.</p>
                    </div>

                    <div className="relative flex items-center bg-white/[0.03] border border-white/[0.08] rounded-full p-1 w-fit mx-auto z-10">
                        {['Monthly', 'Annual'].map((cycle) => (
                            <button
                                key={cycle}
                                onClick={() => setBillingCycle(cycle)}
                                aria-pressed={billingCycle === cycle}
                                className={`landing-toggle-option relative z-30 flex min-h-11 items-center gap-2 rounded-full px-5 py-2 font-sora text-sm font-semibold tracking-tight ${billingCycle === cycle ? 'landing-billing-active' : 'text-zinc-500'}`}
                            >
                                {billingCycle === cycle && <motion.div layoutId="billing-pill" className="landing-billing-pill absolute inset-0 rounded-full -z-10" transition={reduceMotion ? { duration: 0 } : { type: 'spring', duration: 0.4, bounce: 0 }} />}
                                <span className="relative z-40">{cycle}</span>
                                {cycle === 'Annual' && <span className="landing-save-chip relative z-40">Save 10%</span>}
                            </button>
                        ))}
                    </div>

                    <div className="mx-auto grid max-w-5xl grid-cols-1 items-stretch gap-6 pt-10 text-left md:grid-cols-3">
                        {PRICING_TIERS.slice(0, 3).map((tier, idx) => (
                            <motion.div
                                key={tier.name}
                                {...revealAt(idx * 0.06)}
                                className={`landing-card p-8 flex flex-col justify-between relative ${tier.popular ? 'is-featured' : ''}`}
                            >
                                {tier.popular && <div className="landing-popular-badge absolute -top-3 left-1/2 -translate-x-1/2 rounded-full border px-3 py-1 text-xs font-semibold tracking-tight font-sora">Most popular</div>}
                                <div className="space-y-8 flex-1 flex flex-col justify-between">
                                    <div className="space-y-6">
                                        <div className="space-y-2">
                                            <h4 className="text-xl font-bold text-white font-sora">{tier.name}</h4>
                                            <p className="text-zinc-500 text-xs leading-relaxed font-dm-sans">{tier.desc}</p>
                                        </div>
                                        <div className="space-y-1.5">
                                            <div className="flex items-baseline gap-1 text-white font-sora">
                                                <span className="text-4xl font-extrabold tracking-tight">{tier.priceUsd === null || tier.priceGhs === null ? 'Custom' : formatPrice(tier.priceUsd, tier.priceGhs)}</span>
                                                {tier.priceUsd !== null && tier.priceUsd > 0 && <span className="text-zinc-500 text-xs font-semibold">/seat/month</span>}
                                            </div>
                                            <span className="block text-xs text-zinc-500">
                                                {tier.priceUsd === null ? 'Tailored to your organization' : (tier.priceUsd === 0 ? 'Free for startup teams' : (billingCycle === 'Monthly' ? 'Billed monthly' : '10% off · billed annually'))}
                                            </span>
                                        </div>
                                    </div>
                                    <ul className="space-y-3 pt-6 border-t border-white/[0.06] font-dm-sans flex-1 mt-6">
                                        {tier.features.map((feat, fIdx) => (
                                            <li key={fIdx} className="flex items-center gap-3 text-xs text-zinc-400 font-medium">
                                                <FiCheck className="text-zinc-300 flex-shrink-0 text-xs" />
                                                <span>{feat}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <div className="pt-8 mt-auto">
                                    <Link href="/register" className={`landing-button landing-button--lg w-full ${tier.popular ? 'landing-button--primary landing-button--block has-icon' : 'landing-button--quiet'}`}>Get started {tier.popular && <ButtonIcon><FiArrowRight /></ButtonIcon>}</Link>
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    <div className="landing-card landing-card--static mx-auto grid max-w-5xl overflow-hidden text-left md:grid-cols-[1.1fr_0.9fr]">
                        <div className="space-y-6 p-7 sm:p-9">
                            <div className="space-y-3">
                                <h3 className="max-w-xl font-sora text-2xl font-bold tracking-tight text-white sm:text-3xl">Need something shaped around your organization?</h3>
                                <p className="max-w-2xl text-sm leading-relaxed text-zinc-400">Talk to support about tailored deployment, AI configuration, compliance requirements, onboarding, or a service arrangement that fits how your team operates.</p>
                            </div>
                            <div className="flex flex-col gap-3 sm:flex-row">
                                <a href="mailto:intelligence@agbedus.com?subject=MyndDesk%20custom%20plan%20call" className="landing-button landing-button--primary landing-button--block has-icon">
                                    Book a support call <ButtonIcon><FiPhoneCall /></ButtonIcon>
                                </a>
                                <a href="mailto:intelligence@agbedus.com?subject=MyndDesk%20custom%20plan" className="landing-button landing-button--quiet">
                                    Email support
                                </a>
                            </div>
                        </div>
                        <div className="landing-card-divider p-7 sm:p-9">
                            <ul className="grid gap-4 sm:grid-cols-2 md:grid-cols-1">
                                {PRICING_TIERS[3].features.map((feature) => (
                                    <li key={feature} className="flex items-center gap-3 text-sm text-zinc-300">
                                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/[0.05] text-zinc-300"><FiCheck className="h-3 w-3" /></span>
                                        {feature}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                    <p className="mx-auto max-w-2xl text-xs leading-relaxed text-zinc-500">
                        {pricingCurrency.currency === 'GHS'
                            ? 'Ghana monthly prices are GH₵90 for Teams and GH₵165 for Business per seat. Annual billing saves 10%.'
                            : pricingCurrency.currency === 'USD'
                                ? 'Teams costs $8 and Business costs $15 per seat each month. Annual billing saves 10%.'
                                : `Prices are shown in ${pricingCurrency.currency} for your region and are approximate conversions from the USD seat prices. Annual billing saves 10%.`}
                        {' '}Exchange rates update daily via{' '}
                        <a href="https://www.exchangerate-api.com" target="_blank" rel="noreferrer" className="text-zinc-400 underline decoration-white/20 underline-offset-4 hover:text-white">
                            ExchangeRate-API
                        </a>.
                    </p>
                </div>
            </section>

            {/* FAQ */}
            <section className={`px-6 relative overflow-hidden ${sectionAlt} border-t`}>
                <div className="mx-auto max-w-7xl space-y-14">
                    <div className="grid gap-6 text-left lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
                        <h2 className="font-sora text-3xl font-bold leading-[1.05] tracking-tight text-white sm:text-4xl md:text-5xl">Clear answers,<br />without the fine print.</h2>
                        <p className="max-w-2xl text-sm leading-relaxed text-zinc-400 md:text-base">Practical answers drawn from the product guide—from attendance and permissions to Pip, organizations, reports and pricing.</p>
                    </div>

                    <div className="landing-card landing-card--static grid overflow-hidden lg:min-h-[34rem] lg:grid-cols-[1fr_1.15fr]">
                        <div className="flex min-h-80 flex-col justify-between p-6 sm:p-9 lg:min-h-0 lg:p-11">
                            <AnimatePresence mode="wait" initial={false}>
                                <motion.div
                                    key={activeFaq}
                                    initial={{ opacity: 0, transform: 'translateY(6px)' }}
                                    animate={{ opacity: 1, transform: 'translateY(0)' }}
                                    exit={{ opacity: 0, transform: 'translateY(-4px)' }}
                                    transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
                                    className="space-y-6"
                                >
                                    <div className="space-y-4">
                                        <h3 className="max-w-lg font-sora text-2xl font-semibold leading-tight text-white sm:text-3xl">{faqs[activeFaq].q}</h3>
                                        <p className="max-w-xl text-sm leading-7 text-zinc-300 sm:text-base">{faqs[activeFaq].a}</p>
                                    </div>
                                </motion.div>
                            </AnimatePresence>
                            <a href="mailto:intelligence@agbedus.com?subject=MyndDesk%20question" className="mt-10 inline-flex w-fit items-center gap-2 text-sm font-medium text-zinc-400 transition-colors hover:text-white">
                                Still have a question? Ask support <FiArrowUpRight className="h-4 w-4" />
                            </a>
                        </div>

                        <div className="landing-card-divider p-3 sm:p-5">
                            <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-1">
                                {faqs.map((faq, index) => (
                                    <button
                                        key={faq.q}
                                        type="button"
                                        onClick={() => setActiveFaq(index)}
                                        aria-pressed={activeFaq === index}
                                        className={`landing-faq-item group flex min-h-14 items-center gap-4 rounded-2xl px-4 py-3 text-left sm:px-5 ${activeFaq === index ? 'is-active' : ''}`}
                                    >
                                        <span className="min-w-0 flex-1 text-sm font-medium leading-snug">{faq.q}</span>
                                        <FiArrowUpRight className={`h-4 w-4 shrink-0 transition-opacity duration-150 ${activeFaq === index ? 'text-zinc-300 opacity-100' : 'opacity-0 group-hover:opacity-60'}`} />
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Final CTA */}
            <section className={`px-6 relative overflow-hidden ${sectionBg} border-t`}>
                <div className="max-w-4xl mx-auto text-center space-y-10">
                    <h2 className="text-3xl sm:text-4xl md:text-6xl font-bold tracking-tightest leading-[0.95] text-white font-sora">Take control of <br /> your operations.</h2>
                    <p className="text-zinc-500 text-lg max-w-2xl mx-auto leading-relaxed font-dm-sans">Create your workspace, invite your team and focus on the few operational details that move the business forward. No credit card required.</p>
                    <div>
                        <Link href="/register" className="landing-button landing-button--primary landing-button--lg has-icon">
                            Create your account <ButtonIcon><FiArrowRight /></ButtonIcon>
                        </Link>
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-6 text-zinc-500 text-xs font-medium pt-4">
                        <span className="flex items-center gap-2"><FiCheck className="text-zinc-300" /> No credit card required</span>
                        <span className="flex items-center gap-2"><FiCheck className="text-zinc-300" /> Startups plan included</span>
                        <span className="flex items-center gap-2"><FiCheck className="text-zinc-300" /> Cancel anytime</span>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className={`py-20 px-6 border-t ${sectionBg}`}>
                <div className="max-w-7xl mx-auto">
                    <div className="flex flex-col md:flex-row items-start justify-between gap-12 pb-16 text-left">
                        <div className="space-y-6">
                            <Link href="/" className="flex items-center gap-3">
                                <Image src="/mynd_desk_logo_dark.png" alt="MyndDesk" width={1020} height={323} className="landing-logo--dark h-12 w-auto" />
                                <Image src="/mynd_desk_logo_light.png" alt="" aria-hidden="true" width={1020} height={323} className="landing-logo--light h-12 w-auto" />
                            </Link>
                            <p className="text-zinc-500 text-sm max-w-xs leading-relaxed font-dm-sans">One focused workspace for attendance, projects, tasks and people.</p>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-16 font-sora text-sm">
                            <div className="space-y-4">
                                <h4 className="text-white">Platform</h4>
                                <ul className="space-y-2 text-zinc-500">
                                    <li><Link href="#attendance" className="hover:text-foreground transition-colors">Attendance</Link></li>
                                    <li><Link href="#pip-ai" className="hover:text-foreground transition-colors">Pip AI</Link></li>
                                    <li><Link href="#features" className="hover:text-foreground transition-colors">Features</Link></li>
                                    <li><Link href="#how-it-works" className="hover:text-foreground transition-colors">How It Works</Link></li>
                                    <li><Link href="#pricing" className="hover:text-foreground transition-colors">Pricing</Link></li>
                                    <li><Link href="/login" className="hover:text-foreground transition-colors">Sign in</Link></li>
                                </ul>
                            </div>
                            <div className="space-y-4">
                                <h4 className="text-white">Compliance</h4>
                                <ul className="space-y-2 text-zinc-500">
                                    <li><Link href="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link></li>
                                    <li><Link href="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link></li>
                                    <li><button onClick={() => window.dispatchEvent(new CustomEvent('open-cookie-settings'))} className="hover:text-foreground transition-colors text-left">Cookie Settings</button></li>
                                </ul>
                            </div>
                            <div className="space-y-4">
                                <h4 className="text-white">Connect</h4>
                                <ul className="space-y-2 text-zinc-500">
                                    <li><Link href="mailto:intelligence@agbedus.com" className="hover:text-foreground transition-colors">Contact</Link></li>
                                    <li><ShareButton sourceSurface="landing_footer" className="landing-footer-share" /></li>
                                </ul>
                            </div>
                        </div>
                    </div>
                    <div className="pt-8 border-t flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-zinc-600 font-sora">
                        <span>© 2026 MyndDesk. All rights reserved.</span>
                        <span className="text-zinc-500">One clear place for your team&apos;s work.</span>
                    </div>
                </div>
            </footer>
        </main>
    );
}
