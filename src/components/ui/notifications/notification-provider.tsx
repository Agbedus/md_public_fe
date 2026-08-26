'use client';

import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { toast } from '@/lib/toast';
import { applyRealtimeUpdate, REALTIME_LABELS } from '@/lib/realtime';
import useSWR, { useSWRConfig } from 'swr';
import { FiCheckCircle, FiInfo, FiAlertCircle, FiBell, FiX } from 'react-icons/fi';
import { 
  getNotifications, 
  markNotificationAsRead as apiMarkAsRead, 
  markAllNotificationsAsRead as apiMarkAllAsRead 
} from '@/app/lib/notification-actions';
import { getUsersSafe } from '@/app/(dashboard)/[orgSlug]/users/actions';
import { playNotificationSound, getSoundEffectsEnabled } from '@/lib/notification-sounds';
import { emit } from '@/lib/event-bus';
import { isRecentAction } from '@/lib/recent-actions';
import Image from 'next/image';
import { workspaceCacheKey } from '@/lib/workspace-cache';

export interface Notification {
  id: string;
  recipient_id: string;
  sender_id: string | null;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  resource_type?: 'task' | 'note' | 'project' | 'system' | 'attendance' | 'invitation' | 'time_off' | 'event' | 'announcement' | 'user' | null;
  resource_id?: string | null;
  organization_id?: string | null;
  is_read: boolean;
  created_at: string;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  readingIds: ReadonlySet<string>;
  isMarkingAllRead: boolean;
  isConnected: boolean;
  user?: any;
  users: any[];
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider: React.FC<{
  children: React.ReactNode;
  user?: any;
  workspaceScope?: string | null;
  workspaceId?: string | null;
  apiBaseUrl: string;
}> = ({ children, user, workspaceScope, workspaceId, apiBaseUrl }) => {
  const { mutate } = useSWRConfig();
  const [isConnected, setIsConnected] = useState(false);
  const [readingIds, setReadingIds] = useState<Set<string>>(new Set());
  const [isMarkingAllRead, setIsMarkingAllRead] = useState(false);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>(null);
  const reconnectAttemptsRef = useRef(0);
  const socketRef = useRef<WebSocket>(null);
  const shownToastIdsRef = useRef<Set<string>>(new Set());
  const toastQueueRef = useRef<Array<() => void>>([]);
  const processingToastRef = useRef(false);
  const DATA_UPDATE_DEBOUNCE_MS = 2000;
  const dataUpdateTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  
  // SWR for Users
  const { data: users = [] } = useSWR(
    user?.accessToken ? workspaceCacheKey('users', workspaceScope) : null,
    () => getUsersSafe()
  );

  // SWR for Notifications
  const { data: notifications = [], mutate: mutateNotifications } = useSWR<Notification[]>(
    user?.accessToken ? workspaceCacheKey('notifications', workspaceScope) : null,
    () => getNotifications()
  );

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const markAsRead = useCallback(async (id: string) => {
    if (!user?.accessToken) return;

    const previousReadState = notifications.find((notification) => notification.id === id)?.is_read ?? false;
    setReadingIds((current) => new Set(current).add(id));

    await mutateNotifications(
        (currentNotifications = []) => currentNotifications.map(n => n.id === id ? { ...n, is_read: true } : n),
        false
    );

    try {
      const res = await apiMarkAsRead(id);
      if (!res.success) throw new Error('Failed to mark read');
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      await mutateNotifications(
        (currentNotifications = []) => currentNotifications.map((notification) => (
          notification.id === id ? { ...notification, is_read: previousReadState } : notification
        )),
        false,
      );
      toast.error('Could not mark that notification as read.');
    } finally {
      setReadingIds((current) => {
        const next = new Set(current);
        next.delete(id);
        return next;
      });
    }
  }, [user?.accessToken, notifications, mutateNotifications]);

  const markAllAsRead = useCallback(async () => {
    if (!user?.accessToken || isMarkingAllRead) return;

    const previousReadStates = new Map(notifications.map((notification) => [notification.id, notification.is_read]));
    setIsMarkingAllRead(true);

    await mutateNotifications(
        (currentNotifications = []) => currentNotifications.map(n => ({ ...n, is_read: true })),
        false
    );

    try {
      const res = await apiMarkAllAsRead();
      if (!res.success) throw new Error('Failed to mark all read');
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
      await mutateNotifications(
        (currentNotifications = []) => currentNotifications.map((notification) => (
          previousReadStates.has(notification.id)
            ? { ...notification, is_read: previousReadStates.get(notification.id) ?? false }
            : notification
        )),
        false,
      );
      toast.error('Could not mark all notifications as read.');
    } finally {
      setIsMarkingAllRead(false);
    }
  }, [user?.accessToken, isMarkingAllRead, notifications, mutateNotifications]);

  const isToastShown = useCallback((key: string): boolean => {
    if (shownToastIdsRef.current.has(key)) return true;
    shownToastIdsRef.current.add(key);
    setTimeout(() => {
      shownToastIdsRef.current.delete(key);
    }, 5000);
    return false;
  }, []);

  const processToastQueueRef = useRef<() => void>(() => {});

  const processToastQueue = useCallback(() => {
    if (processingToastRef.current || toastQueueRef.current.length === 0) return;
    processingToastRef.current = true;
    const next = toastQueueRef.current.shift();
    if (next) {
      next();
      setTimeout(() => {
        processingToastRef.current = false;
        processToastQueueRef.current();
      }, 600);
    } else {
      processingToastRef.current = false;
    }
  }, []);

  useEffect(() => {
    processToastQueueRef.current = processToastQueue;
  }, [processToastQueue]);

  const enqueueToast = useCallback((fn: () => void) => {
    toastQueueRef.current.push(fn);
    if (!processingToastRef.current) {
      processToastQueue();
    }
  }, [processToastQueue]);

  const showNotificationToast = useCallback((notification: Notification) => {
    const dedupKey = `notif_${notification.id}`;
    if (isToastShown(dedupKey)) return;

    const sender = notification.sender_id
      ? users.find((u: any) => u.id === notification.sender_id)
      : null;

    enqueueToast(() => {
      let icon = <FiInfo size={22} className="text-blue-400" />;
      if (notification.type === 'success') icon = <FiCheckCircle size={22} className="text-emerald-400" />;
      if (notification.type === 'error') icon = <FiAlertCircle size={22} className="text-rose-400" />;
      if (notification.type === 'warning') icon = <FiAlertCircle size={22} className="text-amber-400" />;

      if (sender?.image) {
        if (getSoundEffectsEnabled(user)) {
          playNotificationSound(notification.type);
        }
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
              <Image
                src={sender.image}
                alt=""
                width={36}
                height={36}
                unoptimized
                className="w-9 h-9 rounded-lg object-cover flex-shrink-0 border border-card-border"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-foreground leading-tight">{notification.title}</p>
                {notification.message && (
                  <p className="text-xs text-text-muted mt-1 line-clamp-2 leading-relaxed">{notification.message}</p>
                )}
              </div>
            </div>
          ),
          { duration: 4000 }
        );
      } else {
        toast(notification.title, {
          icon,
          duration: 4000,
        });
      }
    });
  }, [user, users, isToastShown, enqueueToast]);

  useEffect(() => {
    if (!user?.id || !user?.accessToken) {
      queueMicrotask(() => setIsConnected(false));
      return;
    }

    const connect = () => {
      if (socketRef.current?.readyState === WebSocket.OPEN) return;

      // The socket is authenticated server-side. Browsers cannot set headers on
      // a WebSocket handshake, so the token travels as a query parameter; the
      // backend rejects a token that does not match the user in the path.
      // `organization_id` tells the server which tenant this tab is watching so
      // org-scoped pushes skip sockets open on a different org.
      const backendUrl = new URL(apiBaseUrl);
      backendUrl.protocol = backendUrl.protocol === 'https:' ? 'wss:' : 'ws:';
      backendUrl.pathname = backendUrl.pathname
        .replace(/\/api\/v1\/?$/, '')
        .replace(/\/+$/, '');
      backendUrl.search = '';
      backendUrl.hash = '';
      const params = new URLSearchParams({ token: user.accessToken });
      const activeWorkspaceId = workspaceId || user.currentOrganizationId;
      if (activeWorkspaceId) {
        params.set('organization_id', activeWorkspaceId);
      }
      const wsUrl = `${backendUrl.toString().replace(/\/$/, '')}/api/v1/notifications/ws/${encodeURIComponent(user.id)}?${params.toString()}`;

      const socket = new WebSocket(wsUrl);
      socketRef.current = socket;

      socket.onopen = () => {
        console.debug('Notification WebSocket connected');
        setIsConnected(true);
        reconnectAttemptsRef.current = 0;
      };

      socket.onmessage = (event: MessageEvent) => {
        try {
          const message = JSON.parse(event.data);
          
          // 1. Handle Data Updates (Real-time sync)
          if (message.realtime_type === 'DATA_UPDATE') {
            const { resource, action, data } = message;

            // Apply to the SWR cache. This used to derive the cache key as
            // `resource + 's'`, which silently missed calendar events (cached
            // under 'calendar-events') and every resource added since.
            void applyRealtimeUpdate(resource, action, data, workspaceScope);

            // Toast + event emit, deduped so your own action does not announce
            // itself back to you.
            const label = data?.name || data?.title || data?.company_name || 'Untitled';
            const verb =
              action === 'created' ? 'New' : action === 'deleted' ? 'Deleted' : 'Updated';

            if (!isRecentAction(resource, action)) {
              const dedupKey = `data_update_${resource}_${action}_${data?.id ?? label}`;
              if (!isToastShown(dedupKey)) {
                enqueueToast(() => {
                  toast(`${verb} ${REALTIME_LABELS[resource] ?? resource}: ${label}`, {
                    icon:
                      action === 'created' ? (
                        <FiCheckCircle className="text-emerald-400" />
                      ) : action === 'deleted' ? (
                        <FiAlertCircle className="text-amber-400" />
                      ) : (
                        <FiInfo className="text-blue-400" />
                      ),
                    duration: 3000,
                  });
                });
              }
            }

            emit(`${resource}:${action}`, data);
            return;
          }

          // 2. Handle Announcements (realtime push from broadcast_announcement)
          if (message.realtime_type === 'ANNOUNCEMENT') {
            mutate((key: unknown) => (
              Array.isArray(key)
              && key[0] === 'announcements'
              && key[1] === workspaceScope
            ));
            emit('announcement:created', message);
            return;
          }

          // 3. Handle Notifications
          const notification: Notification = message;
          mutateNotifications((currentNotifications = []) => [notification, ...currentNotifications], false);

          showNotificationToast(notification);
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err);
        }
      };

      socket.onclose = (event) => {
        setIsConnected(false);
        socketRef.current = null;
        if (event.code === 1008) {
          console.warn('Notification WebSocket authentication was rejected. Reconnect will wait for a refreshed session.');
          return;
        }
        // Reconnect logic. The backoff is jittered because every client that
        // drops at the same moment — a restart, or the server shedding load —
        // otherwise retries on an identical doubling schedule and arrives back
        // as a synchronised wave, which is what turns a brief outage into a
        // sustained reconnect storm.
        const ceiling = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
        const timeout = ceiling / 2 + Math.random() * (ceiling / 2);
        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectAttemptsRef.current += 1;
          connect();
        }, timeout);
      };

      socket.onerror = (err) => {
        console.warn('Notification WebSocket error - check server connection');
        socket.close();
      };
    };

    connect();

    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (socketRef.current) {
        socketRef.current.onclose = null; // Prevent reconnect on explicit cleanup
        socketRef.current.close();
      }
    };
  }, [
    user?.id,
    user?.accessToken,
    user?.currentOrganizationId,
    workspaceId,
    apiBaseUrl,
    mutate,
    mutateNotifications,
    enqueueToast,
    isToastShown,
    showNotificationToast,
    workspaceScope,
  ]);

  const contextValue = React.useMemo(() => ({ 
    notifications, 
    unreadCount, 
    markAsRead, 
    markAllAsRead, 
    readingIds,
    isMarkingAllRead,
    isConnected, 
    user, 
    users 
  }), [
    notifications, 
    unreadCount, 
    markAsRead,
    markAllAsRead,
    readingIds,
    isMarkingAllRead,
    isConnected, 
    user, 
    users
  ]);

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
    </NotificationContext.Provider>
  );
};
