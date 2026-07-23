"use client";

/* eslint-disable react-hooks/immutability */
import { useState, useEffect, useRef } from "react";
import ChatBubble from "@/components/ui/assistant/ChatBubble";
import ChatInput from "@/components/ui/assistant/ChatInput";
import PipMascot from "@/components/ui/assistant/pip-mascot";
import { motion, AnimatePresence } from "framer-motion";
import { FiMessageSquare, FiList, FiTrendingUp, FiCpu, FiCalendar, FiClock } from "react-icons/fi";
import { useDashboard } from "@/components/ui/dashboard-layout";

const PIP_VARIANTS = ['classic', 'smart', 'sleepy', 'cool', 'shocked', 'spicy', 'lovely', 'cyber'] as const;

interface Message {
  id?: number;
  text: string;
  isUser: boolean;
}

export default function AssistantPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showReportThinking, setShowReportThinking] = useState(false);
  const [reportReady, setReportReady] = useState(false);
  const [pipVariantIdx, setPipVariantIdx] = useState(0);
  const abortRef = useRef<AbortController | null>(null);
  const { setHideContentScroll } = useDashboard();

  const containerRef = useRef<HTMLDivElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setHideContentScroll(true);
    return () => setHideContentScroll(false);
  }, [setHideContentScroll]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('md_assistant_chat_messages');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
        }
        localStorage.removeItem('md_assistant_chat_messages');
      }
    } catch {}
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setPipVariantIdx(prev => (prev + 1) % PIP_VARIANTS.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading, showReportThinking]);

  const handleStop = () => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setIsLoading(false);
    setShowReportThinking(false);
  };

  const handleSendMessage = async (text: string) => {
    const isReport = /monthly report|monthly summary|end-of-month|generate.*report/i.test(text);
    setReportReady(false);
    setHasError(false);
    setErrorMessage("");

    const newUserMessage: Message = { text, isUser: true, id: Date.now() };
    setMessages((prev) => [...prev, newUserMessage]);
    setIsLoading(true);
    if (isReport) setShowReportThinking(true);

    const aiMessageId = Date.now() + 1;
    setMessages((prev) => [...prev, { text: "", isUser: false, id: aiMessageId }]);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const bodyText = await response.text();
        let errorMsg = "Failed to fetch response";
        try {
          const errData = JSON.parse(bodyText);
          errorMsg = errData.error || errorMsg;
        } catch {
          errorMsg = bodyText || errorMsg;
        }
        throw new Error(errorMsg);
      }

      if (!response.body) return;

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let accumulatedText = "";
      let reportMarkerFound = false;

      while (!done) {
        if (controller.signal.aborted) {
          reader.cancel();
          break;
        }
        const { value, done: doneReading } = await reader.read();
        const chunk = decoder.decode(value, { stream: !done });
        let nextText = accumulatedText + chunk;

        if (isReport && !reportMarkerFound && nextText.includes("__REPORT__")) {
          reportMarkerFound = true;
          setShowReportThinking(false);
          setReportReady(true);
          const markerIdx = nextText.indexOf("__REPORT__");
          nextText = nextText.slice(markerIdx + "__REPORT__".length);
        }
        accumulatedText = nextText;

        setMessages((prev) =>
          prev.map((msg) => (msg.id === aiMessageId ? { ...msg, text: accumulatedText } : msg))
        );
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return;
      const errString = error instanceof Error ? error.message : "Unknown error";
      setHasError(true);
      setErrorMessage(errString);
      setMessages((prev) => [
        ...prev,
        { text: `Sorry, I encountered an error: ${errString}`, isUser: false, id: Date.now() + 2 },
      ]);
      setShowReportThinking(false);
    } finally {
      setIsLoading(false);
      setShowReportThinking(false);
      abortRef.current = null;
    }
  };

  const quickActions = [
    { icon: FiList, title: "Show my tasks", desc: "View pending and active tasks", action: "Show me my pending tasks" },
    { icon: FiTrendingUp, title: "Productivity stats", desc: "Get an overview of your progress", action: "Show my productivity stats" },
    { icon: FiMessageSquare, title: "Summarize notes", desc: "Condense your recent thoughts", action: "Summarize my recent notes" },
    { icon: FiCalendar, title: "Monthly report", desc: "Generate a full monthly summary", action: "Generate my monthly report" },
  ];

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-background">
      {/* ── Header — Fixed at the top ── */}
      <div className="z-20 flex-shrink-0 px-6 py-4 bg-background/80 backdrop-blur-md border-b border-card-border flex items-center justify-between">
        <div className="flex items-center gap-3">
            <motion.div
              key={hasError ? 'error' : pipVariantIdx}
              initial={{ opacity: 0, scale: 0.8, rotate: -10 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ duration: 0.3 }}
            >
              <PipMascot
                variant={hasError ? 'sleepy' : PIP_VARIANTS[pipVariantIdx]}
                status={isLoading ? 'thinking' : hasError ? 'error' : 'idle'}
                size="sm"
                errorMessage={hasError ? errorMessage : undefined}
              />
            </motion.div>
          <div>
            <h1 className="text-lg font-bold text-foreground leading-none">Pip AI</h1>
            <p className="text-[10px] text-text-muted uppercase tracking-widest font-bold mt-1">Intelligent Copilot</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {hasError ? (
            <div className="px-2 py-1 rounded-full bg-red-500/10 border border-red-500/20 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
              <span className="text-[10px] font-bold text-red-500 uppercase tracking-wider">Error</span>
            </div>
          ) : isLoading ? (
            <div className="px-2 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
              <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">Thinking</span>
            </div>
          ) : (
            <div className="px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">Ready</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain scrollbar-hide relative" ref={containerRef}>
        <div className="min-h-full px-4 pt-6 pb-4 md:pb-36 flex flex-col justify-end">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center space-y-6 py-10 max-w-5xl mx-auto">
                <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", bounce: 0.5 }}
                >
                  <PipMascot variant="smart" status="idle" size="lg" />
                </motion.div>

                <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}>
                <h1 className="text-2xl md:text-4xl font-bold text-foreground mb-2 tracking-tight">Hey, what can I help with?</h1>
                <p className="text-text-muted text-sm md:text-lg max-w-lg mx-auto font-medium">
                    Ask me anything — tasks, notes, reports, or just chat.
                </p>
                </motion.div>

                {/* Quick action cards */}
                <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="grid grid-cols-1 md:grid-cols-4 gap-3 max-w-4xl mx-auto w-full mt-4"
                >
                {quickActions.map((item, idx) => (
                    <button
                    key={idx}
                    onClick={() => handleSendMessage(item.action)}
                    className="flex flex-col items-start p-5 bg-card border border-card-border rounded-2xl shadow-sm hover:bg-foreground/[0.03] hover:border-indigo-500/30 transition-all active:scale-[0.98] text-left group"
                    >
                    <div className="p-2.5 bg-foreground/[0.04] border border-card-border text-text-muted group-hover:text-indigo-400 group-hover:border-indigo-500/30 rounded-xl mb-3 transition-colors">
                        <item.icon className="w-5 h-5" />
                    </div>
                    <h3 className="text-sm font-bold text-foreground mb-1 uppercase tracking-wider">{item.title}</h3>
                    <p className="text-xs text-text-muted">{item.desc}</p>
                    </button>
                ))}
                </motion.div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto w-full space-y-4">
                {showReportThinking && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="flex items-start gap-4 px-5 py-5 rounded-3xl bg-card/80 backdrop-blur-xl border border-card-border/60 max-w-2xl"
                  >
                    <div className="relative w-10 h-10 flex-shrink-0 flex items-center justify-center">
                      <motion.div
                        animate={{ scale: [1, 1.4, 1], opacity: [0.3, 0.6, 0.3] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute inset-0 rounded-full bg-indigo-500 blur-lg"
                      />
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                      >
                        <FiClock className="w-5 h-5 text-indigo-400 relative z-10" />
                      </motion.div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-foreground">Generating your monthly report</p>
                      <p className="text-xs text-text-muted font-medium">
                        Analyzing tasks, projects, attendance, and more...
                      </p>
                    </div>
                  </motion.div>
                )}
                <AnimatePresence initial={false}>
                {messages.map((msg) => (
                    <ChatBubble key={msg.id} message={{ text: msg.text, isUser: msg.isUser, id: msg.id }} />
                ))}
                </AnimatePresence>
                <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* ── Input bar (sticky at bottom) ── */}
        <div className="sticky bottom-0 z-10 pt-8 bg-gradient-to-t from-background via-background/95 to-transparent">
            <div className="max-w-4xl mx-auto w-full px-4">
                <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} onStop={handleStop} />
            </div>
        </div>
      </div>

      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
