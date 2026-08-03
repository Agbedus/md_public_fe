'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiSend, FiMaximize2, FiChevronDown, FiSquare, FiWifi, FiWifiOff } from 'react-icons/fi';
import { useRouter, usePathname } from 'next/navigation';
import ChatBubble from './ChatBubble';
import PipMascot from './pip-mascot';
import { useOrgPath } from '@/hooks/use-org-slug';

interface Message {
  id?: number;
  text: string;
  isUser: boolean;
}

const STORAGE_KEY = 'md_assistant_chat_messages';
const PIP_VARIANTS = ['classic', 'smart', 'sleepy', 'cool', 'shocked', 'spicy', 'lovely', 'cyber'] as const;

const GREETINGS = [
  "Hey! I'm Pip — ask me anything",
  "Need help with tasks, notes, or projects?",
  "I can generate reports, summarize, and more",
  "What are you working on today?",
];

export default function AssistantOrb() {
  const [isFocused, setIsFocused] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [input, setInput] = useState('');
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

  useEffect(() => {
    const interval = setInterval(() => {
      if (!isFocused) {
        setGreetingIdx(prev => (prev + 1) % GREETINGS.length);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [isFocused]);

  useEffect(() => {
    const greeting = GREETINGS[greetingIdx];
    let charIdx = 0;
    setTypedText('');
    setTypingDone(false);

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

    return () => {
      if (typingRef.current) clearInterval(typingRef.current);
    };
  }, [greetingIdx]);

  useEffect(() => {
    const interval = setInterval(() => {
      setPipVariantIdx(prev => (prev + 1) % PIP_VARIANTS.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  useEffect(() => {
    if (isMobileOpen) {
      setTimeout(() => inputRef.current?.focus(), 350);
    }
  }, [isMobileOpen]);

  // Internet connectivity: the collapsed chat bubble doubles as the offline
  // indicator. When the connection drops, the bubble turns red with a message;
  // when it returns, it briefly shows a restored message before going back to
  // normal. This replaces the old InternetStatus banner.
  useEffect(() => {
    setIsOnline(navigator.onLine);

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
      if (recoveryTimeoutRef.current) clearTimeout(recoveryTimeoutRef.current);
    };
  }, []);

  const handleStop = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setIsLoading(false);
  }, []);

  const handleSendMessage = useCallback(async (text: string) => {
    const userMsg: Message = { text, isUser: true, id: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);
    setHasError(false);

    const aiMsgId = Date.now() + 1;
    setMessages(prev => [...prev, { text: '', isUser: false, id: aiMsgId }]);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const bodyText = await response.text();
        let errorMsg = 'Failed to fetch response';
        try { const errData = JSON.parse(bodyText); errorMsg = errData.error || errorMsg; } catch { errorMsg = bodyText || errorMsg; }
        throw new Error(errorMsg);
      }

      if (!response.body) return;

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let accumulated = '';

      while (!done) {
        if (controller.signal.aborted) {
          reader.cancel();
          break;
        }
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        accumulated += decoder.decode(value, { stream: !done });
        setMessages(prev =>
          prev.map(msg => (msg.id === aiMsgId ? { ...msg, text: accumulated } : msg))
        );
      }
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') return;
      const errString = error instanceof Error ? error.message : 'Unknown error';
      setHasError(true);
      setTimeout(() => setHasError(false), 5000);
      setMessages(prev => [
        ...prev,
        { text: `Sorry, I encountered an error: ${errString}`, isUser: false, id: Date.now() + 2 },
      ]);
    } finally {
      setIsLoading(false);
      abortRef.current = null;
    }
  }, []);

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;
    handleSendMessage(text);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleOpenFullPage = () => {
    if (messages.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    }
    router.push(orgPath('/assistant'));
  };

  const handleCloseChat = () => {
    setIsFocused(false);
  };

  const openChat = useCallback(() => {
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
      : bubbleText;
  const bubbleKey = offline ? 'offline' : recovered ? 'recovered' : hasMessages ? 'msg' : `greet-${greetingIdx}`;

  const bubbleVariantClasses =
    connectivityVariant === 'offline'
      ? 'bg-red-500 border-red-500 text-white'
      : connectivityVariant === 'recovery'
        ? 'bg-emerald-500 border-emerald-500 text-white'
        : 'bg-background/95 border-card-border text-foreground hover:border-indigo-500/30';
  const bubbleTailBorder =
    offline ? 'border-l-red-500' : recovered ? 'border-l-emerald-500' : 'border-l-card-border';
  const bubbleTailBg =
    offline ? 'border-l-red-500' : recovered ? 'border-l-emerald-500' : 'border-l-background';

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
              initial={{ opacity: 0, y: 24, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.94 }}
              transition={{ type: 'spring', damping: 26, stiffness: 320 }}
              style={{ transformOrigin: 'bottom right' }}
              className="relative w-[min(28rem,calc(100vw_-_3rem))] max-h-[78vh] flex flex-col bg-background/95 backdrop-blur-2xl border border-card-border rounded-2xl shadow-2xl overflow-hidden"
            >
              {/* Header */}
              <div className="relative flex items-center justify-between px-5 py-4 border-b border-card-border shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="relative shrink-0">
                    <div className="absolute inset-0 bg-indigo-500/20 blur-lg rounded-full scale-125" />
                    <motion.div
                      key={pipVariantIdx}
                      initial={{ opacity: 0, scale: 0.6, rotate: -10 }}
                      animate={{ opacity: 1, scale: 1, rotate: 0 }}
                      transition={{ duration: 0.3 }}
                      className="relative"
                    >
                      <PipMascot variant={hasError ? 'sleepy' : PIP_VARIANTS[pipVariantIdx]} status={isLoading ? 'thinking' : hasError ? 'error' : 'idle'} size="sm" errorMessage={hasError ? 'Connection error' : undefined} />
                    </motion.div>
                  </div>
                  <span className="text-sm font-bold text-foreground">
                    {isLoading ? 'Pip is thinking...' : 'AI Assistant'}
                  </span>
                  {isLoading && (
                    <span className="flex gap-1 ml-1">
                      <span className="w-1 h-1 rounded-full bg-foreground/60 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1 h-1 rounded-full bg-foreground/60 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1 h-1 rounded-full bg-foreground/60 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={handleOpenFullPage}
                    className="p-2 rounded-xl text-text-muted hover:text-foreground hover:bg-foreground/[0.06] transition-all"
                    title="Open full screen"
                  >
                    <FiMaximize2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleCloseChat}
                    className="p-2 rounded-xl text-text-muted hover:text-foreground hover:bg-foreground/[0.06] transition-all"
                    title="Minimize"
                  >
                    <FiChevronDown className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 min-h-[10rem] overflow-y-auto px-4 py-4 space-y-3 scrollbar-hide">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full gap-3 py-6 text-center">
                    <PipMascot variant={PIP_VARIANTS[pipVariantIdx]} status="idle" size="md" />
                    <p className="text-sm text-text-muted max-w-[16rem] font-medium">
                      {typedText}
                      {!typingDone && <span className="animate-pulse">|</span>}
                    </p>
                  </div>
                ) : (
                  messages.map(msg => (
                    <ChatBubble key={msg.id} message={msg} />
                  ))
                )}
                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <div className="px-4 pb-4 pt-3 border-t border-card-border shrink-0">
                <div className="relative rounded-2xl bg-foreground/[0.045] border border-card-border focus-within:border-foreground/20 transition-colors overflow-hidden">
                  <div className="absolute inset-0 pointer-events-none z-0 shimmer-sweep" />
                  <div className="flex items-end gap-2 px-4 py-3.5 relative z-10">
                    <textarea
                      ref={inputRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Ask me anything..."
                      rows={1}
                      className="flex-1 bg-transparent text-[15px] text-foreground placeholder:text-text-muted resize-none focus:outline-none scrollbar-hide font-medium leading-relaxed"
                      style={{ minHeight: '30px', maxHeight: '140px' }}
                    />
                    {isLoading ? (
                      <button
                        onClick={handleStop}
                        className="group flex items-center justify-center p-1.5 rounded-xl bg-foreground/[0.03] hover:bg-foreground/[0.06] border border-card-border text-text-muted hover:text-foreground transition-all duration-200 shrink-0"
                        aria-label="Stop generating"
                        title="Stop generating"
                      >
                        <span className="p-1 rounded-lg bg-foreground/[0.03] group-hover:bg-foreground/[0.06] transition-colors">
                          <FiSquare className="w-4 h-4 text-rose-500 fill-current" />
                        </span>
                      </button>
                    ) : (
                      <button
                        onClick={handleSend}
                        disabled={!input.trim()}
                        className="group flex items-center justify-center p-1.5 rounded-xl bg-foreground/[0.03] hover:bg-foreground/[0.06] border border-card-border text-text-muted hover:text-foreground transition-all duration-200 active:scale-95 disabled:opacity-40 disabled:pointer-events-none shrink-0"
                        aria-label="Send"
                      >
                        <span className="p-1 rounded-lg bg-foreground/[0.03] group-hover:bg-foreground/[0.06] transition-colors">
                          <FiSend className="w-4 h-4" />
                        </span>
                      </button>
                    )}
                  </div>
                </div>
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
                  animate={{ y: [0, -6, 0] }}
                  transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
                  className="relative"
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
                        className={`absolute right-[80%] top-1/2 -translate-y-1/2 w-max max-w-[13.5rem] h-11 flex items-center text-left px-3.5 rounded-xl border shadow-lg text-xs font-medium transition-colors ${bubbleVariantClasses}`}
                        title="Open chat"
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
                      <span className="absolute top-1 right-1 w-3 h-3 rounded-full bg-indigo-500 border-2 border-background z-10" />
                    )}
                    <motion.div
                      key={pipVariantIdx}
                      initial={{ opacity: 0, scale: 0.6, rotate: -10 }}
                      animate={{ opacity: 1, scale: 1, rotate: 0 }}
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
        @keyframes shimmer-sweep {
          0% { transform: translateX(-100%); }
          25% { transform: translateX(100%); }
          100% { transform: translateX(100%); }
        }
        .shimmer-sweep {
          background: linear-gradient(90deg, transparent 0%, rgba(99, 102, 241, 0.08) 50%, transparent 100%);
          animation: shimmer-sweep 6s ease-in-out infinite;
        }
      `}</style>
    </div>

    {/* Mobile AI Assistant */}
    <div className="md:hidden">
      {/* Floating trigger button */}
      {!isMobileOpen && (
        <div className="fixed right-5 z-50" style={{ bottom: 'calc(4rem + 12px)' }}>
          <button
            onClick={() => setIsMobileOpen(true)}
            className="flex items-center justify-center relative active:scale-95 transition-transform"
            aria-label="Open AI Assistant"
          >
            {messages.length > 0 && (
              <span className="absolute top-0 right-0 w-2.5 h-2.5 rounded-full bg-indigo-500 border-2 border-background z-10" />
            )}
            {(offline || recovered) && (
              <span
                className={`absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full border-2 border-background flex items-center justify-center z-10 ${offline ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'}`}
              >
                {offline ? <FiWifiOff className="w-3 h-3" /> : <FiWifi className="w-3 h-3" />}
              </span>
            )}
            {(offline || recovered) && (
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                className={`absolute -inset-1 rounded-full blur-md ${offline ? 'bg-red-500/25' : 'bg-emerald-500/25'}`}
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
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed left-0 right-0 z-50 flex flex-col bg-background/95 backdrop-blur-xl border-t border-card-border rounded-t-2xl shadow-xl"
              style={{ bottom: '64px', maxHeight: '75vh' }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 shrink-0">
                <div className="flex items-center gap-2">
                  <motion.div
                    key={pipVariantIdx}
                    initial={{ opacity: 0, scale: 0.6, rotate: -10 }}
                    animate={{ opacity: 1, scale: 1, rotate: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <PipMascot variant={hasError ? 'sleepy' : PIP_VARIANTS[pipVariantIdx]} status={isLoading ? 'thinking' : hasError ? 'error' : 'idle'} size="sm" errorMessage={hasError ? 'Connection error' : undefined} />
                  </motion.div>
                  <span className="text-sm font-medium text-foreground">
                    {isLoading ? 'Pip is thinking...' : 'AI Assistant'}
                  </span>
                  {isLoading && (
                    <span className="flex gap-1 ml-1">
                      <span className="w-1 h-1 rounded-full bg-foreground/60 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1 h-1 rounded-full bg-foreground/60 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1 h-1 rounded-full bg-foreground/60 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={handleOpenFullPage}
                    className="p-2 rounded-xl text-text-muted hover:text-foreground hover:bg-foreground/[0.06] transition-all"
                    title="Open full screen"
                  >
                    <FiMaximize2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setIsMobileOpen(false)}
                    className="p-2 rounded-xl text-text-muted hover:text-foreground hover:bg-foreground/[0.06] transition-all"
                    title="Close"
                  >
                    <FiChevronDown className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 py-2 space-y-3 min-h-0" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                {messages.length === 0 ? (
                  <div className="flex items-center justify-center h-24">
                    <p className="text-sm text-text-muted">Ask Pip anything...</p>
                  </div>
                ) : (
                  messages.map(msg => (
                    <ChatBubble key={msg.id} message={msg} />
                  ))
                )}
                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <div className="px-4 py-3 shrink-0 border-t border-card-border">
                <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-foreground/[0.05] border border-card-border">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={isLoading ? 'Pip is responding...' : 'Ask me anything...'}
                    disabled={isLoading}
                    rows={1}
                    className="flex-1 bg-transparent text-sm text-foreground placeholder:text-text-muted resize-none focus:outline-none disabled:opacity-40"
                    style={{ minHeight: '20px', maxHeight: '80px' }}
                  />
                  {isLoading ? (
                    <button
                      onClick={handleStop}
                      className="group flex items-center gap-1.5 p-1.5 rounded-xl bg-foreground/[0.03] hover:bg-foreground/[0.06] border border-card-border text-text-muted hover:text-foreground transition-all duration-200 shrink-0 text-[10px] font-bold"
                      aria-label="Stop generating"
                    >
                      <span className="p-1 rounded-lg bg-foreground/[0.03] group-hover:bg-foreground/[0.06] transition-colors">
                        <FiSquare className="w-3 h-3 text-rose-500 fill-current" />
                      </span>
                      <span className="hidden sm:inline pr-0.5">Stop</span>
                    </button>
                  ) : (
                    <button
                      onClick={handleSend}
                      disabled={!input.trim()}
                      className="group flex items-center justify-center p-1.5 rounded-xl bg-foreground/[0.03] hover:bg-foreground/[0.06] border border-card-border text-text-muted hover:text-foreground transition-all duration-200 active:scale-95 disabled:opacity-40 disabled:pointer-events-none shrink-0"
                      aria-label="Send"
                    >
                        <span className="p-1 rounded-lg bg-foreground/[0.03] group-hover:bg-foreground/[0.06] transition-colors">
                          <FiSend className="w-3.5 h-3.5" />
                        </span>
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
    </>
  );
}
