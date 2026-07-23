'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiSend, FiMaximize2, FiChevronDown, FiX, FiSquare } from 'react-icons/fi';
import { useRouter, usePathname } from 'next/navigation';
import ChatBubble from './ChatBubble';
import PipMascot from './pip-mascot';

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
  const router = useRouter();
  const pathname = usePathname();
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const typingRef = useRef<NodeJS.Timeout | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const isOnAssistantPage = pathname === '/assistant';

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
    router.push('/assistant');
  };

  const handleCloseChat = () => {
    setIsFocused(false);
  };

  if (isOnAssistantPage) return null;

  return (
    <>
    {/* Desktop AI Assistant Bar */}
    <div className="hidden md:flex fixed bottom-0 left-0 right-0 z-50 justify-center">
      {/* Backdrop blur when focused with messages */}
      <AnimatePresence>
        {isFocused && messages.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm -z-10"
          />
        )}
      </AnimatePresence>

      <div
        className="w-full max-w-2xl mx-4 transition-all duration-500 ease-out"
      >
        <AnimatePresence>
          {isFocused && messages.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="overflow-hidden"
            >
              <div className="bg-background/95 backdrop-blur-xl border border-card-border rounded-t-2xl shadow-xl mx-4">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-card-border">
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
                        <span className="w-1 h-1 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-1 h-1 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-1 h-1 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '300ms' }} />
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
                      title="Close chat"
                    >
                      <FiX className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Messages */}
                <div className="max-h-[40vh] overflow-y-auto px-4 py-4 space-y-3 scrollbar-hide">
                  {messages.map(msg => (
                    <ChatBubble key={msg.id} message={msg} />
                  ))}
                  <div ref={bottomRef} />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="relative mx-4 mb-2">
          <div className="relative rounded-3xl bg-background border border-card-border overflow-hidden shadow-sm">
            <div className="absolute inset-0 pointer-events-none z-0 shimmer-sweep" />

            <div className="flex items-center gap-3 px-4 py-3 relative z-10">
              {/* Pip mascot with unread badge */}
              <div className="shrink-0 flex items-center justify-center w-8 h-8 relative">
                {!isFocused && messages.length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-indigo-500 border-2 border-background z-10" />
                )}
                <motion.div
                  key={pipVariantIdx}
                  initial={{ opacity: 0, scale: 0.6, rotate: -10 }}
                  animate={{ opacity: 1, scale: 1, rotate: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <PipMascot variant={hasError ? 'sleepy' : PIP_VARIANTS[pipVariantIdx]} status={isLoading ? 'thinking' : hasError ? 'error' : 'idle'} size="sm" errorMessage={hasError ? 'Connection error' : undefined} />
                </motion.div>
              </div>

              <div className="flex-1 min-w-0">
                {isFocused || input.length > 0 ? (
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onFocus={() => setIsFocused(true)}
                    placeholder="Ask me anything..."
                    rows={1}
                    className="w-full !bg-white dark:!bg-transparent text-base text-foreground placeholder:text-text-muted resize-none focus:outline-none focus:!bg-white dark:focus:!bg-transparent focus:!shadow-none scrollbar-hide font-medium"
                    style={{ minHeight: '22px', maxHeight: '120px' }}
                  />
                ) : (
                  <button
                    onClick={() => {
                      setIsFocused(true);
                      setTimeout(() => inputRef.current?.focus(), 100);
                    }}
                    className="w-full text-left"
                  >
                    <div className="relative h-6 overflow-hidden">
                      <p className="text-base text-text-muted font-medium">
                        {typedText}
                        {!typingDone && (
                          <span className="animate-pulse">|</span>
                        )}
                      </p>
                    </div>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {isLoading ? (
                  <button
                    onClick={handleStop}
                    className="p-2.5 bg-rose-500/10 text-rose-400 rounded-2xl hover:bg-rose-500/20 transition-all duration-200 flex items-center gap-1.5 text-xs font-bold"
                    aria-label="Stop generating"
                    title="Stop generating"
                  >
                    <FiSquare className="w-3.5 h-3.5 fill-current" />
                    <span className="hidden sm:inline">Stop</span>
                  </button>
                ) : (
                  <>
                    <button
                      onClick={handleOpenFullPage}
                      className="p-2 rounded-xl text-text-muted hover:text-foreground hover:bg-foreground/[0.06] transition-all hidden sm:block"
                      title="Open full screen"
                    >
                      <FiMaximize2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleSend}
                      disabled={!input.trim()}
                      className="p-2.5 bg-foreground/[0.08] text-foreground/80 rounded-2xl hover:bg-foreground/[0.14] hover:text-foreground transition-all duration-200 disabled:opacity-40 disabled:pointer-events-none"
                      aria-label="Send"
                    >
                      <FiSend className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
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
            className="flex items-center justify-center w-12 h-12 rounded-full bg-background/90 border border-card-border shadow-lg backdrop-blur-md hover:bg-background active:scale-95 transition-all relative"
            aria-label="Open AI Assistant"
          >
            {messages.length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-indigo-500 border-2 border-background z-10" />
            )}
            <PipMascot variant={PIP_VARIANTS[pipVariantIdx]} status={isLoading ? 'thinking' : hasError ? 'error' : 'idle'} size="sm" errorMessage={hasError ? 'Connection error' : undefined} />
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
                      <span className="w-1 h-1 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1 h-1 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1 h-1 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '300ms' }} />
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
                      className="p-2 bg-rose-500/10 text-rose-400 rounded-xl hover:bg-rose-500/20 transition-all duration-200 shrink-0 flex items-center gap-1 text-[10px] font-bold"
                      aria-label="Stop generating"
                    >
                      <FiSquare className="w-3 h-3 fill-current" />
                      <span className="hidden sm:inline">Stop</span>
                    </button>
                  ) : (
                    <button
                      onClick={handleSend}
                      disabled={!input.trim()}
                      className="p-2 bg-foreground/[0.08] text-foreground/80 rounded-xl hover:bg-foreground/[0.14] hover:text-foreground transition-all duration-200 disabled:opacity-40 disabled:pointer-events-none shrink-0"
                      aria-label="Send"
                    >
                      <FiSend className="w-3.5 h-3.5" />
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
