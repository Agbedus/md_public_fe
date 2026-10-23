'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { FiMaximize2, FiChevronDown, FiWifi, FiWifiOff } from 'react-icons/fi';
import { useRouter, usePathname } from 'next/navigation';
import ChatBubble from './ChatBubble';
import ChatInput from './ChatInput';
import { AssistantSuggestions } from './assistant-suggestions';
import PipMascot from './pip-mascot';
import { useOrgPath } from '@/hooks/use-org-slug';
import { usePipMemory } from '@/hooks/use-pip-memory';
import { useDashboard } from '@/components/ui/dashboard-layout';
import { readPipStream } from '@/lib/pip-stream';

interface Message {
  id?: number | string;
  text: string;
  isUser: boolean;
  isReport?: boolean;
}

const PIP_VARIANTS = ['classic', 'smart', 'sleepy', 'cool', 'shocked', 'spicy', 'lovely', 'cyber'] as const;

// How long the collapsed bubble stays out before tucking away.
const BUBBLE_AWAKE_MS = 12000;

const GREETINGS = [
  "Hey! I'm Pip — ask me anything",
  "Need help with tasks, notes, or projects?",
  "I can generate reports, summarize, and more",
  "What are you working on today?",
];

export default function AssistantOrb() {
  const [isFocused, setIsFocused] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const { userKey } = useDashboard();
  const { messages: memory, remember, toApiHistory } = usePipMemory(userKey);
  const [hasHydratedMemory, setHasHydratedMemory] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const reduceMotion = useReducedMotion();
  const [draft, setDraft] = useState('');
  const followOutput = useRef(true);
  const mobileBottomRef = useRef<HTMLDivElement>(null);
  const mobilePanelRef = useRef<HTMLDivElement>(null);
  const [greetingIdx, setGreetingIdx] = useState(0);
  const [typedText, setTypedText] = useState('');
  const [typingDone, setTypingDone] = useState(false);
  const [pipVariantIdx, setPipVariantIdx] = useState(0);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [showRecovery, setShowRecovery] = useState(false);
  const router = useRouter();
  const orgPath = useOrgPath();
  const pathname = usePathname();
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const typingRef = useRef<NodeJS.Timeout | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const wasOfflineRef = useRef(false);
  const recoveryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Route is org-scoped (`/[orgSlug]/assistant`), so match on the last path
  // segment rather than the full pathname.
  const isOnAssistantPage = pathname?.split('/').filter(Boolean).pop() === 'assistant';

  // One-time hydration from Pip's shared local memory (see use-pip-memory) —
  // picks the conversation back up (within its 6-hour window) instead of
  // starting blank every time the orb mounts. Guarded so it never clobbers
  // messages the user has already sent in this session.
  useEffect(() => {
    if (hasHydratedMemory || memory.length === 0) return;
    const frame = window.requestAnimationFrame(() => {
      setMessages(memory);
      setHasHydratedMemory(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [memory, hasHydratedMemory]);

  // The collapsed bubble sits over the page's bottom-right corner, so it only
  // talks for a short while: on arrival and when a new reply lands. After that
  // it tucks away until the mascot is hovered or focused. Connectivity notices
  // ignore this and always show.
  const [bubbleAwake, setBubbleAwake] = useState(true);
  const [bubbleHovered, setBubbleHovered] = useState(false);
  const lastAiTextForWake = [...messages].reverse().find(m => !m.isUser && m.text.trim())?.text;
  useEffect(() => {
    const wake = window.setTimeout(() => setBubbleAwake(true), 0);
    const sleep = window.setTimeout(() => setBubbleAwake(false), BUBBLE_AWAKE_MS);
    return () => {
      window.clearTimeout(wake);
      window.clearTimeout(sleep);
    };
  }, [lastAiTextForWake]);
  const bubbleVisible = bubbleAwake || bubbleHovered;

  useEffect(() => {
    if (isFocused || !bubbleVisible) return;
    const interval = setInterval(() => {
      setGreetingIdx(prev => (prev + 1) % GREETINGS.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [isFocused, bubbleVisible]);

  useEffect(() => {
    const greeting = GREETINGS[greetingIdx];
    let charIdx = 0;
    const frame = window.requestAnimationFrame(() => {
      setTypedText('');
      setTypingDone(false);
      if (reduceMotion) { setTypedText(greeting); setTypingDone(true); return; }

      if (typingRef.current) clearInterval(typingRef.current);
      typingRef.current = setInterval(() => {
        charIdx++;
        if (charIdx <= greeting.length) {
          setTypedText(greeting.slice(0, charIdx));
        } else {
          setTypingDone(true);
          if (typingRef.current) clearInterval(typingRef.current);
        }
      }, 35);
    });

    return () => {
      window.cancelAnimationFrame(frame);
      if (typingRef.current) clearInterval(typingRef.current);
    };
  }, [greetingIdx, reduceMotion]);

  useEffect(() => {
    const interval = setInterval(() => {
      setPipVariantIdx(prev => (prev + 1) % PIP_VARIANTS.length);
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!followOutput.current) return;
    for (const marker of [bottomRef.current, mobileBottomRef.current]) {
      if (marker?.offsetParent && marker.parentElement) marker.parentElement.scrollTop = marker.parentElement.scrollHeight;
    }
  }, [messages, isLoading, isFocused, isMobileOpen]);

  useEffect(() => {
    if (isMobileOpen) {
      setTimeout(() => inputRef.current?.focus(), 350);
    }
  }, [isMobileOpen]);

  useEffect(() => {
    if (!isFocused && !isMobileOpen) return;
    const keydown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      if (event.key === 'Escape') {
        setIsFocused(false);
        setIsMobileOpen(false);
      }
      if (event.key !== 'Tab' || !isMobileOpen || !mobilePanelRef.current?.contains(event.target as Node)) return;
      const controls = Array.from(mobilePanelRef.current.querySelectorAll<HTMLElement>('button:not(:disabled), input:not([type="hidden"]), textarea, a[href], [tabindex="0"]')).filter((node) => node.getClientRects().length > 0);
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', keydown);
    return () => document.removeEventListener('keydown', keydown);
  }, [isFocused, isMobileOpen]);

  // Internet connectivity: the collapsed chat bubble doubles as the offline
  // indicator. When the connection drops, the bubble turns red with a message;
  // when it returns, it briefly shows a restored message before going back to
  // normal. This replaces the old InternetStatus banner.
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setIsOnline(navigator.onLine));

    const handleOnline = () => {
      setIsOnline(true);
      if (wasOfflineRef.current) {
        setShowRecovery(true);
        if (recoveryTimeoutRef.current) clearTimeout(recoveryTimeoutRef.current);
        recoveryTimeoutRef.current = setTimeout(() => setShowRecovery(false), 3000);
      }
      wasOfflineRef.current = false;
    };

    const handleOffline = () => {
      setIsOnline(false);
      wasOfflineRef.current = true;
      setShowRecovery(false);
      if (recoveryTimeoutRef.current) clearTimeout(recoveryTimeoutRef.current);
      recoveryTimeoutRef.current = null;
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.cancelAnimationFrame(frame);
      if (recoveryTimeoutRef.current) clearTimeout(recoveryTimeoutRef.current);
    };
  }, []);

  const handleStop = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setIsLoading(false);
    setMessages((previous) => previous.filter((message) => message.isUser || message.text.trim()));
  }, []);

  const handleSendMessage = useCallback(async (text: string) => {
    if (abortRef.current || !text.trim()) return;
    followOutput.current = true;
    setHasHydratedMemory(true);
    const history = toApiHistory();
    const interactionId = crypto.randomUUID();
    const userMsg: Message = { text, isUser: true, id: `user-${interactionId}` };
    setMessages(prev => [...prev, userMsg]);
    remember(userMsg);
    setIsLoading(true);
    setHasError(false);

    const aiMsgId = `assistant-${interactionId}`;
    setMessages(prev => [...prev, { text: '', isUser: false, id: aiMsgId }]);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const bodyText = await response.text();
        let errorMsg = 'Failed to fetch response';
        try { const errData = JSON.parse(bodyText); errorMsg = typeof errData.error === 'string' ? errData.error : errData.error?.message || errorMsg; } catch { errorMsg = bodyText || errorMsg; }
        throw new Error(errorMsg);
      }

      const result = await readPipStream(response, controller.signal, (text, isReport) => {
        setMessages((previous) => previous.map((message) => message.id === aiMsgId ? { ...message, text, isReport } : message));
      });
      if (!controller.signal.aborted) remember({ id: aiMsgId, text: result.text, isUser: false, isReport: result.isReport });
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') return;
      const errString = error instanceof Error ? error.message : 'Unknown error';
      setHasError(true);
      setTimeout(() => setHasError(false), 5000);
      setMessages((previous) => previous.map((message) => message.id === aiMsgId ? { ...message, text: `I couldn’t complete that request. ${errString}` } : message));
    } finally {
      if (abortRef.current === controller) {
        setIsLoading(false);
        abortRef.current = null;
      }
    }
  }, [remember, toApiHistory]);

  const handleOpenFullPage = () => {
    // No handoff needed — the full page hydrates from the same shared
    // Pip memory (use-pip-memory) this component already writes to.
    router.push(orgPath('/assistant'));
  };

  const handleCloseChat = () => {
    setIsFocused(false);
    setIsMobileOpen(false);
  };

  const openChat = useCallback(() => {
    followOutput.current = true;
    setIsFocused(true);
    setTimeout(() => inputRef.current?.focus(), 150);
  }, []);

  // The collapsed orb shows a chat bubble: the latest AI reply once a
  // conversation exists, otherwise the rotating greeting. While offline it
  // doubles as the connectivity indicator.
  const hasMessages = messages.length > 0;
  const lastAiText = [...messages].reverse().find(m => !m.isUser && m.text.trim())?.text;
  const bubbleText = hasMessages ? (lastAiText ?? 'Pip is thinking…') : typedText;

  const offline = !isOnline;
  const recovered = !offline && showRecovery;
  const connectivityVariant = offline ? 'offline' : recovered ? 'recovery' : 'normal';
  const displayedBubbleText = offline
    ? 'No internet connection'
    : recovered
      ? 'Connection restored'
      : bubbleVisible
        ? bubbleText
        : '';
  const bubbleKey = offline ? 'offline' : recovered ? 'recovered' : hasMessages ? 'msg' : `greet-${greetingIdx}`;

  const bubbleVariantClasses =
    connectivityVariant === 'offline'
      ? 'bg-danger border-danger text-on-danger'
      : connectivityVariant === 'recovery'
        ? 'bg-ink border-ink text-on-ink'
        : 'bg-background/95 border-card-border text-foreground hover:border-accent/30';
  const bubbleTailBorder =
    offline ? 'border-l-danger' : recovered ? 'border-l-success' : 'border-l-card-border';
  const bubbleTailBg =
    offline ? 'border-l-danger' : recovered ? 'border-l-success' : 'border-l-background';

  const panelHeader = () => (
    <div className="flex shrink-0 items-center justify-between gap-3 border-b border-card-border px-4 py-3">
      <div className="flex min-w-0 items-center gap-2.5">
        <PipMascot variant={hasError ? 'sleepy' : PIP_VARIANTS[pipVariantIdx]} status={isLoading ? 'thinking' : hasError ? 'error' : 'idle'} size="sm" errorMessage={hasError ? 'Connection error' : undefined} />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">Pip</p>
          <p role="status" className="mt-0.5 flex items-center gap-1.5 text-xs text-text-muted">
            <span className={`h-1.5 w-1.5 rounded-full ${offline || hasError ? 'bg-danger' : isLoading ? 'bg-accent' : 'bg-success'}`} />
            {offline ? 'Offline' : hasError ? 'Try again' : isLoading ? 'Working on it…' : 'Your workspace assistant'}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <button type="button" onClick={handleOpenFullPage} aria-label="Open full assistant" data-tooltip="Open full assistant"
          className="grid h-10 w-10 place-items-center rounded-full text-text-muted transition-colors hover:bg-foreground/[0.05] hover:text-foreground active:scale-[0.96]"><FiMaximize2 className="h-4 w-4" /></button>
        <button type="button" onClick={handleCloseChat} aria-label="Minimize assistant" data-tooltip="Minimize"
          className="grid h-10 w-10 place-items-center rounded-full text-text-muted transition-colors hover:bg-foreground/[0.05] hover:text-foreground active:scale-[0.96]"><FiChevronDown className="h-4 w-4" /></button>
      </div>
    </div>
  );
  const emptyConversation = () => (
    <div className="flex flex-col gap-3 py-2">
      <div className="px-1">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">A hand with your day?</h2>
        <p className="mt-2 text-sm leading-relaxed text-text-muted">Tasks, notes, and a little more clarity.</p>
      </div>
      <AssistantSuggestions compact onSelect={handleSendMessage} disabled={isLoading || offline} />
    </div>
  );

  if (isOnAssistantPage) return null;

  return (
    <>
    {/* Desktop AI Assistant — floating orb that expands into a chat box */}
    <div className="hidden md:block fixed bottom-6 right-6 z-50" data-tour="assistant">
      {/* Dim the page behind the open chat box */}
      <AnimatePresence>
        {isFocused && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={handleCloseChat}
            className="fixed inset-0 bg-black/20 backdrop-blur-[2px] -z-10"
          />
        )}
      </AnimatePresence>

      <div className="flex flex-col items-end gap-3">
        {/* ── Expanded chat box ── */}
        <AnimatePresence>
          {isFocused && (
            <motion.div
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.98 }}
              transition={{ type: 'spring', damping: 26, stiffness: 320 }}
              style={{ transformOrigin: 'bottom right' }}
              role="dialog" aria-label="Pip assistant"
              className={`relative flex w-[min(28rem,calc(100vw_-_3rem))] flex-col overflow-hidden rounded-[28px] border border-card-border bg-card shadow-xl ${messages.length === 0 ? 'h-auto max-h-[calc(100dvh-7rem)]' : 'h-[min(32rem,calc(100dvh-7rem))]'}`}
            >
              {/* Header */}
              {panelHeader()}

              {/* Messages */}
              <div onScroll={(event) => { const node = event.currentTarget; followOutput.current = node.scrollHeight - node.scrollTop - node.clientHeight < 80; }}
                className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-3">
                {messages.length === 0 ? (
                  emptyConversation()
                ) : (
                  messages.map(msg => (
                    <ChatBubble key={msg.id} message={msg} compact activity={isLoading && msg.id === messages[messages.length - 1]?.id ? (msg.text ? "writing" : "thinking") : undefined} />
                  ))
                )}
                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <div className="shrink-0 border-t border-card-border bg-card p-3">
                <ChatInput compact value={draft} onValueChange={setDraft} inputRef={inputRef} onSendMessage={handleSendMessage} isLoading={isLoading} onStop={handleStop} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Collapsed: chat bubble + orb button ── */}
        <AnimatePresence>
          {!isFocused && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.25 }}
              className="flex justify-end"
            >
                {/* The bubble lives inside the same bobbing wrapper as the mascot, so it
                    reads as attached to it (talking right next to its face) rather than
                    a separate element floating nearby. It is vertically centred with the
                    mascot and has a fixed height so it never changes size as text loads. */}
                <motion.div
                  animate={reduceMotion ? undefined : { y: [0, -3, 0] }}
                  transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
                  className="relative"
                  onMouseEnter={() => setBubbleHovered(true)}
                  onMouseLeave={() => setBubbleHovered(false)}
                  onFocus={() => setBubbleHovered(true)}
                  onBlur={() => setBubbleHovered(false)}
                >
                  {/* Small tooltip-style bubble anchored beside the mascot. The `calc()`
                      here needs Tailwind's underscore-for-space syntax
                      (`calc(100%_+_6px)`); without it the browser drops the whole
                      `right` value as invalid CSS and the bubble falls back to
                      rendering flush over the mascot, blanking out its face. */}
                  <AnimatePresence mode="wait">
                    {displayedBubbleText && (
                      <motion.button
                        key={bubbleKey}
                        onClick={openChat}
                        initial={{ opacity: 0, scale: 0.85, x: 6 }}
                        animate={{ opacity: 1, scale: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.85, x: 6 }}
                        transition={{ type: 'spring', damping: 22, stiffness: 320 }}
                        style={{ transformOrigin: 'right center' }}
                        className={`absolute right-[calc(100%_+_12px)] top-1/2 -translate-y-1/2 w-max max-w-[13.5rem] h-11 flex items-center text-left px-3.5 rounded-xl border shadow-lg text-xs font-medium transition-colors ${bubbleVariantClasses}`}
                        data-tooltip="Open chat" aria-label="Open chat"
                      >
                        <span className="flex items-center gap-2 min-w-0">
                          {connectivityVariant !== 'normal' && (
                            connectivityVariant === 'offline'
                              ? <FiWifiOff className="w-4 h-4 shrink-0 text-white" />
                              : <FiWifi className="w-4 h-4 shrink-0 text-white" />
                          )}
                          <span className="line-clamp-2">
                            {displayedBubbleText}
                            {!hasMessages && !typingDone && connectivityVariant === 'normal' && <span className="animate-pulse">|</span>}
                          </span>
                        </span>
                        {/* Arrow pointing at Pip */}
                        <span className={`absolute top-1/2 -right-[9px] -translate-y-1/2 w-0 h-0 border-y-[9px] border-y-transparent border-l-[10px] ${bubbleTailBorder}`} />
                        <span className={`absolute top-1/2 -right-[7px] -translate-y-1/2 w-0 h-0 border-y-[8px] border-y-transparent border-l-[9px] ${bubbleTailBg}`} />
                      </motion.button>
                    )}
                  </AnimatePresence>

                  {/* Orb button — no card behind it, just the mascot with its own glow */}
                  <button
                    onClick={openChat}
                    className="relative shrink-0 flex items-center justify-center active:scale-95 hover:scale-105 transition-transform duration-200"
                    aria-label="Open AI Assistant"
                  >
                    {hasMessages && (
                      <span className="absolute top-1 right-1 w-3 h-3 rounded-full bg-accent border-2 border-background z-10" />
                    )}
                    <motion.div
                      key={pipVariantIdx}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.35 }}
                    >
                      <PipMascot variant={hasError ? 'sleepy' : PIP_VARIANTS[pipVariantIdx]} status={isLoading ? 'thinking' : hasError ? 'error' : 'idle'} size="md" errorMessage={hasError ? 'Connection error' : undefined} />
                    </motion.div>
                  </button>
                </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>

    {/* Mobile AI Assistant */}
    <div className="md:hidden">
      {/* Floating trigger button */}
      {!isMobileOpen && (
        <div className="fixed right-5 z-50" style={{ bottom: 'calc(4rem + 12px + env(safe-area-inset-bottom))' }}>
          <button
            onClick={() => { followOutput.current = true; setIsMobileOpen(true); }}
            className="flex items-center justify-center relative active:scale-95 transition-transform"
            aria-label="Open AI Assistant"
          >
            {messages.length > 0 && (
              <span className="absolute top-0 right-0 w-2.5 h-2.5 rounded-full bg-accent border-2 border-background z-10" />
            )}
            {(offline || recovered) && (
              <span
                className={`absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full border-2 border-background flex items-center justify-center z-10 ${offline ? 'bg-danger text-on-ink' : 'bg-ink text-on-ink'}`}
              >
                {offline ? <FiWifiOff className="w-3 h-3" /> : <FiWifi className="w-3 h-3" />}
              </span>
            )}
            {(offline || recovered) && (
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                className={`absolute -inset-1 rounded-full blur-md ${offline ? 'bg-danger/25' : 'bg-success/25'}`}
              />
            )}
            <PipMascot
              variant={offline ? 'sleepy' : recovered ? 'lovely' : PIP_VARIANTS[pipVariantIdx]}
              status={offline || hasError ? 'error' : isLoading ? 'thinking' : 'idle'}
              size="sm"
              errorMessage={hasError ? 'Connection error' : undefined}
            />
          </button>
        </div>
      )}

      {/* Expanded bottom sheet */}
      <AnimatePresence>
        {isMobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
              onClick={() => setIsMobileOpen(false)}
            />
            <motion.div
              initial={reduceMotion ? { opacity: 0 } : { y: '100%' }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? { opacity: 0 } : { y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              ref={mobilePanelRef}
              role="dialog" aria-modal="true" aria-label="Pip assistant"
              className={`fixed inset-x-2 bottom-2 z-50 flex flex-col overflow-hidden rounded-[28px] border border-card-border bg-card shadow-xl ${messages.length === 0 ? 'h-auto max-h-[calc(100dvh-1rem)]' : 'h-[min(34rem,calc(100dvh-1rem))]'}`}
            >
              {/* Header */}
              {panelHeader()}

              {/* Messages */}
              <div onScroll={(event) => { const node = event.currentTarget; followOutput.current = node.scrollHeight - node.scrollTop - node.clientHeight < 80; }}
                className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-3" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                {messages.length === 0 ? (
                  emptyConversation()
                ) : (
                  messages.map(msg => (
                    <ChatBubble key={msg.id} message={msg} compact activity={isLoading && msg.id === messages[messages.length - 1]?.id ? (msg.text ? "writing" : "thinking") : undefined} />
                  ))
                )}
                <div ref={mobileBottomRef} />
              </div>

              {/* Input */}
              <div className="shrink-0 border-t border-card-border bg-card p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                <ChatInput compact value={draft} onValueChange={setDraft} inputRef={inputRef} onSendMessage={handleSendMessage} isLoading={isLoading} onStop={handleStop} />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
    </>
  );
}
