'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useNotifications, Notification } from '@/components/ui/notifications/notification-provider';
import { 
  FiBell, 
  FiCheck, 
  FiX, 
  FiAlertCircle, 
  FiClock, 
  FiCheckCircle, 
  FiSearch, 
  FiInbox, 
  FiFileText, 
  FiLayers, 
  FiCpu, 
  FiFilter,
  FiUser,
  FiMaximize2,
  FiChevronRight,
  FiShare2,
  FiTag
} from 'react-icons/fi';
import Image from 'next/image';
import { Portal } from '@/components/ui/portal';
import { formatDistanceToNow } from 'date-fns';

type Category = 'all' | 'tasks' | 'notes' | 'projects' | 'system' | 'attendance';

interface TabItem {
  id: Category;
  label: string;
  icon: React.ElementType;
}

const tabs: TabItem[] = [
  { id: 'all', label: 'Inbox', icon: FiInbox },
  { id: 'attendance', label: 'Presence', icon: FiClock },
  { id: 'tasks', label: 'Tasks', icon: FiCheckCircle },
  { id: 'notes', label: 'Notes', icon: FiFileText },
  { id: 'projects', label: 'Projects', icon: FiLayers },
  { id: 'system', label: 'System', icon: FiCpu },
];

// SenderAvatar helper component with hover card logic
function SenderAvatar({ user, size = 'sm' }: { user: any, size?: 'xs' | 'sm' | 'md' }) {
  const [isHovered, setIsHovered] = useState(false);
  const triggerRef = React.useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ top: 0, left: 0 });

  const handleMouseEnter = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setCoords({
        top: rect.top,
        left: rect.left + rect.width / 2,
      });
      setIsHovered(true);
    }
  };

  const name = user?.fullName || user?.name || 'System';
  const initials = name.charAt(0).toUpperCase();
  const avatar = user?.avatarUrl || user?.image;

  const sizeClasses = {
    xs: 'h-6 w-6 text-[11px]',
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
  };

  return (
    <>
      <div 
        ref={triggerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={() => setIsHovered(false)}
        className={`relative rounded-full ring-2 ring-background bg-foreground/[0.05] flex-shrink-0 flex items-center justify-center overflow-hidden cursor-pointer ${sizeClasses[size]}`}
      >
        {avatar ? (
          <Image src={avatar} alt={name} fill className="object-cover" />
        ) : (
          <span className="font-bold text-emerald-500">{initials}</span>
        )}
      </div>

      {isHovered && user && (
        <Portal>
          <div 
            style={{
              position: 'fixed',
              top: `${coords.top - 8}px`,
              left: `${coords.left}px`,
              transform: 'translate(-50%, -100%)',
            }}
            className="w-48 p-3 bg-card border border-card-border rounded-xl shadow-xl z-[9999] animate-in fade-in slide-in-from-bottom-1 duration-200"
          >
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/20">
                  {initials}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-foreground truncate">{name}</p>
                  <p className="text-[11px] text-text-muted truncate">{user.email}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1">
                {user.roles?.map((role: string) => (
                  <span key={role} className="px-1.5 py-0.5 rounded-md bg-foreground/[0.03] border border-card-border text-[11px] font-medium uppercase tracking-wider text-text-muted">
                    {role}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </Portal>
      )}
    </>
  );
}

export default function NotificationsPage() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, user, users } = useNotifications();
  const [activeTab, setActiveTab] = useState<Category>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const isSuperAdmin = user?.roles?.includes('SUPER_ADMIN');

  const filteredNotifications = useMemo(() => {
    return notifications.filter(n => {
      const matchesSearch = 
        n.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        n.message.toLowerCase().includes(searchQuery.toLowerCase());
      
      if (!matchesSearch) return false;
      if (activeTab === 'all') return true;

      if (activeTab === 'attendance') return n.resource_type === 'attendance' || n.title.toLowerCase().includes('attendance') || n.message.toLowerCase().includes('clock');
      if (activeTab === 'tasks') return n.resource_type === 'task' || n.title.toLowerCase().includes('task');
      if (activeTab === 'notes') return n.resource_type === 'note' || n.title.toLowerCase().includes('note');
      if (activeTab === 'projects') return n.resource_type === 'project' || n.title.toLowerCase().includes('project');
      if (activeTab === 'system') return n.resource_type === 'system' || (!n.resource_type && !n.title.toLowerCase().match(/task|note|project|attendance|clock/));
      
      return true;
    }).map(n => ({
      ...n,
      sender: users.find(u => u.id === n.sender_id)
    }));
  }, [notifications, activeTab, searchQuery, users]);

  // Track filtered notifications to auto-select the first one if none is selected during render
  const [prevFilteredCount, setPrevFilteredCount] = useState(0);
  
  if (filteredNotifications.length !== prevFilteredCount) {
    setPrevFilteredCount(filteredNotifications.length);
    if (filteredNotifications.length > 0 && !selectedId) {
      setSelectedId(filteredNotifications[0].id);
    }
  }

  const selectedNotification = useMemo(() => 
    filteredNotifications.find(n => n.id === selectedId) || null
  , [filteredNotifications, selectedId]);

  const handleSelect = (idx: string) => {
    setSelectedId(idx);
    const notification = notifications.find(n => n.id === idx);
    if (notification && !notification.is_read) {
      markAsRead(idx);
    }
  };

  const notificationStats = useMemo(() => {
    const stats = {
      all: notifications.length,
      attendance: notifications.filter(n => n.resource_type === 'attendance' || n.title.toLowerCase().includes('attendance') || n.message.toLowerCase().includes('clock')).length,
      tasks: notifications.filter(n => n.resource_type === 'task' || n.title.toLowerCase().includes('task')).length,
      notes: notifications.filter(n => n.resource_type === 'note' || n.title.toLowerCase().includes('note')).length,
      projects: notifications.filter(n => n.resource_type === 'project' || n.title.toLowerCase().includes('project')).length,
      system: notifications.filter(n => n.resource_type === 'system' || (!n.resource_type && !n.title.toLowerCase().match(/task|note|project|attendance|clock/))).length,
    };
    return stats;
  }, [notifications]);

  return (
    <div className="px-4 py-8 max-w-[1600px] mx-auto h-[calc(100vh-40px)] flex flex-col overflow-hidden">
      <div className="mb-4 flex flex-col md:flex-row md:items-end justify-between gap-4 shrink-0 px-1">
        <div>
          <h1 className="text-lg font-medium text-foreground mb-0.5 tracking-tight flex items-center gap-2 uppercase">
             Notifications
          </h1>
          <p className="text-text-muted text-[11px] font-bold uppercase tracking-wider">Mission Intelligence Feed</p>
        </div>
        <div className="flex items-center gap-3">
            {unreadCount > 0 && (
              <button 
                onClick={markAllAsRead}
                className="px-3 py-1.5 text-[11px] font-medium uppercase tracking-wider text-emerald-500 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-lg border border-emerald-500/20 transition-all active:scale-95"
              >
                Flush unread
              </button>
            )}
        </div>
      </div>

      <div className="bg-card rounded-[2rem] overflow-hidden border border-card-border flex flex-col md:flex-row flex-1 mb-12 shadow-xl">
        {/* Leftmost Sidebar - Categories */}
        <div className="w-full md:w-20 lg:w-24 border-r border-card-border flex md:flex-col bg-foreground/[0.02] p-2 gap-2 overflow-x-auto md:overflow-x-hidden no-scrollbar">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 md:flex-none flex flex-col items-center justify-center p-3 rounded-2xl transition-all duration-300 gap-1.5 group ${
                activeTab === tab.id 
                  ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' 
                  : 'text-text-muted hover:text-foreground hover:bg-foreground/[0.03] border border-transparent hover:border-card-border'
              }`}
            >
              <tab.icon className={`w-5 h-5 group-hover:scale-110 transition-transform ${activeTab === tab.id ? 'fill-current opacity-20' : ''}`} />
              <span className="text-[9px] font-black uppercase tracking-[0.15em]">{tab.label}</span>
              {notificationStats[tab.id] > 0 && (
                <div className={`mt-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                  activeTab === tab.id ? 'bg-emerald-500 text-white dark:text-zinc-950' : 'bg-foreground/[0.05] text-text-muted'
                }`}>
                  {notificationStats[tab.id]}
                </div>
              )}
            </button>
          ))}
        </div>

        {/* List Pane */}
        <div className="w-full md:w-80 lg:w-96 border-r border-card-border flex flex-col bg-foreground/[0.01]">
          <div className="p-4 border-b border-card-border bg-foreground/[0.01]">
            <div className="relative group">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-emerald-500 transition-colors w-3.5 h-3.5" />
              <input 
                type="text"
                placeholder="Search resources..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-background border border-card-border rounded-xl pl-9 pr-3 py-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500/20 focus:border-emerald-500/30 transition-all placeholder:text-text-muted/50 font-medium"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-card-border no-scrollbar">
            {filteredNotifications.length > 0 ? (
              filteredNotifications.map((n) => (
                <div 
                  key={n.id}
                  onClick={() => handleSelect(n.id)}
                  className={`px-5 py-5 cursor-pointer transition-all relative group ${
                    selectedId === n.id 
                      ? 'bg-emerald-500/[0.04]' 
                      : 'hover:bg-foreground/[0.02]'
                  }`}
                >
                  <div className="flex gap-3">
                    <SenderAvatar user={n.sender} size="xs" />
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex justify-between items-start">
                        <p className={`text-[11px] font-bold truncate transition-colors ${selectedId === n.id ? 'text-emerald-500 dark:text-emerald-400' : 'text-foreground group-hover:text-emerald-500 dark:group-hover:text-emerald-300'}`}>
                          {n.title}
                        </p>
                        {!n.is_read && (
                          <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse shrink-0 ml-2 mt-1" />
                        )}
                      </div>
                      <p className="text-[11px] text-text-muted line-clamp-2 leading-relaxed font-medium">
                        {n.message}
                      </p>
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[11px] font-medium uppercase tracking-wider text-text-muted/60">
                           {n.resource_type || 'General'}
                        </span>
                        <span className="text-[11px] text-text-muted font-medium uppercase tracking-tight bg-foreground/[0.03] px-1.5 py-0.5 rounded-md border border-card-border">
                          {formatDistanceToNow(new Date(n.created_at), { addSuffix: false })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-4 opacity-50">
                <div className="w-16 h-16 rounded-3xl bg-foreground/[0.03] flex items-center justify-center border border-card-border">
                   <FiBell size={24} className="text-text-muted" />
                </div>
                <p className="text-[11px] font-medium uppercase tracking-wider text-text-muted">No transmissions found</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Pane - Content */}
        <div className="hidden md:flex flex-1 flex-col bg-background relative">
          {/* Decorative background grid - more subtle in light mode */}
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.02] dark:opacity-[0.03] pointer-events-none" />
          
          {selectedNotification ? (
            <div className="h-full flex flex-col overflow-hidden animate-in fade-in slide-in-from-right-4 duration-500 relative z-10">
               <div className="p-6 lg:p-8 border-b border-card-border bg-foreground/[0.01] backdrop-blur-sm">
                <div className="flex justify-between items-start gap-6">
                  <div className="flex items-center gap-4 min-w-0">
                    <SenderAvatar user={selectedNotification.sender} size="sm" />
                    <div className="space-y-1">
                       <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-md text-[11px] font-medium uppercase tracking-wider border transition-all ${
                          selectedNotification.type === 'success' ? 'bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 border-emerald-500/20' :
                          selectedNotification.type === 'error' ? 'bg-red-500/10 text-red-500 dark:text-red-400 border-red-500/20' :
                          selectedNotification.type === 'warning' ? 'bg-amber-500/10 text-amber-500 dark:text-amber-400 border-amber-500/20' :
                          'bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 border-indigo-500/20'
                        }`}>
                          {selectedNotification.type}
                        </span>
                        <div className="h-3 w-[1px] bg-card-border" />
                        <span className="text-[11px] text-text-muted flex items-center gap-1.5 font-medium uppercase tracking-wider">
                          <FiClock className="w-3 h-3 text-indigo-500/30" />
                          {new Date(selectedNotification.created_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
                        </span>
                      </div>
                      <h2 className="text-2xl lg:text-3xl font-medium text-foreground tracking-tight leading-tight uppercase">
                        {selectedNotification.title}
                      </h2>
                    </div>
                  </div>
                  <div className="flex gap-1.5 shrink-0 pt-1">
                    <button className="p-2 rounded-xl bg-foreground/[0.03] border border-card-border text-text-muted hover:text-foreground hover:bg-foreground/[0.06] transition-all active:scale-95 group ">
                      <FiShare2 size={14} className="group-hover:rotate-12 transition-transform" />
                    </button>
                    <button className="p-2 rounded-xl bg-foreground/[0.03] border border-card-border text-text-muted hover:text-emerald-500 dark:hover:text-emerald-400 hover:bg-emerald-500/10 transition-all active:scale-95 group ">
                      <FiMaximize2 size={14} className="group-hover:scale-110 transition-transform" />
                    </button>
                  </div>
                </div>
              </div>

               <div className="flex-1 overflow-y-auto p-6 lg:p-10 space-y-8 no-scrollbar">
                <div className="max-w-3xl">
                  <p className="text-base lg:text-lg text-text-secondary leading-relaxed font-medium italic">
                    &quot;{selectedNotification.message}&quot;
                  </p>
                  
                  {/* Metadata Matrix */}
                  <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl bg-foreground/[0.02] border border-card-border space-y-1">
                      <p className="text-[11px] font-medium text-text-muted uppercase tracking-wider">Transaction ID</p>
                      <p className="text-[11px] font-mono text-text-secondary truncate">{selectedNotification.id}</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-foreground/[0.02] border border-card-border space-y-1">
                      <p className="text-[11px] font-medium text-text-muted uppercase tracking-wider">Source Vector</p>
                      <p className="text-[11px] font-mono text-text-secondary uppercase tracking-tight">{selectedNotification.resource_type || 'SYSTEM_CORE'}</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-foreground/[0.02] border border-card-border space-y-1">
                      <p className="text-[11px] font-medium text-text-muted uppercase tracking-wider">Entity ID</p>
                      <p className="text-[11px] font-mono text-text-secondary truncate">{selectedNotification.resource_id || 'NULL'}</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-foreground/[0.02] border border-card-border space-y-1">
                      <p className="text-[11px] font-medium text-text-muted uppercase tracking-wider">Authority</p>
                      <p className="text-[11px] font-mono text-text-secondary truncate uppercase">{selectedNotification.sender?.fullName || 'SYSTEM'}</p>
                    </div>
                  </div>

                  <div className="mt-6 flex items-center gap-4">
                    <div className={`h-1.5 w-1.5 rounded-full ${selectedNotification.is_read ? 'bg-text-muted/30' : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'}`} />
                    <p className="text-[11px] font-medium text-text-muted uppercase tracking-wider">
                      Transmission Status: {selectedNotification.is_read ? 'VERIFIED' : 'PENDING_ACK'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6 lg:p-8 border-t border-card-border bg-foreground/[0.01] backdrop-blur-md">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="flex flex-col gap-1.5 min-w-0">
                    <p className="text-[11px] font-medium text-text-muted uppercase tracking-wider text-center md:text-left">Recipient Designation</p>
                    <div className="px-4 py-2 rounded-xl bg-foreground/[0.02] border border-card-border">
                      <p className="text-[11px] font-mono text-text-muted truncate tracking-tight">{selectedNotification.recipient_id}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 bg-background px-6 py-3 rounded-2xl border border-card-border ">
                    <div className="flex items-center gap-3">
                      <FiTag className="text-emerald-500 w-3.5 h-3.5" /> 
                      <span className="text-[11px] font-medium uppercase tracking-wider text-text-muted">{selectedNotification.resource_type || 'General'}</span>
                    </div>
                    <div className="h-4 w-[1px] bg-card-border" />
                    <div className="flex items-center gap-3">
                      <FiCheckCircle className="text-indigo-500 w-3.5 h-3.5" />
                      <span className="text-[11px] font-medium uppercase tracking-wider text-text-muted">Vector Secure</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-12 space-y-8 animate-in fade-in duration-700">
              <div className="relative">
                <div className="absolute inset-0 bg-emerald-500/10 blur-[120px] rounded-full animate-pulse" />
                <div className="relative w-48 h-48 rounded-[4.5rem] bg-card border border-card-border flex items-center justify-center text-text-muted/20 backdrop-blur-xl transform hover:scale-105 transition-transform duration-700 border-dashed">
                  <FiInbox size={72} />
                </div>
              </div>
              <div className="space-y-4 max-w-sm">
                <h3 className="text-3xl font-medium text-foreground uppercase tracking-wider">Awaiting Uplink</h3>
                <p className="text-text-muted font-medium leading-relaxed">System is operational. Select a classified transmission to hydrate tactical details.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
