"use client";

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { logout } from '@/app/lib/actions';
import { switchOrganization } from '@/lib/org-actions';
import { useDashboard } from './dashboard-layout';
import { FiBell, FiSearch, FiUser, FiSettings, FiLogOut, FiHelpCircle, FiMessageSquare, FiChevronDown, FiCheck, FiAlertCircle, FiX } from 'react-icons/fi';
import { useNotifications } from './notifications/notification-provider';
import { useAnnouncements } from './announcements/announcement-provider';
import { AnnouncementDropdown } from './announcements/announcement-dropdown';
import { formatDistanceToNow } from 'date-fns';
import { useLocation } from '@/providers/location-provider';
import { presentOrgRole, orgRoleToneClasses } from '@/types/organization';
import type { OrgBrief } from '@/types/organization';

interface TopNavProps {
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
    roles?: string[];
    orgRole?: string;
    orgName?: string | null;
  };
  orgSlug?: string;
  organizations?: OrgBrief[];
  currentOrgId?: string | null;
}

const TopNav = ({ user, orgSlug, organizations = [], currentOrgId }: TopNavProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isOrgSwitcherOpen, setIsOrgSwitcherOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const orgSwitcherRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);
  const announcementRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const currentOrg = organizations.find(o => o.id === currentOrgId);
  const orgRoleDisplay = user?.orgRole ? presentOrgRole(user.orgRole) : null;
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const { unreadCount: announcementUnreadCount, isDropdownOpen: isAnnouncementsOpen, setIsDropdownOpen: setIsAnnouncementsOpen } = useAnnouncements();
  const { isMobileExpanded, setIsMobileExpanded, setIsCommandOpen } = useDashboard();
  const { attendanceState } = useLocation();

  const [notifMinimized, setNotifMinimized] = useState(false);
  const [announcementMinimized, setAnnouncementMinimized] = useState(false);
  const [isNotifHovered, setIsNotifHovered] = useState(false);
  const [isAnnHovered, setIsAnnHovered] = useState(false);

  useEffect(() => {
    if (unreadCount > 0) {
      setNotifMinimized(false);
      const timer = setTimeout(() => setNotifMinimized(true), 15000);
      return () => clearTimeout(timer);
    }
  }, [unreadCount]);

  useEffect(() => {
    if (announcementUnreadCount > 0) {
      setAnnouncementMinimized(false);
      const timer = setTimeout(() => setAnnouncementMinimized(true), 15000);
      return () => clearTimeout(timer);
    }
  }, [announcementUnreadCount]);

  const statusColor = attendanceState === 'CLOCKED_IN' ? 'bg-emerald-500' : 
                      attendanceState === 'CLOCKED_OUT' ? 'bg-blue-500' : 'bg-zinc-500';

  const handleSwitchOrg = async (orgId: string) => {
    if (orgId === currentOrgId) return;
    setSwitching(true);
    setIsOrgSwitcherOpen(false);
    const result = await switchOrganization(orgId);
    setSwitching(false);
    if (result.success && result.slug) {
      router.push(`/${result.slug}/dashboard`);
    } else {
      window.location.reload();
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
      if (orgSwitcherRef.current && !orgSwitcherRef.current.contains(event.target as Node)) {
        setIsOrgSwitcherOpen(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
      if (announcementRef.current && !announcementRef.current.contains(event.target as Node)) {
        setIsAnnouncementsOpen(false);
      }
    };
 
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [setIsAnnouncementsOpen, setIsOpen, setIsNotificationsOpen, setIsOrgSwitcherOpen]);

  return (
    <>
      <nav className="h-20 px-4 md:px-8 flex items-center justify-between sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-card-border">
        <div className="flex items-center gap-6 flex-1">
          {/* Mobile Logo */}
          <Link href={orgSlug ? `/${orgSlug}/dashboard` : (user ? "/dashboard" : "/")} className="md:hidden flex items-center gap-2">
             <div className="p-1.5 bg-background/50 rounded-lg border border-card-border">
               <Image 
                 src="/logo.svg" 
                 alt="MD Logo" 
                 width={24} 
                 height={24} 
                 className="w-6 h-6 object-contain"
               />
             </div>
             <span className="text-lg font-bold text-foreground tracking-tight">MD<span className="text-emerald-500">*</span></span>
          </Link>

          <div className="relative group hidden md:block w-full max-w-md">
            <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-[var(--pastel-indigo)] transition-colors" />
            <input
              type="text"
              placeholder="Search anything..."
              onClick={() => setIsCommandOpen(true)}
              readOnly
              className="bg-background/50 border border-card-border rounded-xl pl-10 pr-16 py-2.5 text-sm focus:outline-none focus:bg-foreground/[0.06] focus:border-foreground/10 w-full transition-all duration-300 placeholder:text-text-muted font-bold cursor-pointer hidden md:block"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 px-1.5 py-0.5 rounded border border-card-border bg-background/50 text-[11px] font-bold text-text-muted pointer-events-none font-numbers">
              <span className="text-[12px]">⌘</span>
              <span>K</span>
            </div>
          </div>
        </div>

        {/* Org Badge + Inline Switcher */}
        {currentOrg && (
          <div className="relative hidden md:block md:mr-5" ref={orgSwitcherRef}>
            <button
              onClick={() => setIsOrgSwitcherOpen(!isOrgSwitcherOpen)}
              disabled={switching}
              className="flex items-center gap-2 p-2.5 rounded-xl bg-foreground/[0.03] border border-card-border hover:bg-foreground/[0.06] transition-colors text-xs font-bold text-foreground tracking-tight"
            >
              <div className="w-5 h-5 rounded-md bg-foreground/[0.08] flex items-center justify-center text-[10px] font-black text-foreground flex-shrink-0">
                {currentOrg.name.charAt(0).toUpperCase()}
              </div>
              <span className="max-w-[120px] truncate">{currentOrg.name}</span>
              {orgRoleDisplay && (
                <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${orgRoleToneClasses[orgRoleDisplay.tone] || 'bg-zinc-700/50 text-zinc-400 border-white/5'}`}>
                  {orgRoleDisplay.label}
                </span>
              )}
              <FiChevronDown size={12} className={`text-text-muted transition-transform ${isOrgSwitcherOpen ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {isOrgSwitcherOpen && organizations.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}
                  className="absolute left-0 mt-1.5 w-64 bg-background/95 backdrop-blur-xl border border-card-border rounded-xl shadow-2xl overflow-hidden z-50"
                >
                  <div className="px-3 py-2 border-b border-card-border">
                    <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">Switch Organization</p>
                  </div>
                  <div className="max-h-[240px] overflow-y-auto py-1">
                    {organizations.map((org) => {
                      const orgRole = org.role ? presentOrgRole(org.role) : null;
                      return (
                        <button
                          key={org.id}
                          onClick={() => handleSwitchOrg(org.id)}
                          className={`flex items-center w-full gap-3 px-3 py-2.5 text-sm transition-colors hover:bg-foreground/[0.04] ${
                            org.id === currentOrgId ? 'text-foreground font-bold' : 'text-text-secondary'
                          }`}
                        >
                          <div className="w-6 h-6 rounded-md bg-foreground/[0.08] flex items-center justify-center text-[11px] font-black text-foreground flex-shrink-0">
                            {org.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0 text-left">
                            <p className="truncate text-xs">{org.name}</p>
                            {orgRole && (
                              <p className={`text-[9px] font-black uppercase tracking-wider mt-0.5 ${orgRoleToneClasses[orgRole.tone] || 'text-text-muted'}`}>
                                {orgRole.label}
                              </p>
                            )}
                          </div>
                          {org.id === currentOrgId && (
                            <FiCheck size={14} className="text-emerald-500 flex-shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        <div className="flex items-center gap-3 md:gap-5">

          <div className="relative" ref={notificationRef}>
            <button 
              onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
              onMouseEnter={() => setIsNotifHovered(true)}
              onMouseLeave={() => setIsNotifHovered(false)}
              className="relative p-2.5 text-text-muted hover:text-foreground transition-colors bg-background/50 border border-card-border rounded-xl hover:bg-foreground/[0.05] group hover-scale"
            >
              <FiBell className="text-xl group-hover:text-[var(--pastel-yellow)] transition-colors" />
              {unreadCount > 0 && (
                <div className="absolute -top-1 -right-1 flex items-center justify-center pointer-events-none">
                  <motion.div 
                    layout
                    initial={false}
                    animate={{ 
                      width: (!notifMinimized || isNotifHovered) ? (unreadCount > 9 ? 24 : 20) : 12,
                      height: (!notifMinimized || isNotifHovered) ? 20 : 12,
                    }}
                    transition={{ 
                      type: 'spring', 
                      stiffness: 500, 
                      damping: 30,
                    }}
                    className="bg-emerald-500 text-white rounded-full ring-2 ring-background shadow-lg flex items-center justify-center overflow-hidden"
                  >
                    <AnimatePresence mode="wait">
                      {(!notifMinimized || isNotifHovered) ? (
                        <motion.span 
                          key="count"
                          initial={{ opacity: 0, scale: 0.5 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.5 }}
                          className="text-[10px] font-black font-numbers leading-none flex items-center justify-center"
                        >
                          {unreadCount}
                        </motion.span>
                      ) : (
                        <motion.span 
                          key="dot"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="w-1.5 h-1.5 bg-white rounded-full animate-pulse flex-shrink-0"
                        />
                      )}
                    </AnimatePresence>
                  </motion.div>
                </div>
              )}
            </button>

            {isNotificationsOpen && (
              <div className="absolute right-0 left-1/2 -translate-x-1/2 md:left-auto md:translate-x-0 md:right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] bg-background/95 border border-card-border rounded-xl py-2 animate-in fade-in zoom-in-95 duration-200 z-50 backdrop-blur-xl shadow-2xl">
                <div className="px-4 py-3 border-b border-card-border flex justify-between items-center bg-background/50">
                  <p className="text-sm font-black text-foreground uppercase tracking-tight">Notifications</p>
                  {unreadCount > 0 && (
                    <span className="text-[10px] text-text-muted bg-foreground/[0.05] px-2 py-0.5 rounded-full font-black uppercase tracking-wider border border-card-border">{unreadCount} New</span>
                  )}
                </div>
                
                <div className="max-h-[300px] overflow-y-auto bg-background/30">
                  {notifications.length > 0 ? (
                    (() => {
                      const unread = notifications.filter(n => !n.is_read);
                      const displayNotifications = unread.length > 0 
                        ? unread 
                        : notifications.filter(n => n.is_read).slice(0, 7);
                        
                      return displayNotifications.map((notification) => (
                        <div 
                          key={notification.id} 
                          onClick={() => !notification.is_read && markAsRead(notification.id)}
                          className={`px-4 py-3 hover:bg-foreground/[0.04] transition-colors cursor-pointer border-b border-card-border last:border-0 ${!notification.is_read ? 'bg-foreground/[0.02]' : ''}`}
                        >
                          <div className="flex gap-3">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 border shadow-sm ${
                              notification.type === 'success' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                              notification.type === 'error' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                              notification.type === 'warning' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                              'bg-blue-500/10 text-blue-500 border-blue-500/20'
                            }`}>
                              {notification.type === 'success' ? <FiCheck size={14} /> :
                               notification.type === 'error' ? <FiX size={14} /> :
                               notification.type === 'warning' ? <FiAlertCircle size={14} /> :
                               <FiBell size={14} />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm line-clamp-2 ${!notification.is_read ? 'text-foreground font-black uppercase tracking-tight' : 'text-text-secondary font-bold'}`}>
                                {notification.message}
                              </p>
                              <p className="text-[11px] text-text-muted mt-1 font-black font-numbers uppercase tracking-widest opacity-70">
                                {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                              </p>
                            </div>
                            {!notification.is_read && (
                              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                            )}
                          </div>
                        </div>
                      ));
                    })()
                  ) : (
                    <div className="px-4 py-12 text-center">
                      <FiBell className="mx-auto text-text-muted mb-3 opacity-20" size={32} />
                      <p className="text-xs text-text-muted font-black uppercase tracking-widest">No notifications yet</p>
                    </div>
                  )}
                </div>

                {notifications.length > 0 && (
                  <div className="p-2 border-t border-card-border flex gap-2 bg-background/50">
                    {unreadCount > 0 && (
                      <button 
                        onClick={() => markAllAsRead()}
                        className="flex-1 py-2 text-[10px] font-black uppercase tracking-widest text-text-muted hover:text-foreground hover:bg-foreground/[0.05] rounded-lg transition-colors border border-transparent hover:border-card-border"
                      >
                        Mark all as read
                      </button>
                    )}
                    <Link 
                      href={orgSlug ? `/${orgSlug}/notifications` : "/notifications"}
                      onClick={() => setIsNotificationsOpen(false)}
                      className="flex-1 py-2 text-[10px] font-black uppercase tracking-widest text-center bg-foreground/[0.04] text-text-secondary hover:text-foreground hover:bg-foreground/[0.07] rounded-lg transition-colors border border-card-border"
                    >
                      View all
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="relative" ref={announcementRef}>
            <button 
              onClick={() => setIsAnnouncementsOpen(!isAnnouncementsOpen)}
              onMouseEnter={() => setIsAnnHovered(true)}
              onMouseLeave={() => setIsAnnHovered(false)}
              className="relative p-2.5 text-text-muted hover:text-foreground transition-colors bg-background/50 border border-card-border rounded-xl hover:bg-foreground/[0.05] group hover-scale"
              title="Announcements"
            >
              <FiMessageSquare className={`text-xl group-hover:text-[var(--pastel-yellow)] transition-colors ${isAnnouncementsOpen ? 'text-[var(--pastel-yellow)]' : 'text-text-muted'}`} />
              {announcementUnreadCount > 0 && (
                <div className="absolute -top-1 -right-1 flex items-center justify-center pointer-events-none">
                  <motion.div 
                    layout
                    initial={false}
                    animate={{ 
                      width: (!announcementMinimized || isAnnHovered) ? (announcementUnreadCount > 9 ? 24 : 20) : 12,
                      height: (!announcementMinimized || isAnnHovered) ? 20 : 12,
                    }}
                    transition={{ 
                      type: 'spring', 
                      stiffness: 500, 
                      damping: 30,
                    }}
                    className="bg-amber-500 text-zinc-950 rounded-full ring-2 ring-background shadow-lg flex items-center justify-center overflow-hidden"
                  >
                    <AnimatePresence mode="wait">
                      {(!announcementMinimized || isAnnHovered) ? (
                        <motion.span 
                          key="count"
                          initial={{ opacity: 0, scale: 0.5 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.5 }}
                          className="text-[10px] font-black font-numbers leading-none flex items-center justify-center"
                        >
                          {announcementUnreadCount}
                        </motion.span>
                      ) : (
                        <motion.span 
                          key="dot"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="w-1.5 h-1.5 bg-zinc-950 rounded-full animate-pulse flex-shrink-0"
                        />
                      )}
                    </AnimatePresence>
                  </motion.div>
                </div>
              )}
            </button>

            {isAnnouncementsOpen && <AnnouncementDropdown />}
          </div>

          <div className="flex gap-2 hidden md:flex">
            <button className="p-2.5 text-text-muted hover:text-foreground transition-colors bg-background/50 border border-card-border rounded-xl hover:bg-foreground/[0.05] hover-scale" title="Help & Support">
              <FiHelpCircle className="text-xl" />
            </button>
          </div>

          <div className="h-8 w-[1px] bg-foreground/[0.08] hidden md:block"></div>

          {user ? (
            <div className="relative" ref={dropdownRef}>
              <button 
                  onClick={() => setIsOpen(!isOpen)}
                  className="flex items-center gap-3 p-1 rounded-xl hover:bg-foreground/[0.04] transition-all cursor-pointer group focus:outline-none"
              >
                  <div className="relative">
                  {user.image ? (
                      <Image
                          src={user.image}
                          alt="Avatar"
                          width={36}
                          height={36}
                          className="rounded-lg object-cover border-2 border-background group-hover:border-[var(--pastel-purple)]/50 transition-colors"
                      />
                  ) : (
                      <div className="w-9 h-9 rounded-lg bg-background/50 flex items-center justify-center text-foreground font-bold border border-card-border group-hover:border-foreground/10 transition-colors">
                          {user.name?.charAt(0) || user.email?.charAt(0)}
                      </div>
                  )}
                  <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 ${statusColor} rounded-full border-2 border-background`}></span>
                  </div>
                  <div className="hidden lg:block text-left">
                  <p className="text-xs font-bold text-foreground group-hover:text-[var(--pastel-purple)] transition-colors uppercase tracking-tight">
                      {user.name || 'User'}
                  </p>
                  </div>
              </button>

              {/* Dropdown Menu */}
              {isOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-background/80 border border-card-border rounded-xl py-2 animate-in fade-in zoom-in-95 duration-200 z-50 backdrop-blur-xl shadow-2xl">
                      <div className="px-4 py-3 border-b border-card-border mb-2 bg-background/50">
                          <p className="text-sm font-black text-foreground truncate uppercase tracking-tight">{user.name || 'User'}</p>
                          <p className="text-[10px] text-text-muted font-black truncate uppercase tracking-widest">{user.email}</p>
                      </div>
                      
                      <Link 
                          href={orgSlug ? `/${orgSlug}/profile` : "/profile"} 
                      className="flex items-center px-4 py-2.5 text-sm text-text-secondary font-bold hover:text-foreground hover:bg-foreground/[0.04] transition-colors group"
                          onClick={() => setIsOpen(false)}
                      >
                          <FiUser className="mr-3 text-text-muted group-hover:text-[var(--pastel-blue)]" />
                          My Profile
                      </Link>
                      <Link 
                          href={orgSlug ? `/${orgSlug}/settings` : "/settings"} 
                      className="flex items-center px-4 py-2.5 text-sm text-text-secondary font-bold hover:text-foreground hover:bg-foreground/[0.04] transition-colors group"
                          onClick={() => setIsOpen(false)}
                      >
                          <FiSettings className="mr-3 text-text-muted group-hover:text-[var(--pastel-teal)]" />
                          Settings
                      </Link>
                      
                      <div className="border-t border-card-border my-2"></div>
                      
                      <form action={logout}>
                          <button 
                              type="submit"
                              className="flex w-full items-center px-4 py-2.5 text-sm text-rose-500 font-bold hover:bg-rose-500/10 transition-colors group"
                          >
                              <FiLogOut className="mr-3 group-hover:translate-x-0.5 transition-transform" />
                              Sign Out
                          </button>
                      </form>
                  </div>
              )}
            </div>
          ) : (
            <Link href="/login" className="px-4 py-2 rounded-full bg-foreground/[0.07] hover:bg-foreground/[0.12] text-foreground text-sm font-medium transition-colors border border-card-border">
              Login
            </Link>
          )}
        </div>
      </nav>
    </>
  );
};

export default TopNav;
