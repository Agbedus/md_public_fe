'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { toast } from '@/lib/toast';
import useSWR from 'swr';
import { Announcement, AnnouncementCreate, AnnouncementUpdate } from '@/types/announcement';
import { HiSpeakerphone } from 'react-icons/hi';
import { on } from '@/lib/event-bus';
import { playNotificationSound, getSoundEffectsEnabled } from '@/lib/notification-sounds';
import { 
  getAnnouncements,
  createAnnouncement as apiCreateAnnouncement, 
  updateAnnouncement as apiUpdateAnnouncement, 
  deleteAnnouncement as apiDeleteAnnouncement 
} from '@/app/(dashboard)/[orgSlug]/announcements/actions';

interface AnnouncementContextType {
  announcements: Announcement[];
  unreadCount: number;
  isDrawerOpen: boolean;
  setIsDrawerOpen: (open: boolean) => void;
  isDropdownOpen: boolean;
  setIsDropdownOpen: (open: boolean) => void;
  isAdminFormOpen: boolean;
  setIsAdminFormOpen: (open: boolean) => void;
  createAnnouncement: (data: AnnouncementCreate) => Promise<{ success: boolean; error?: string }>;
  updateAnnouncement: (id: string, data: AnnouncementUpdate) => Promise<{ success: boolean; error?: string }>;
  deleteAnnouncement: (id: string) => Promise<{ success: boolean; error?: string }>;
  markAsRead: (id: string) => void;
  user?: any;
}

const AnnouncementContext = createContext<AnnouncementContextType | undefined>(undefined);

export const useAnnouncements = () => {
  const context = useContext(AnnouncementContext);
  if (!context) {
    throw new Error('useAnnouncements must be used within an AnnouncementProvider');
  }
  return context;
};

export const AnnouncementProvider: React.FC<{ children: React.ReactNode, user?: any }> = ({ children, user }) => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isAdminFormOpen, setIsAdminFormOpen] = useState(false);
  const [readIds, setReadIds] = useState<string[]>([]);

  // Load read status from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('read_announcements');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // Use setTimeout to avoid synchronous setState inside effect warning
          setTimeout(() => setReadIds(parsed), 0);
        }
      } catch (e) {
        console.error('Failed to parse read announcements', e);
      }
    }
  }, []);

  // Save read status to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('read_announcements', JSON.stringify(readIds));
  }, [readIds]);

  // SWR for Announcements
  const { data: announcements = [], mutate: mutateAnnouncements } = useSWR<Announcement[]>(
    user?.accessToken ? 'announcements' : null,
    () => getAnnouncements()
  );

  const unreadCount = announcements.filter(a => a.id && !readIds.includes(a.id)).length;

  const markAsRead = useCallback((id: string) => {
    if (!id) return;
    setReadIds(prev => prev.includes(id) ? prev : [...prev, id]);
  }, []);

  const createAnnouncement = async (data: AnnouncementCreate) => {
    const res = await apiCreateAnnouncement(data);
    if (res.success) {
      mutateAnnouncements();
      return { success: true };
    }
    return { success: false, error: res.error || "Failed to create announcement" };
  };

  const updateAnnouncement = async (id: string, data: AnnouncementUpdate) => {
    const res = await apiUpdateAnnouncement(id, data);
    if (res.success) {
      mutateAnnouncements();
      return { success: true };
    }
    return { success: false, error: res.error || "Failed to update announcement" };
  };

  const deleteAnnouncement = async (id: string) => {
    const res = await apiDeleteAnnouncement(id);
    if (res.success) {
      mutateAnnouncements();
      return { success: true };
    }
    return { success: false, error: res.error || "Failed to delete announcement" };
  };

  useEffect(() => {
    if (!user?.id) return;

    return on('announcement:created', (announcement: Announcement) => {
      mutateAnnouncements((current = []) => [announcement, ...current], false);

      if (getSoundEffectsEnabled(user)) {
        const annType = announcement.type === 'critical' ? 'error' : announcement.type || 'info';
        playNotificationSound(annType);
      }

      const creatorImage = announcement.creator?.image || announcement.creator?.avatar_url;

      if (creatorImage) {
        toast.custom(
          (t) => (
            <div
              className={`${t.visible ? 'animate-enter' : 'animate-leave'} flex items-start gap-3 p-3 min-w-[300px] max-w-md`}
              style={{
                background: 'var(--toast-bg)',
                color: 'var(--toast-text)',
                border: '1px solid var(--toast-border)',
                backdropFilter: 'blur(12px)',
                borderRadius: '16px',
                boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
              }}
            >
              <img
                src={creatorImage}
                alt=""
                className="w-9 h-9 rounded-lg object-cover flex-shrink-0 border border-card-border"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-foreground leading-tight">{announcement.title}</p>
                {announcement.content && (
                  <p className="text-xs text-text-muted mt-1 line-clamp-2 leading-relaxed">{announcement.content}</p>
                )}
                <p className="text-[10px] text-[var(--pastel-yellow)] font-bold uppercase tracking-wider mt-1">Announcement</p>
              </div>
            </div>
          ),
          { duration: 6000 }
        );
      } else {
        toast(announcement.title, {
          icon: <HiSpeakerphone size={22} className="text-[var(--pastel-yellow)]" />,
          duration: 6000,
        });
      }
    });
  }, [user?.id, mutateAnnouncements]);

  return (
    <AnnouncementContext.Provider value={{ 
      announcements, 
      unreadCount,
      isDrawerOpen,
      setIsDrawerOpen,
      isDropdownOpen,
      setIsDropdownOpen,
      isAdminFormOpen,
      setIsAdminFormOpen,
      createAnnouncement,
      updateAnnouncement,
      deleteAnnouncement,
      markAsRead,
      user
    }}>
      {children}
    </AnnouncementContext.Provider>
  );
};
