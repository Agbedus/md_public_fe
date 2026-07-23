'use client';

import React from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { FiMessageSquare, FiBell, FiChevronRight } from 'react-icons/fi';
import { useAnnouncements } from './announcement-provider';

export const AnnouncementDropdown = () => {
  const { announcements, unreadCount, setIsDropdownOpen, setIsDrawerOpen } = useAnnouncements();
  
  const latestAnnouncements = announcements.slice(0, 5);

  return (
    <div className="absolute right-0 left-1/2 -translate-x-1/2 md:left-auto md:translate-x-0 md:right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] bg-background/95 border border-card-border rounded-xl py-2 animate-in fade-in zoom-in-95 duration-200 z-50 backdrop-blur-xl shadow-2xl">
      <div className="px-4 py-3 border-b border-card-border flex justify-between items-center bg-background/50">
        <div className="flex items-center gap-2">
          <FiMessageSquare className="text-[var(--pastel-yellow)]" size={16} />
          <p className="text-sm font-black text-foreground uppercase tracking-tight">Broadcasts</p>
        </div>
        {unreadCount > 0 && (
          <span className="text-[10px] text-zinc-950 bg-[var(--pastel-yellow)] px-2.5 py-1 rounded-full font-black uppercase tracking-wider shadow-sm animate-pulse">{unreadCount} New</span>
        )}
      </div>
      
      <div className="max-h-[350px] overflow-y-auto bg-background/30">
        {latestAnnouncements.length > 0 ? (
          latestAnnouncements.map((announcement, index) => (
            <div 
              key={announcement.id || `dropdown-${index}`}
              onClick={() => {
                setIsDropdownOpen(false);
                setIsDrawerOpen(true);
              }}
              className="px-4 py-4 hover:bg-foreground/[0.04] transition-colors cursor-pointer border-b border-card-border last:border-0 group"
            >
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-xl bg-foreground/[0.03] border border-card-border flex items-center justify-center flex-shrink-0 group-hover:border-[var(--pastel-yellow)]/30 transition-colors shadow-sm">
                  <FiBell className="text-text-secondary group-hover:text-[var(--pastel-yellow)]" size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground font-black line-clamp-1 group-hover:text-[var(--pastel-yellow)] transition-colors uppercase tracking-tight">
                    {announcement.title}
                  </p>
                  <p className="text-xs text-text-secondary line-clamp-2 mt-0.5 font-bold">
                    {announcement.content}
                  </p>
                  <p className="text-[10px] text-text-muted opacity-80 mt-2 uppercase tracking-[0.15em] font-black">
                    {(() => {
                      try {
                        const date = announcement.created_at ? new Date(announcement.created_at) : new Date();
                        return isNaN(date.getTime()) ? 'Just now' : formatDistanceToNow(date, { addSuffix: true });
                      } catch (e) {
                        return 'Just now';
                      }
                    })()}
                  </p>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="px-4 py-12 text-center">
            <FiMessageSquare className="mx-auto text-text-muted opacity-20 mb-3" size={32} />
            <p className="text-xs text-text-muted font-black uppercase tracking-widest">No broadcasts</p>
          </div>
        )}
      </div>

      <div className="p-3 border-t border-card-border bg-background/50">
        <button 
          onClick={() => {
            setIsDropdownOpen(false);
            setIsDrawerOpen(true);
          }}
          className="w-full py-2.5 text-[11px] font-black uppercase tracking-[0.15em] text-text-secondary hover:text-foreground bg-foreground/[0.03] hover:bg-foreground/[0.06] rounded-xl transition-all border border-card-border flex items-center justify-center gap-2 group"
        >
          View all broadcasts
          <FiChevronRight className="group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>
    </div>
  );
};
