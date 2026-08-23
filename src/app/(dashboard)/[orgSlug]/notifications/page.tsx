'use client';

import { useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  FiAlertCircle, FiBell, FiCalendar, FiCheck, FiCheckCircle,
  FiChevronLeft, FiChevronRight, FiClock, FiFileText, FiInbox,
  FiLayers, FiSearch, FiUsers, FiX,
  FiLoader,
} from 'react-icons/fi';
import { format, formatDistanceToNow, isToday, isYesterday } from 'date-fns';
import { Notification, useNotifications } from '@/components/ui/notifications/notification-provider';

type InboxView = 'all' | 'attention' | 'unread';
type Category = 'all' | 'attendance' | 'tasks' | 'projects' | 'notes' | 'team' | 'time_off' | 'events' | 'system';

interface DirectoryUser {
  id: string;
  fullName?: string | null;
  name?: string | null;
  email?: string | null;
}

const categories: Array<{ value: Category; label: string }> = [
  { value: 'all', label: 'All categories' },
  { value: 'attendance', label: 'Attendance' },
  { value: 'tasks', label: 'Tasks' },
  { value: 'projects', label: 'Projects' },
  { value: 'notes', label: 'Notes' },
  { value: 'team', label: 'Team' },
  { value: 'time_off', label: 'Time off' },
  { value: 'events', label: 'Events' },
  { value: 'system', label: 'System' },
];

function categoryFor(notification: Notification): Category {
  const resource = notification.resource_type;
  if (resource === 'task') return 'tasks';
  if (resource === 'project') return 'projects';
  if (resource === 'note') return 'notes';
  if (resource === 'attendance') return 'attendance';
  if (resource === 'invitation' || resource === 'user') return 'team';
  if (resource === 'time_off') return 'time_off';
  if (resource === 'event' || resource === 'announcement') return 'events';
  return 'system';
}

function iconFor(notification: Notification) {
  const category = categoryFor(notification);
  if (category === 'attendance') return FiClock;
  if (category === 'tasks') return FiCheckCircle;
  if (category === 'projects') return FiLayers;
  if (category === 'notes') return FiFileText;
  if (category === 'team') return FiUsers;
  if (category === 'time_off' || category === 'events') return FiCalendar;
  return notification.type === 'warning' || notification.type === 'error' ? FiAlertCircle : FiBell;
}

function destinationFor(notification: Notification, orgSlug: string): string | null {
  const base = `/${orgSlug}`;
  switch (notification.resource_type) {
    case 'task': return `${base}/tasks`;
    case 'project': return `${base}/projects`;
    case 'note': return `${base}/notes`;
    case 'attendance': return `${base}/attendance`;
    case 'invitation':
    case 'user': return `${base}/team`;
    case 'time_off': return `${base}/time-off`;
    case 'event': return `${base}/calendar`;
    case 'announcement': return `${base}/announcements`;
    default: return null;
  }
}

function dateGroup(value: string): string {
  const date = new Date(value);
  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'MMMM d, yyyy');
}

export default function NotificationsPage() {
  const router = useRouter();
  const params = useParams<{ orgSlug: string }>();
  const { notifications, unreadCount, markAsRead, markAllAsRead, readingIds, isMarkingAllRead, users } = useNotifications();
  const [activeView, setActiveView] = useState<InboxView>('all');
  const [category, setCategory] = useState<Category>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = useMemo(() => notifications.filter((notification) => {
    if (activeView === 'unread' && notification.is_read) return false;
    if (activeView === 'attention' && !['warning', 'error'].includes(notification.type)) return false;
    if (category !== 'all' && categoryFor(notification) !== category) return false;
    const query = searchQuery.trim().toLowerCase();
    return !query || `${notification.title} ${notification.message}`.toLowerCase().includes(query);
  }), [activeView, category, notifications, searchQuery]);

  const grouped = useMemo(() => {
    const result = new Map<string, Notification[]>();
    for (const notification of filtered) {
      const label = dateGroup(notification.created_at);
      result.set(label, [...(result.get(label) ?? []), notification]);
    }
    return Array.from(result.entries());
  }, [filtered]);

  const selected = notifications.find((notification) => notification.id === selectedId) ?? null;
  const selectedSender = selected?.sender_id
    ? (users as DirectoryUser[]).find((person) => person.id === selected.sender_id)
    : null;

  const selectNotification = (notification: Notification) => {
    setSelectedId(notification.id);
    if (!notification.is_read) void markAsRead(notification.id);
  };

  const openResource = (notification: Notification) => {
    const destination = destinationFor(notification, params.orgSlug);
    if (destination) router.push(destination);
  };

  return (
    <main className="mx-auto flex min-h-[calc(100dvh-8rem)] w-full max-w-[1600px] flex-col gap-4 px-3 py-4 sm:px-4 md:py-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Notifications</h1>
          <p className="mt-1 text-sm text-text-muted">Updates that need your attention across this workspace.</p>
        </div>
        {unreadCount > 0 && (
          <button type="button" onClick={() => void markAllAsRead()} disabled={isMarkingAllRead} aria-busy={isMarkingAllRead} className="inline-flex min-h-11 items-center gap-2 rounded-md border border-card-border bg-card px-4 py-2.5 text-sm font-medium text-foreground transition-[transform,opacity,background-color] duration-150 hover:bg-foreground/[0.05] active:scale-[0.98] disabled:cursor-wait disabled:opacity-70">
            {isMarkingAllRead ? <FiLoader className="h-4 w-4 animate-spin text-emerald-500" /> : <FiCheck className="h-4 w-4 text-emerald-500" />} {isMarkingAllRead ? 'Marking read…' : 'Mark all read'}
          </button>
        )}
      </header>

      <section className="grid min-h-[620px] flex-1 overflow-hidden rounded-2xl border border-card-border bg-card shadow-sm md:grid-cols-[minmax(320px,0.9fr)_minmax(0,1.3fr)]">
        <div className={`${selected ? 'hidden md:flex' : 'flex'} min-w-0 flex-col border-card-border md:border-r`}>
          <div className="space-y-3 border-b border-card-border p-3 sm:p-4">
            <div className="flex rounded-lg bg-foreground/[0.04] p-1" aria-label="Notification views">
              {(['all', 'attention', 'unread'] as InboxView[]).map((view) => (
                <button type="button" key={view} onClick={() => setActiveView(view)} className={`min-h-11 flex-1 rounded-md px-3 py-2 text-sm font-medium capitalize transition-colors ${activeView === view ? 'bg-card text-foreground shadow-sm' : 'text-text-muted hover:text-foreground'}`}>
                  {view}{view === 'unread' && unreadCount > 0 ? ` ${unreadCount}` : ''}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <label className="relative min-w-0 flex-1">
                <span className="sr-only">Search notifications</span>
                <FiSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search notifications" className="h-11 w-full rounded-md border border-card-border bg-input-bg pl-10 pr-10 text-sm text-foreground outline-none placeholder:text-text-muted focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20" />
                {searchQuery && (
                  <button type="button" onClick={() => setSearchQuery('')} aria-label="Clear notification search" className="absolute right-1 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-md text-text-muted hover:bg-foreground/[0.05] hover:text-foreground">
                    <FiX className="h-4 w-4" />
                  </button>
                )}
              </label>
              <label>
                <span className="sr-only">Filter by category</span>
                <select value={category} onChange={(event) => setCategory(event.target.value as Category)} className="h-11 max-w-36 rounded-md border border-card-border bg-input-bg px-3 text-sm text-foreground outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20">
                  {categories.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>
              </label>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {grouped.length ? grouped.map(([label, items]) => (
              <section key={label} aria-labelledby={`notification-group-${label}`}>
                <h2 id={`notification-group-${label}`} className="sticky top-0 z-10 border-b border-card-border bg-card/95 px-4 py-2 text-xs font-semibold text-text-muted backdrop-blur">{label}</h2>
                {items.map((notification) => {
                  const Icon = iconFor(notification);
                  return (
                    <button type="button" key={notification.id} onClick={() => selectNotification(notification)} aria-busy={readingIds.has(notification.id)} className={`flex min-h-20 w-full items-start gap-3 border-b border-card-border px-4 py-4 text-left transition-[transform,opacity,background-color] duration-150 hover:bg-foreground/[0.03] active:scale-[0.99] ${readingIds.has(notification.id) ? 'opacity-70' : ''} ${selectedId === notification.id ? 'bg-emerald-500/[0.06]' : ''}`}>
                      <span className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg ${notification.type === 'warning' ? 'bg-amber-500/10 text-amber-500' : notification.type === 'error' ? 'bg-rose-500/10 text-rose-500' : notification.type === 'success' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-indigo-500/10 text-indigo-500'}`}>
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-start justify-between gap-2">
                          <span className={`truncate text-sm ${notification.is_read ? 'font-medium text-text-secondary' : 'font-semibold text-foreground'}`}>{notification.title}</span>
                          {!notification.is_read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-emerald-500" aria-label="Unread" />}
                        </span>
                        <span className="mt-1 line-clamp-2 text-xs leading-relaxed text-text-muted">{notification.message}</span>
                        <span className="mt-2 block text-xs text-text-muted">{formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}</span>
                      </span>
                    </button>
                  );
                })}
              </section>
            )) : (
              <div className="flex min-h-80 flex-col items-center justify-center px-6 text-center">
                <span className="grid h-14 w-14 place-items-center rounded-xl bg-emerald-500/10 text-emerald-500"><FiInbox className="h-6 w-6" /></span>
                <h2 className="mt-4 text-base font-semibold text-foreground">You’re all caught up</h2>
                <p className="mt-1 max-w-xs text-sm text-text-muted">There are no notifications matching this view.</p>
              </div>
            )}
          </div>
        </div>

        <div className={`${selected ? 'flex' : 'hidden md:flex'} min-w-0 flex-col`}>
          {selected ? (
            <>
              <div className="flex items-center justify-between border-b border-card-border p-4 sm:p-5">
                <button type="button" onClick={() => setSelectedId(null)} className="grid h-11 w-11 place-items-center rounded-md text-text-muted hover:bg-foreground/[0.05] hover:text-foreground md:hidden" aria-label="Back to notifications"><FiChevronLeft className="h-5 w-5" /></button>
                <span className="text-xs font-medium text-text-muted">{format(new Date(selected.created_at), 'MMM d, yyyy · h:mm a')}</span>
              </div>
              <article className="flex flex-1 flex-col p-5 sm:p-8">
                <div className="max-w-2xl">
                  <span className="text-xs font-semibold capitalize text-emerald-500">{categoryFor(selected).replace('_', ' ')}</span>
                  <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{selected.title}</h2>
                  <p className="mt-4 text-base leading-7 text-text-secondary">{selected.message}</p>
                  <div className="mt-6 flex items-center gap-3 rounded-xl border border-card-border bg-foreground/[0.02] p-4">
                    <span className="grid h-10 w-10 place-items-center rounded-full bg-emerald-500/10 text-sm font-semibold text-emerald-500">{(selectedSender?.fullName || selectedSender?.name || 'MyndDesk').charAt(0).toUpperCase()}</span>
                    <div>
                      <p className="text-sm font-medium text-foreground">{selectedSender?.fullName || selectedSender?.name || 'MyndDesk'}</p>
                      <p className="text-xs text-text-muted">{selectedSender?.email || 'Workspace update'}</p>
                    </div>
                  </div>
                </div>
                {destinationFor(selected, params.orgSlug) && (
                  <div className="mt-auto pt-8">
                    <button type="button" onClick={() => openResource(selected)} className="inline-flex min-h-11 items-center gap-2 rounded-md bg-emerald-500 px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 active:scale-[0.98]">
                      View related item <FiChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </article>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
              <span className="grid h-16 w-16 place-items-center rounded-2xl bg-foreground/[0.04] text-text-muted"><FiBell className="h-7 w-7" /></span>
              <h2 className="mt-5 text-lg font-semibold text-foreground">Select a notification</h2>
              <p className="mt-1 max-w-sm text-sm text-text-muted">Choose an update to see its details and open the related work.</p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
