'use client';

import React, { useState, useMemo } from 'react';
import { FiSearch, FiFilter, FiCalendar, FiUser, FiUsers, FiMail, FiArrowUpRight } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { getWaitlistEntries } from './actions';
import type { WaitlistEntry } from '@/types/waitlist';

interface WaitlistPageProps {
    initialEntries?: WaitlistEntry[];
}

const roleColors: Record<string, string> = {
    "C-Level Executive": 'bg-blue-600/10 text-blue-400 border-blue-600/20',
    "VP / Director": 'bg-violet-600/10 text-violet-400 border-violet-600/20',
    "Manager": 'bg-amber-600/10 text-amber-400 border-amber-600/20',
    "Team Lead": 'bg-cyan-600/10 text-cyan-400 border-cyan-600/20',
    "Individual Contributor": 'bg-emerald-600/10 text-emerald-400 border-emerald-600/20',
    "Consultant": 'bg-rose-600/10 text-rose-400 border-rose-600/20',
    "Founder / Owner": 'bg-orange-600/10 text-orange-400 border-orange-600/20',
    "Other": 'bg-zinc-600/10 text-zinc-400 border-zinc-600/20',
};

const sourceColors: Record<string, string> = {
    "LinkedIn": 'bg-sky-600/10 text-sky-400 border-sky-600/20',
    "Twitter / X": 'bg-zinc-600/10 text-zinc-300 border-zinc-600/20',
    "Google Search": 'bg-emerald-600/10 text-emerald-400 border-emerald-600/20',
    "Friend / Referral": 'bg-purple-600/10 text-purple-400 border-purple-600/20',
    "Conference / Event": 'bg-amber-600/10 text-amber-400 border-amber-600/20',
    "Blog / Article": 'bg-rose-600/10 text-rose-400 border-rose-600/20',
    "Podcast": 'bg-orange-600/10 text-orange-400 border-orange-600/20',
    "Other": 'bg-zinc-600/10 text-zinc-400 border-zinc-600/20',
};

export default function WaitlistPage() {
    const [entries, setEntries] = useState<WaitlistEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterRole, setFilterRole] = useState<string>('');
    const [filterSource, setFilterSource] = useState<string>('');

    React.useEffect(() => {
        getWaitlistEntries().then(data => {
            setEntries(data);
            setIsLoading(false);
        });
    }, []);

    const uniqueRoles = useMemo(() => [...new Set(entries.map(e => e.role))], [entries]);
    const uniqueSources = useMemo(() => [...new Set(entries.map(e => e.source))], [entries]);

    const filteredEntries = useMemo(() => {
        return entries.filter(e => {
            const matchesSearch = !searchQuery ||
                e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                e.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
                e.email.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesRole = !filterRole || e.role === filterRole;
            const matchesSource = !filterSource || e.source === filterSource;
            return matchesSearch && matchesRole && matchesSource;
        });
    }, [entries, searchQuery, filterRole, filterSource]);

    const stats = useMemo(() => ({
        total: entries.length,
        byRole: uniqueRoles.length,
        bySource: uniqueSources.length,
    }), [entries.length, uniqueRoles.length, uniqueSources.length]);

    if (isLoading) {
        return (
            <div className="px-4 py-8 max-w-[1600px] mx-auto min-h-screen">
                <div className="animate-pulse space-y-6">
                    <div className="h-8 w-48 bg-foreground/[0.03] rounded-xl" />
                    <div className="h-4 w-64 bg-foreground/[0.03] rounded-xl" />
                    <div className="grid grid-cols-3 gap-6">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-28 bg-foreground/[0.03] rounded-2xl" />
                        ))}
                    </div>
                    <div className="h-96 bg-foreground/[0.03] rounded-2xl" />
                </div>
            </div>
        );
    }

    return (
        <div className="px-4 py-8 max-w-[1600px] mx-auto min-h-screen">

            {/* Header */}
            <div className="hidden lg:flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6 mb-10">
                <div>
                    <h1 className="text-3xl font-bold text-foreground mb-2 tracking-tight">Waitlist</h1>
                    <p className="text-text-muted text-sm font-bold uppercase tracking-wider">
                        Early access registration & lead intelligence
                    </p>
                </div>
            </div>
            <div className="md:hidden flex items-center justify-between mb-6">
                <h1 className="text-3xl font-bold text-foreground tracking-tight">Waitlist</h1>
            </div>

            {/* Stats */}
            <div className="flex overflow-x-auto pb-2 scrollbar-hide lg:grid lg:grid-cols-3 gap-3 lg:gap-6 mb-6 lg:mb-12">
                {[
                    { label: 'Total Entries', value: stats.total, icon: FiUsers, color: 'text-indigo-400 bg-indigo-600/10 border-indigo-600/20', sparkColor: '#818cf8' },
                    { label: 'Roles', value: stats.byRole, icon: FiUser, color: 'text-amber-400 bg-amber-600/10 border-amber-600/20', sparkColor: '#fbbf24' },
                    { label: 'Sources', value: stats.bySource, icon: FiMail, color: 'text-emerald-400 bg-emerald-600/10 border-emerald-600/20', sparkColor: '#34d399' },
                ].map(({ label, value, icon: Icon, color, sparkColor }) => (
                    <motion.div
                        key={label}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-card rounded-xl lg:rounded-[32px] p-3 lg:p-5 border border-card-border relative overflow-hidden group hover:scale-[1.02] hover:border-foreground/10 transition-all duration-500 flex-shrink-0 min-w-[140px] lg:min-w-0"
                    >
                        <div className="flex flex-col gap-2 lg:gap-4 relative z-10 h-full justify-between">
                            <div className={`w-8 h-8 lg:w-10 lg:h-10 rounded-lg lg:rounded-xl flex items-center justify-center border transition-all duration-500 relative ${color}`}>
                                <Icon className="w-3.5 h-3.5 lg:w-4 lg:h-4 relative z-10" />
                            </div>
                            <p className="text-[11px] font-bold text-text-muted uppercase tracking-wider">{label}</p>
                            <span className="text-lg lg:text-xl font-medium text-foreground uppercase tracking-tight">{value}</span>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Filters */}
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-6 lg:mb-10 overflow-x-auto pb-2 scrollbar-hide">
                <div className="flex items-center gap-2 w-full">
                    <div className="relative flex-1 min-w-[140px] max-w-sm group">
                        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-indigo-400 transition-colors w-3.5 h-3.5" />
                        <input
                            type="text"
                            placeholder="Search by name, company, or email..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full h-9 lg:h-11 pl-8 pr-4 bg-foreground/[0.03] border border-card-border rounded-xl focus:outline-none focus:bg-foreground/[0.06] focus:border-card-border text-foreground placeholder:text-text-muted/50 transition-all text-xs lg:text-sm"
                        />
                    </div>

                    <div className="relative group flex-shrink-0">
                        <div className="h-9 lg:h-11 w-9 lg:w-44 bg-foreground/[0.03] border border-card-border rounded-xl flex items-center justify-center lg:justify-start lg:pl-3 relative overflow-hidden focus-within:bg-foreground/[0.06] transition-all">
                            <FiFilter className="text-text-muted group-hover:text-indigo-400 transition-colors w-3.5 h-3.5 lg:absolute lg:left-3.5 lg:top-1/2 lg:-translate-y-1/2 lg:z-10" />
                            <select
                                value={filterRole}
                                onChange={e => setFilterRole(e.target.value)}
                                className="absolute inset-0 opacity-0 lg:opacity-100 lg:static lg:bg-transparent lg:border-none lg:pl-10 lg:pr-4 lg:w-full lg:h-full text-text-muted cursor-pointer lg:text-[11px] lg:font-bold lg:uppercase lg:tracking-wider appearance-none focus:outline-none"
                            >
                                <option value="">All Roles</option>
                                {uniqueRoles.map(role => (
                                    <option key={role} value={role}>{role}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="relative group flex-shrink-0">
                        <div className="h-9 lg:h-11 w-9 lg:w-48 bg-foreground/[0.03] border border-card-border rounded-xl flex items-center justify-center lg:justify-start lg:pl-3 relative overflow-hidden focus-within:bg-foreground/[0.06] transition-all">
                            <FiCalendar className="text-text-muted group-hover:text-indigo-400 transition-colors w-3.5 h-3.5 lg:absolute lg:left-3.5 lg:top-1/2 lg:-translate-y-1/2 lg:z-10" />
                            <select
                                value={filterSource}
                                onChange={e => setFilterSource(e.target.value)}
                                className="absolute inset-0 opacity-0 lg:opacity-100 lg:static lg:bg-transparent lg:border-none lg:pl-10 lg:pr-4 lg:w-full lg:h-full text-text-muted cursor-pointer lg:text-[11px] lg:font-bold lg:uppercase lg:tracking-wider appearance-none focus:outline-none"
                            >
                                <option value="">All Sources</option>
                                {uniqueSources.map(source => (
                                    <option key={source} value={source}>{source}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="glass rounded-2xl overflow-hidden flex flex-col border border-card-border bg-card/30 backdrop-blur-md">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="bg-foreground/[0.03] border-b border-card-border">
                                <th className="px-6 py-4 text-[11px] font-bold text-text-muted uppercase tracking-wider whitespace-nowrap">Name</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-text-muted uppercase tracking-wider whitespace-nowrap">Company</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-text-muted uppercase tracking-wider whitespace-nowrap">Role</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-text-muted uppercase tracking-wider whitespace-nowrap">Source</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-text-muted uppercase tracking-wider whitespace-nowrap">Contact</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-text-muted uppercase tracking-wider whitespace-nowrap">Signed Up</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-card-border">
                            <AnimatePresence initial={false}>
                                {filteredEntries.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-16 text-center">
                                            <FiUsers className="w-8 h-8 text-text-muted/20 mx-auto mb-3" />
                                            <p className="text-text-muted text-sm">
                                                {searchQuery || filterRole || filterSource ? 'No entries match your filters.' : 'No waitlist entries yet.'}
                                            </p>
                                        </td>
                                    </tr>
                                )}
                                {filteredEntries.map((entry, index) => (
                                    <motion.tr
                                        key={entry.id}
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.25, delay: index * 0.03 }}
                                        className="group hover:bg-foreground/[0.03] transition-colors"
                                    >
                                        <td className="px-6 py-3">
                                            <span className="text-xs font-bold text-foreground tracking-tight">{entry.name}</span>
                                        </td>
                                        <td className="px-6 py-3">
                                            <span className="text-[10px] font-bold text-text-muted">{entry.company}</span>
                                        </td>
                                        <td className="px-6 py-3">
                                            <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-medium uppercase tracking-wider border ${roleColors[entry.role] || roleColors["Other"]}`}>
                                                {entry.role}
                                            </span>
                                        </td>
                                        <td className="px-6 py-3">
                                            <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-medium uppercase tracking-wider border ${sourceColors[entry.source] || sourceColors["Other"]}`}>
                                                {entry.source}
                                            </span>
                                        </td>
                                        <td className="px-6 py-3">
                                            <div className="flex flex-col gap-0.5">
                                                <span className="text-[10px] font-bold text-foreground">{entry.email}</span>
                                                <span className="text-[10px] text-text-muted">{entry.phone}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-3">
                                            <div className="flex items-center gap-2">
                                                <FiCalendar className="w-3 h-3 text-text-muted/30" />
                                                <span className="text-[10px] font-bold text-text-muted tabular-nums">
                                                    {new Date(entry.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                </span>
                                            </div>
                                        </td>
                                    </motion.tr>
                                ))}
                            </AnimatePresence>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
