'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export interface PipMemoryMessage {
  id?: number | string;
  text: string;
  isUser: boolean;
  isReport?: boolean;
  /** Epoch ms this turn was added — used to prune the 6-hour window. */
  at: number;
}

const WINDOW_MS = 6 * 60 * 60 * 1000;
// Safety cap so a very long day of chatting doesn't grow the stored payload
// (or the history sent back to the model) unbounded even within the window.
const MAX_MESSAGES = 60;

function storageKey(userKey: string) {
  return `md_pip_memory_${userKey}`;
}

function prune(list: PipMemoryMessage[]): PipMemoryMessage[] {
  const cutoff = Date.now() - WINDOW_MS;
  return list.filter((m) => m.at >= cutoff).slice(-MAX_MESSAGES);
}

function stripPipMarkers(text: string): string {
  return text
    .replace(/__WIDGET__[\s\S]*?__WIDGET__/g, '[shown as an interactive card]')
    .replace(/__REPORT__/g, '')
    .trim();
}

/**
 * Pip's short-term conversation memory. Lives entirely in the browser's
 * localStorage — nothing here is ever sent to or stored on our own servers.
 * Entries roll off after 6 hours (or once the list gets long) so this never
 * becomes an unbounded transcript; it's meant to feel like "what we were
 * just talking about," not a permanent log.
 *
 * Shared by both the floating orb and the full-page assistant view (keyed by
 * the same `userKey`) so either surface picks up right where the other left
 * off, instead of each holding its own disconnected in-memory chat that
 * vanishes the moment you navigate away.
 */
export function usePipMemory(userKey?: string | null) {
  const [messages, setMessages] = useState<PipMemoryMessage[]>([]);
  const hydratedKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!userKey || hydratedKeyRef.current === userKey) return;
    hydratedKeyRef.current = userKey;
    try {
      const raw = localStorage.getItem(storageKey(userKey));
      const parsed: PipMemoryMessage[] = raw ? JSON.parse(raw) : [];
      const pruned = prune(Array.isArray(parsed) ? parsed : []);
      const timer = setTimeout(() => {
        setMessages(pruned);
        if (raw && pruned.length !== parsed.length) {
          localStorage.setItem(storageKey(userKey), JSON.stringify(pruned));
        }
      }, 0);
      return () => clearTimeout(timer);
    } catch {
      // Corrupt or inaccessible localStorage (private browsing, quota, etc.)
      // — just start with an empty memory rather than throwing.
    }
  }, [userKey]);

  const persist = useCallback((next: PipMemoryMessage[], key: string) => {
    try {
      localStorage.setItem(storageKey(key), JSON.stringify(next));
    } catch {
      // Best-effort — an over-quota or blocked localStorage shouldn't break chat.
    }
  }, []);

  /** Append one turn (user or assistant) to memory. */
  const remember = useCallback((message: Omit<PipMemoryMessage, 'at'> & { at?: number }) => {
    if (!userKey) return;
    setMessages((prev) => {
      const next = prune([...prev, { ...message, at: message.at ?? Date.now() }]);
      persist(next, userKey);
      return next;
    });
  }, [userKey, persist]);

  const forget = useCallback(() => {
    setMessages([]);
    if (userKey) {
      try { localStorage.removeItem(storageKey(userKey)); } catch {}
    }
  }, [userKey]);

  /** Recent turns as plain {role, content} history for the API request —
   *  widget/report payloads are collapsed to a short human-readable note
   *  rather than sent verbatim (large, and not useful context for the model). */
  const toApiHistory = useCallback((): Array<{ role: 'user' | 'assistant'; content: string }> => {
    return prune(messages)
      .map((m) => ({
        role: m.isUser ? ('user' as const) : ('assistant' as const),
        content: stripPipMarkers(m.text || '').slice(0, 2000),
      }))
      .filter((m) => m.content.trim().length > 0);
  }, [messages]);

  return { messages, remember, forget, toApiHistory };
}
