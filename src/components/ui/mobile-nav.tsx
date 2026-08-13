'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FiHome, FiCheckSquare, FiSearch, FiCalendar, FiMenu, FiBriefcase, FiFileText, FiClock, FiSettings, FiLogOut, FiMapPin } from 'react-icons/fi';
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
        { href: orgPath("/attendance"), icon: FiMapPin, label: "Attendance", color: "text-sky-400" },
        { href: orgPath("/projects"), icon: FiBriefcase, label: "Projects", color: "text-pink-400" },
        { href: orgPath("/notes"), icon: FiFileText, label: "Notes", color: "text-yellow-400" },
        { href: orgPath("/focus"), icon: FiClock, label: "Focus Mode", color: "text-orange-400" },
        { href: orgPath("/settings"), icon: FiSettings, label: "Settings", color: "text-indigo-400" },
    ];

    return (
        <>
            {/* Mobile Menu Popup */}
            <div className={`md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${isMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`} onClick={() => setIsMenuOpen(false)} />
            
            <div className={`md:hidden fixed bottom-20 right-4 z-50 transition-all duration-300 transform ${isMenuOpen ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-10 opacity-0 scale-95 pointer-events-none'}`}>
                <div className="w-56 bg-foreground/[0.03] border border-foreground/5 rounded-2xl  overflow-hidden max-h-[60vh] overflow-y-auto">
                    <div className="flex flex-col">
                        {secondaryItems.map((item, index) => (
                            <Link
                                key={index} 
                                href={item.href}
                                onClick={() => setIsMenuOpen(false)}
                                className="flex items-center gap-3 p-4 hover:bg-blue-50 dark:hover:bg-white/[0.06] transition-all duration-300 border-b border-foreground/5 last:border-0 active:bg-foreground/[0.04] group"
                            >
                                <item.icon className={`text-lg ${item.color} transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6`} />
                                <span className="text-sm font-medium text-text-secondary group-hover:text-foreground transition-colors">{item.label}</span>
                            </Link>
                        ))}
                         <button
                            type="button"
                            onClick={() => {
                                setIsMenuOpen(false);
                                window.location.assign('/logout');
                            }}
                            className="flex items-center gap-3 p-4 hover:bg-red-500/10 transition-colors w-full text-left group"
                        >
                            <FiLogOut className="text-lg text-red-400 transition-transform duration-300 group-hover:-translate-x-0.5" />
                            <span className="text-sm font-medium text-red-400">Sign Out</span>
                         </button>
                    </div>
                </div>
            </div>

            <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-[#09090b]/80 backdrop-blur-xl border-t border-foreground/5 z-50 px-6 pb-safe">
            <div className="flex justify-between items-center h-full">
                {navItems.map((item, index) => {
                    const isActive = pathname === item.href || (item.isActive);
                    const Icon = item.icon;

                    if (item.isAction) {
                        const isMenuIcon = item.icon === FiMenu;
                        return (
                            <motion.button
                                key={index}
                                onClick={item.onClick}
                                whileTap={{ scale: 0.88, transition: springTap }}
                                className={`flex flex-col items-center justify-center gap-1 ${isActive ? 'text-foreground' : 'text-text-muted active:text-foreground'}`}
                            >
                                <motion.div
                                    animate={{ scale: isActive ? 1.1 : 1, rotate: isMenuIcon && isActive ? 90 : 0 }}
                                    transition={spring}
                                    className="relative p-1"
                                >
                                     <Icon size={20} />
                                     {isActive && (
                                        <motion.div
                                            layoutId="mobile-nav-indicator"
                                            className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-1 h-1 bg-emerald-500 rounded-full"
                                        />
                                    )}
                                </motion.div>
                                <span className="text-[11px] font-medium">{item.label}</span>
                            </motion.button>
                        );
                    }

                    return (
                        <motion.div key={index} whileTap={{ scale: 0.88, transition: springTap }}>
                            <Link
                                href={item.href || '#'}
                                className={`flex flex-col items-center justify-center gap-1 ${
                                    isActive ? 'text-foreground' : 'text-text-muted'
                                }`}
                            >
                                <motion.div
                                    animate={{ scale: isActive ? 1.1 : 1 }}
                                    transition={spring}
                                    className="relative"
                                >
                                    <Icon size={20} />
                                    {isActive && (
                                        <motion.div
                                            layoutId="mobile-nav-indicator"
                                            className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-1 h-1 bg-emerald-500 rounded-full"
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
