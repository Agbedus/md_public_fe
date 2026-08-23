'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FiHome, FiCheckSquare, FiSearch, FiCalendar, FiMenu, FiBriefcase, FiFileText, FiClock, FiSettings, FiLogOut, FiMapPin, FiUsers, FiBookOpen, FiUserCheck } from 'react-icons/fi';
import { motion } from 'framer-motion';
import { useOrgSlug } from '@/hooks/use-org-slug';
import { spring, springTap } from '@/lib/motion';

export function MobileNav({ setIsCommandOpen, orgSlug: _orgSlug }: { setIsCommandOpen: (open: boolean) => void; orgSlug?: string }) {
    const pathname = usePathname();
    const hookOrgSlug = useOrgSlug();
    const slug = _orgSlug || hookOrgSlug;
    const orgPath = (path: string) => slug ? `/${slug}${path.startsWith('/') ? path : `/${path}`}` : path;

    // State for the "More" menu popup
    const [isMenuOpen, setIsMenuOpen] = React.useState(false);

    const navItems = [
        { href: orgPath('/dashboard'), icon: FiHome, label: 'Home' },
        { href: orgPath('/tasks'), icon: FiCheckSquare, label: 'Tasks' },
        { 
            icon: FiSearch, 
            label: 'Search', 
            onClick: () => setIsCommandOpen(true),
            isAction: true 
        },
        { href: orgPath('/calendar'), icon: FiCalendar, label: 'Calendar' },
        { 
            icon: FiMenu, 
            label: 'Menu', 
            onClick: () => setIsMenuOpen(!isMenuOpen),
            isAction: true,
            isActive: isMenuOpen 
        }, 
    ];

    // Secondary menu items (same as sidebar)
    const secondaryItems = [
        { href: orgPath('/attendance'), icon: FiMapPin, label: 'Attendance', color: 'text-[var(--pastel-blue)]' },
        { href: orgPath('/projects'), icon: FiBriefcase, label: 'Projects', color: 'text-[var(--pastel-rose)]' },
        { href: orgPath('/team'), icon: FiUsers, label: 'Team', color: 'text-[var(--pastel-teal)]' },
        { href: orgPath('/clients'), icon: FiUserCheck, label: 'Clients', color: 'text-[var(--pastel-purple)]' },
        { href: orgPath('/notes'), icon: FiFileText, label: 'Notes', color: 'text-[var(--pastel-amber)]' },
        { href: orgPath('/focus'), icon: FiClock, label: 'Focus mode', color: 'text-[var(--pastel-rose)]' },
        { href: orgPath('/wiki'), icon: FiBookOpen, label: 'Wiki', color: 'text-[var(--pastel-emerald)]' },
        { href: orgPath('/settings'), icon: FiSettings, label: 'Settings', color: 'text-[var(--pastel-indigo)]' },
    ];

    return (
        <>
            {/* Mobile Menu Popup */}
            <button type="button" aria-label="Close mobile menu" className={`fixed inset-0 z-40 bg-black/45 backdrop-blur-sm transition-opacity duration-200 md:hidden ${isMenuOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'}`} onClick={() => setIsMenuOpen(false)} />
            
            <div className={`fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom))] left-3 right-3 z-50 transform transition-all duration-200 md:hidden ${isMenuOpen ? 'translate-y-0 scale-100 opacity-100' : 'pointer-events-none translate-y-4 scale-[0.98] opacity-0'}`}>
                <div className="max-h-[min(68vh,32rem)] overflow-y-auto rounded-2xl border border-card-border bg-card p-2 shadow-lg">
                    <div className="grid grid-cols-2 gap-1">
                        {secondaryItems.map((item, index) => (
                            <Link
                                key={index} 
                                href={item.href}
                                prefetch={true}
                                onClick={() => setIsMenuOpen(false)}
                                className="group flex min-h-14 items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-foreground/[0.05] active:bg-foreground/[0.08]"
                            >
                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-foreground/[0.04]">
                                    <item.icon className={`text-lg ${item.color}`} />
                                </span>
                                <span className="min-w-0 truncate text-sm font-medium text-text-secondary transition-colors group-hover:text-foreground">{item.label}</span>
                            </Link>
                        ))}
                         <button
                            type="button"
                            onClick={() => {
                                setIsMenuOpen(false);
                                window.location.assign('/logout');
                            }}
                            className="group col-span-2 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border-t border-card-border px-3 py-2.5 text-left text-rose-500 transition-colors hover:bg-rose-500/10"
                        >
                            <FiLogOut className="text-lg" />
                            <span className="text-sm font-medium">Sign out</span>
                         </button>
                    </div>
                </div>
            </div>

            <div className="fixed bottom-0 left-0 right-0 z-50 h-[calc(4rem+env(safe-area-inset-bottom))] border-t border-card-border bg-background/95 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden">
            <div className="flex h-16 items-stretch justify-between">
                {navItems.map((item, index) => {
                    const isActive = Boolean(item.isActive || (item.href && (pathname === item.href || pathname.startsWith(`${item.href}/`))));
                    const Icon = item.icon;

                    if (item.isAction) {
                        const isMenuIcon = item.icon === FiMenu;
                        return (
                            <motion.button
                                key={index}
                                onClick={item.onClick}
                                whileTap={{ scale: 0.88, transition: springTap }}
                                className={`flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl ${isActive ? 'text-foreground' : 'text-text-muted active:text-foreground'}`}
                            >
                                <motion.div
                                    animate={{ scale: isActive ? 1.1 : 1, rotate: isMenuIcon && isActive ? 90 : 0 }}
                                    transition={spring}
                                    className={`relative rounded-lg p-1.5 ${isActive ? 'bg-emerald-500/10 text-emerald-500' : ''}`}
                                >
                                     <Icon size={20} />
                                     {isActive && (
                                        <motion.div
                                            layoutId="mobile-nav-indicator"
                                            className="absolute -bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-emerald-500"
                                        />
                                    )}
                                </motion.div>
                                <span className="text-[11px] font-medium">{item.label}</span>
                            </motion.button>
                        );
                    }

                    return (
                        <motion.div key={index} whileTap={{ scale: 0.88, transition: springTap }} className="flex min-w-0 flex-1">
                            <Link
                                href={item.href || '#'}
                                prefetch={true}
                                className={`flex min-h-14 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl ${
                                    isActive ? 'text-foreground' : 'text-text-muted'
                                }`}
                            >
                                <motion.div
                                    animate={{ scale: isActive ? 1.1 : 1 }}
                                    transition={spring}
                                    className={`relative rounded-lg p-1.5 ${isActive ? 'bg-emerald-500/10 text-emerald-500' : ''}`}
                                >
                                    <Icon size={20} />
                                    {isActive && (
                                        <motion.div
                                            layoutId="mobile-nav-indicator"
                                            className="absolute -bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-emerald-500"
                                        />
                                    )}
                                </motion.div>
                                <span className="text-[11px] font-medium">{item.label}</span>
                            </Link>
                        </motion.div>
                    );
                })}
            </div>
        </div>
        </>
    );
}
