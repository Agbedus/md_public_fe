"use client";

import { useState, useEffect, useRef } from "react";
import ChatBubble from "@/components/ui/assistant/ChatBubble";
import ChatInput from "@/components/ui/assistant/ChatInput";
import PipMascot from "@/components/ui/assistant/pip-mascot";
import type { PipActivity } from "@/components/ui/assistant/pip-status-indicator";
import { motion, AnimatePresence } from "framer-motion";
import { FiMessageSquare, FiList, FiTrendingUp, FiCalendar } from "react-icons/fi";
import { useDashboard } from "@/components/ui/dashboard-layout";

const PIP_VARIANTS = ['classic', 'smart', 'sleepy', 'cool', 'shocked', 'spicy', 'lovely', 'cyber'] as const;

interface Message {
  id?: number | string;
  text: string;
  isUser: boolean;
  isReport?: boolean;
}

interface AssistantErrorPayload {
  message?: string;
}

const PIP_ERROR_MARKER = '__PIP_ERROR__';
const DEFAULT_PIP_ERROR = 'Pip couldn’t connect right now. Please try again in a moment.';

function cleanAssistantError(payload: unknown): string {
  if (!payload || typeof payload !== 'object') return DEFAULT_PIP_ERROR;
  const error = (payload as Record<string, unknown>).error;
  if (error && typeof error === 'object') {
    const message = (error as AssistantErrorPayload).message;
    if (typeof message === 'string' && message.trim()) return message;
  }
  return DEFAULT_PIP_ERROR;
}

export default function AssistantPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [pipActivity, setPipActivity] = useState<PipActivity>('ready');
  const [activeResponseId, setActiveResponseId] = useState<string | null>(null);
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
    const frame = window.requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ behavior: isLoading ? 'auto' : 'smooth', block: 'end' });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [messages, isLoading]);

  const handleStop = () => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setIsLoading(false);
    setPipActivity('ready');
    setActiveResponseId(null);
  };

  const handleSendMessage = async (text: string) => {
    localStorage.setItem('md_pip_used', 'true');
    const isReport = /monthly report|monthly summary|end-of-month|generate.*report/i.test(text);
    setHasError(false);
    setErrorMessage("");

    const interactionId = crypto.randomUUID();
    const newUserMessage: Message = { text, isUser: true, id: `user-${interactionId}` };
    setMessages((prev) => [...prev, newUserMessage]);
    setIsLoading(true);
    setPipActivity(isReport ? 'analyzing' : 'thinking');

    const aiMessageId = `assistant-${interactionId}`;
    setActiveResponseId(aiMessageId);
    setMessages((prev) => [...prev, { text: "", isUser: false, id: aiMessageId }]);

    const controller = new AbortController();
    abortRef.current = controller;
    let didFail = false;
    let hasStartedWriting = false;

    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => null);
        throw new Error(cleanAssistantError(errorPayload));
      }

      if (!response.body) return;

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = "";
      let reportMarkerFound = false;
      let protocolBuffer = '';

      const appendAssistantText = (textChunk: string) => {
        if (!textChunk) return;
        let nextText = accumulatedText + textChunk;

        if (!reportMarkerFound && nextText.includes("__REPORT__")) {
          reportMarkerFound = true;
          setPipActivity('writing');
          const markerIdx = nextText.indexOf("__REPORT__");
          nextText = nextText.slice(markerIdx + "__REPORT__".length);
          setMessages((prev) =>
            prev.map((msg) => (msg.id === aiMessageId ? { ...msg, isReport: true } : msg))
          );
        }
        accumulatedText = nextText;
        setMessages((prev) =>
          prev.map((msg) => (msg.id === aiMessageId ? { ...msg, text: accumulatedText } : msg))
        );
      };

      while (true) {
        if (controller.signal.aborted) {
          await reader.cancel();
          break;
        }
        const { value, done: doneReading } = await reader.read();
        if (doneReading) {
          decoder.decode();
          break;
        }
        const chunk = decoder.decode(value, { stream: true });
        if (chunk && !hasStartedWriting) {
          hasStartedWriting = true;
          setPipActivity('writing');
        }
        protocolBuffer += chunk;
        const errorStart = protocolBuffer.indexOf(PIP_ERROR_MARKER);
        if (errorStart >= 0) {
          appendAssistantText(protocolBuffer.slice(0, errorStart));
          protocolBuffer = protocolBuffer.slice(errorStart);
          const payloadStart = PIP_ERROR_MARKER.length;
          const errorEnd = protocolBuffer.indexOf(PIP_ERROR_MARKER, payloadStart);
          if (errorEnd < 0) continue;
          const payloadText = protocolBuffer.slice(payloadStart, errorEnd);
          const payload = JSON.parse(payloadText) as AssistantErrorPayload;
          throw new Error(typeof payload.message === 'string' && payload.message.trim() ? payload.message : DEFAULT_PIP_ERROR);
        }

        let retainedLength = 0;
        const maxPrefix = Math.min(PIP_ERROR_MARKER.length - 1, protocolBuffer.length);
        for (let length = maxPrefix; length > 0; length -= 1) {
          if (protocolBuffer.endsWith(PIP_ERROR_MARKER.slice(0, length))) {
            retainedLength = length;
            break;
          }
        }
        const safeLength = protocolBuffer.length - retainedLength;
        appendAssistantText(protocolBuffer.slice(0, safeLength));
        protocolBuffer = protocolBuffer.slice(safeLength);
      }
      if (protocolBuffer.startsWith(PIP_ERROR_MARKER)) throw new Error(DEFAULT_PIP_ERROR);
      appendAssistantText(protocolBuffer);
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return;
      const errString = error instanceof Error && error.message ? error.message : DEFAULT_PIP_ERROR;
      didFail = true;
      setHasError(true);
      setErrorMessage(errString);
      setPipActivity('error');
      setMessages((prev) => prev.map((msg) => (
        msg.id === aiMessageId
          ? { ...msg, text: `**I couldn’t complete that request.**\n\n${errString}\n\n*You can try sending it again.*` }
          : msg
      )));
    } finally {
      setIsLoading(false);
      if (!didFail) setPipActivity('ready');
      setActiveResponseId(null);
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
      <div className="z-20 flex-shrink-0 px-6 py-4 bg-background/80 backdrop-blur-md border-b border-card-border flex items-center">
        <div className="flex items-center gap-3">
            <motion.div
              key={hasError ? 'error' : pipVariantIdx}
              initial={{ opacity: 0, scale: 0.8, rotate: -10 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ duration: 0.3 }}
            >
              <PipMascot
                variant={hasError ? 'sleepy' : PIP_VARIANTS[pipVariantIdx]}
                status={pipActivity === 'thinking' || pipActivity === 'analyzing' ? 'thinking' : hasError ? 'error' : 'idle'}
                size="sm"
                errorMessage={hasError ? errorMessage : undefined}
              />
            </motion.div>
          <div>
            <h1 className="text-lg font-bold text-foreground leading-none">Pip AI</h1>
            <p className="text-[10px] text-text-muted uppercase tracking-widest font-bold mt-1">Intelligent Copilot</p>
          </div>
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
                    className="flex flex-col items-start p-5 bg-card border border-card-border rounded-2xl shadow-sm hover:bg-foreground/[0.03] hover:border-foreground/20 transition-all active:scale-[0.98] text-left group"
                    >
                    <div className="p-2.5 bg-foreground/[0.04] border border-card-border text-text-muted group-hover:text-foreground group-hover:border-foreground/20 rounded-xl mb-3 transition-colors">
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
                <AnimatePresence initial={false}>
                {messages.map((msg) => (
                    <ChatBubble
                      key={msg.id}
                      message={msg}
                      activity={msg.id === activeResponseId ? pipActivity : undefined}
                    />
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
