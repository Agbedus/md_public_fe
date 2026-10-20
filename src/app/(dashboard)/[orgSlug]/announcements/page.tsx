'use client';

import React, { useState } from 'react';
import { useAnnouncements } from '@/components/ui/announcements/announcement-provider';
import { AnnouncementForm } from '@/components/ui/announcements/announcement-form';
import { CreatorAvatar } from '@/components/ui/announcements/creator-avatar';
import { formatDistanceToNow } from 'date-fns';
import { 
    FiPlus, 
    FiTrash2, 
    FiCheckCircle, 
    FiAlertTriangle, 
    FiAlertCircle, 
    FiZap, 
    FiInfo,
    FiMessageSquare,
    FiSearch,
    FiFilter
} from 'react-icons/fi';
import { HiSpeakerphone } from 'react-icons/hi';
import { motion, AnimatePresence } from 'framer-motion';
import { canReadAll, canModifyRecord } from '@/lib/org-permissions';
import { useConfirm } from '@/providers/confirmation-provider';

export default function AnnouncementsPage() {
    const confirm = useConfirm();
    const { 
        announcements, 
        deleteAnnouncement, 
        setIsAdminFormOpen,
        user 
    } = useAnnouncements();

    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState<string>('all');

    // Publishing a broadcast is MANAGER-tier on the backend
    // (`get_current_org_manager`); editing or removing one follows the usual
    // ownership rule, so a manager can only delete their own.
    //
    // This previously compared against uppercase 'SUPER_ADMIN'/'MANAGER' while
    // session roles arrive lowercase, so it never matched.
    const canPublish = canReadAll(user);
    const canRemove = (creatorId: string) => canModifyRecord(user, creatorId);
    const handleDelete = async (id: string, title: string) => {
        const confirmed = await confirm({
            title: 'Delete announcement',
            message: `Delete “${title}”? This cannot be undone.`,
            confirmText: 'Delete announcement',
            type: 'danger',
        });
        if (confirmed) await deleteAnnouncement(id);
    };

    const filteredAnnouncements = announcements
        .filter(a => {
            const matchesSearch = a.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                 a.content.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesType = filterType === 'all' || a.type === filterType;
            return matchesSearch && matchesType;
        })
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const getTypeStyles = (type: string) => {
        switch (type) {
            case 'success': return 'text-success-text bg-success/10 border-success/20';
            case 'warning': return 'text-warning-text bg-warning/10 border-warning/20';
            case 'error': return 'text-danger-text bg-danger/10 border-danger/20';
            case 'critical': return 'text-[var(--status-qa)] bg-[color-mix(in_oklab,var(--status-qa)_10%,transparent)] border-[color-mix(in_oklab,var(--status-qa)_20%,transparent)]';
            default: return 'text-accent-text bg-accent/10 border-accent/20';
        }
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'success': return <FiCheckCircle size={12} />;
            case 'warning': return <FiAlertTriangle size={12} />;
            case 'error': return <FiAlertCircle size={12} />;
            case 'critical': return <FiZap size={12} />;
            default: return <FiInfo size={12} />;
        }
    };

    return (
        <div className="md-zen mx-auto min-h-[calc(100dvh-8rem)] max-w-[1600px] px-3 py-4 sm:px-4 md:min-h-screen md:py-8">
            {/* Header */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-12">
                <div>
                    <h1 className="text-3xl font-bold text-foreground mb-2 tracking-tight flex items-center gap-3">
                        <HiSpeakerphone className="text-[var(--warning)]" />
                        Announcements
                    </h1>
                    <p className="text-text-muted text-sm">
                        Notices for the whole organization.
                    </p>
                </div>

                {canPublish && (
                    <button
                        onClick={() => setIsAdminFormOpen(true)}
                        className="flex items-center gap-2 px-6 py-3 rounded-full bg-[var(--warning)]/10 border border-[var(--warning)]/20 text-[var(--warning)] hover:bg-[var(--warning)]/20 transition-all duration-300 font-bold text-xs group"
                    >
                        <FiPlus className="text-lg group-hover:rotate-90 transition-transform" />
                        New announcement
                    </button>
                )}
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4 mb-10">
                <div className="relative flex-1 group">
                    <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-[var(--warning)] transition-colors" />
                    <input
                        type="text"
                        placeholder="Search announcements..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-12 pr-4 py-3.5 bg-foreground/[0.03] border border-foreground/5 rounded-2xl focus:outline-none focus:bg-foreground/[0.06] text-foreground placeholder:text-text-muted transition-all font-medium"
                    />
                </div>
                
                <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-foreground/[0.03] border border-foreground/5">
                    {['all', 'info', 'success', 'warning', 'error', 'critical'].map((type) => (
                        <button
                            key={type}
                            onClick={() => setFilterType(type)}
                            className={`px-4 py-2 rounded-full text-[11px] font-bold transition-all ${
 filterType === type 
 ? 'bg-foreground/[0.08] text-foreground border border-foreground/10 ' 
 : 'text-text-muted hover:text-foreground hover:bg-foreground/[0.03]'
 }`}
                        >
                            {type}
                        </button>
                    ))}
                </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                <AnimatePresence mode="popLayout">
                    {filteredAnnouncements.map((announcement) => (
                        <motion.div
                            key={announcement.id}
                            layout
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-card p-6 rounded-[2rem] border border-card-border hover:border-foreground/10 transition-all duration-500 group relative flex flex-col h-full"
                        >
                            <div className="flex justify-between items-start mb-6">
                                <div className={`flex items-center gap-2 px-3 py-1 rounded-full border text-[11px] font-bold ${getTypeStyles(announcement.type || 'info')}`}>
                                    {getTypeIcon(announcement.type || 'info')}
                                    {announcement.type || 'info'}
                                </div>
                                
                                {canRemove(announcement.creator_id) && (
                                    <button 
                                        onClick={() => void handleDelete(announcement.id, announcement.title)}
                                        className="p-2 text-text-muted hover:text-danger-text hover:bg-danger/10 rounded-full transition-all opacity-0 group-hover:opacity-100"
                                    >
                                        <FiTrash2 size={16} />
                                    </button>
                                )}
                            </div>

                            <h3 className="text-xl font-bold text-foreground mb-3 group-hover:text-[var(--warning)] transition-colors leading-tight">
                                {announcement.title}
                            </h3>
                            
                            <p className="text-text-muted text-sm leading-relaxed mb-8 flex-1 font-medium line-clamp-4">
                                {announcement.content}
                            </p>

                            <div className="pt-6 border-t border-foreground/5 flex items-center justify-between mt-auto">
                                <div className="flex items-center gap-3">
                                    <CreatorAvatar 
                                        userId={announcement.creator_id} 
                                        initialUser={announcement.creator} 
                                        size={24} 
                                    />
                                    <div className="flex flex-col">
                                        <span className="text-[11px] font-bold text-foreground">
                                            {announcement.creator?.name || 'System'}
                                        </span>
                                        <span className="text-[11px] text-text-muted font-bold mt-0.5">
                                            {formatDistanceToNow(new Date(announcement.created_at), { addSuffix: true })}
                                        </span>
                                    </div>
                                </div>

                                <div className="p-2 bg-foreground/[0.03] rounded-lg border border-foreground/5">
                                    <HiSpeakerphone className="text-foreground" size={14} />
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>

                {filteredAnnouncements.length === 0 && (
                    <div className="col-span-full py-32 text-center">
                        <FiMessageSquare size={64} className="mx-auto text-foreground mb-6" />
                        <h3 className="text-xl font-bold text-text-muted">No matching announcements</h3>
                        <p className="text-text-muted mt-2 font-medium">Try adjusting your filters or check back later.</p>
                    </div>
                )}
            </div>

            {/* Hidden admin form modal triggered by state */}
            <AnnouncementForm />
        </div>
    );
}
