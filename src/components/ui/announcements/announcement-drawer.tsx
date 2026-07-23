'use client';

import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiPlus, FiChevronRight, FiClock, FiSearch, FiInfo, FiTrash2, FiCheckCircle, FiAlertTriangle, FiAlertCircle, FiZap, FiMessageSquare } from 'react-icons/fi';
import { HiSpeakerphone } from 'react-icons/hi';
import { useAnnouncements } from './announcement-provider';
import { formatDistanceToNow } from 'date-fns';
import { AnnouncementForm } from './announcement-form';
import { CreatorAvatar } from './creator-avatar';

export const AnnouncementDrawer = () => {
  const { 
    announcements, 
    isDrawerOpen, 
    setIsDrawerOpen, 
    isAdminFormOpen, 
    setIsAdminFormOpen,
    deleteAnnouncement,
    markAsRead,
    user
  } = useAnnouncements();

  const drawerRef = useRef<HTMLDivElement>(null);
  const isSuperAdmin = user?.roles?.includes('SUPER_ADMIN') || 
                      user?.role === 'SUPER_ADMIN' || 
                      user?.roles?.includes('MANAGER') || 
                      user?.role === 'MANAGER';

  // Load latest first
  const sortedAnnouncements = [...announcements].sort((a, b) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (drawerRef.current && !drawerRef.current.contains(event.target as Node)) {
        setIsDrawerOpen(false);
      }
    };

    if (isDrawerOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      // Mark all visible as read
      announcements.forEach(a => markAsRead(a.id));
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDrawerOpen, announcements, markAsRead, setIsDrawerOpen]);

  const getTypeStyles = (type: string) => {
    switch (type) {
      case 'success': return 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      case 'warning': return 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20';
      case 'error': return 'text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/20';
      case 'critical': return 'text-purple-600 dark:text-purple-400 bg-purple-500/10 border-purple-500/20';
      default: return 'text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/20';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'success': return <FiCheckCircle size={10} />;
      case 'warning': return <FiAlertTriangle size={10} />;
      case 'error': return <FiAlertCircle size={10} />;
      case 'critical': return <FiZap size={10} />;
      default: return <FiInfo size={10} />;
    }
  };

  return (
    <AnimatePresence>
      {isDrawerOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsDrawerOpen(false)}
            className="fixed inset-0 bg-white/40 dark:bg-black/40 backdrop-blur-md z-[60]"
          />

          {/* Drawer */}
          <motion.div
            ref={drawerRef}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-background border-l border-card-border z-[70]  flex flex-col"
          >
            {/* Header */}
            <div className="p-6 border-b border-card-border flex justify-between items-center bg-background/80 backdrop-blur-md">
              <div>
                <h2 className="text-xl font-bold text-foreground flex items-center gap-3 italic tracking-tight">
                  <HiSpeakerphone className="text-[var(--pastel-yellow)]" />
                  Announcements
                </h2>
                <p className="text-[10px] text-text-muted mt-1 font-black uppercase tracking-[0.2em]">System-Wide Broadcasts</p>
              </div>
              <button 
                onClick={() => setIsDrawerOpen(false)}
                className="p-2.5 hover:bg-foreground/5 rounded-xl text-text-secondary hover:text-foreground transition-all border border-transparent hover:border-card-border"
              >
                <FiX size={18} />
              </button>
            </div>

            {/* Admin Form - Now a global modal */}
            <AnnouncementForm />

            {/* List */}
            <div className="flex-1 overflow-y-auto px-0 py-2 space-y-px custom-scrollbar bg-background">
              {sortedAnnouncements.length > 0 ? (
                sortedAnnouncements.map((announcement, index) => (
                  <motion.div 
                    key={announcement.id || `announcement-${index}`}
                    layout
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="group relative flex items-start gap-4 p-6 hover:bg-foreground/[0.03] transition-all border-b border-card-border last:border-0"
                  >
                    {/* Creator Avatar with Dynamic Fetching */}
                    <CreatorAvatar 
                      userId={announcement.creator_id} 
                      initialUser={announcement.creator} 
                      size={28} 
                      className="mt-1"
                    />

                    <div className="flex-1 min-w-0 space-y-3">
                      <div className="flex justify-between items-start">
                        <h3 className="text-sm font-bold text-foreground truncate group-hover:text-[var(--pastel-yellow)] transition-colors pr-8">
                          {announcement.title}
                        </h3>
                        
                        {isSuperAdmin && (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteAnnouncement(announcement.id);
                            }}
                            className="absolute top-5 right-5 p-2 text-text-muted hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all opacity-0 group-hover:opacity-100 border border-transparent hover:border-rose-500/20"
                            title="Delete Announcement"
                          >
                            <FiTrash2 size={14} />
                          </button>
                        )}
                      </div>
                      
                      <p className="text-sm text-text-secondary font-bold line-clamp-4 leading-relaxed">
                        {announcement.content}
                      </p>

                      <div className="pt-2 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-[10px] text-text-muted font-black uppercase tracking-widest">
                          <FiClock size={12} className="text-text-muted" />
                          <span>
                            {(() => {
                              try {
                                const date = announcement.created_at ? new Date(announcement.created_at) : new Date();
                                return isNaN(date.getTime()) ? 'Just now' : formatDistanceToNow(date, { addSuffix: true });
                              } catch (e) {
                                return 'Just now';
                              }
                            })()}
                          </span>
                        </div>

                        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[9px] font-black uppercase tracking-[0.15em] ${getTypeStyles(announcement.type || 'info')}`}>
                           {getTypeIcon(announcement.type || 'info')}
                           <span>{announcement.type || 'info'}</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center py-32">
                  <FiMessageSquare size={48} className="mb-6 text-text-muted opacity-20" />
                  <p className="text-xs font-bold text-text-muted uppercase tracking-[0.2em]">No active broadcasts</p>
                  <p className="text-[11px] text-text-muted mt-2 font-medium uppercase tracking-widest">Check back later for system updates</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-5 border-t border-card-border bg-background/80 backdrop-blur-md flex items-center justify-between">
              {/* Minimal Add Button (Style from task table) */}
              <button
                onClick={() => setIsAdminFormOpen(true)}
                className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-foreground/[0.03] hover:bg-foreground/[0.06] border border-card-border hover:border-[var(--pastel-yellow)]/30 text-xs text-text-muted hover:text-foreground transition-all duration-300 group"
                title="Post New Announcement"
              >
                <div className="p-1.5 rounded-lg bg-foreground/[0.03] group-hover:bg-foreground/[0.06] transition-colors border border-card-border">
                  <FiPlus className="w-3.5 h-3.5 text-[var(--pastel-yellow)]" />
                </div>
                <span className="font-black uppercase tracking-[0.2em] text-[9px]">New Broadcast</span>
              </button>

              {/* Info Tooltip */}
              <div className="relative group">
                <button className="p-3 text-text-secondary hover:text-foreground transition-colors bg-foreground/[0.03] rounded-2xl border border-card-border hover:bg-foreground/[0.06] hover:border-card-border">
                  <FiInfo size={18} />
                </button>
                <div className="absolute bottom-full right-0 mb-4 w-72 p-5 bg-background/95 backdrop-blur-xl border border-card-border rounded-3xl shadow-2xl opacity-0 translate-y-2 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 z-[80]">
                  <p className="text-[10px] text-text-secondary font-black uppercase tracking-widest leading-relaxed">
                    Stay updated with the latest platform news. All broadcasts are strictly for internal system purposes.
                  </p>
                  <div className="absolute bottom-[-6px] right-5 w-3 h-3 bg-background border-r border-b border-card-border rotate-45" />
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
