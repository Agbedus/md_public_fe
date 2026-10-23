"use client";

import { useState, useEffect, useRef } from "react";
import ChatBubble from "@/components/ui/assistant/ChatBubble";
import ChatInput from "@/components/ui/assistant/ChatInput";
import PipMascot from "@/components/ui/assistant/pip-mascot";
import type { PipActivity } from "@/components/ui/assistant/pip-status-indicator";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { FiArrowDown } from "react-icons/fi";
import { AssistantSuggestions } from "@/components/ui/assistant/assistant-suggestions";
import { useDashboard } from "@/components/ui/dashboard-layout";
import { usePipMemory } from "@/hooks/use-pip-memory";
import { readPipStream } from "@/lib/pip-stream";

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
  const [showJump, setShowJump] = useState(false);
  const followOutput = useRef(true);
  const reduceMotion = useReducedMotion();
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [pipActivity, setPipActivity] = useState<PipActivity>('ready');
  const [activeResponseId, setActiveResponseId] = useState<string | null>(null);
  const [pipVariantIdx, setPipVariantIdx] = useState(0);
  const abortRef = useRef<AbortController | null>(null);
  const { setHideContentScroll, userKey } = useDashboard();
  const { messages: memory, remember, toApiHistory } = usePipMemory(userKey);
  const [hasHydratedMemory, setHasHydratedMemory] = useState(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setHideContentScroll(true);
    return () => setHideContentScroll(false);
  }, [setHideContentScroll]);

  // One-time hydration from Pip's shared local memory (see use-pip-memory) —
  // picks the conversation back up (within its 6-hour window), including a
  // conversation started in the floating orb, instead of starting blank.
  useEffect(() => {
    if (hasHydratedMemory || memory.length === 0) return;
    const frame = window.requestAnimationFrame(() => {
      setMessages(memory);
      setHasHydratedMemory(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [memory, hasHydratedMemory]);

  useEffect(() => {
    const interval = setInterval(() => {
      setPipVariantIdx(prev => (prev + 1) % PIP_VARIANTS.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      if (followOutput.current && containerRef.current) {
        containerRef.current.scrollTo({ top: containerRef.current.scrollHeight, behavior: 'auto' });
      }
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
    setMessages((previous) => previous.filter((message) => message.isUser || message.text.trim()));
  };

  const handleSendMessage = async (text: string) => {
    if (abortRef.current || !text.trim()) return;
    followOutput.current = true;
    setShowJump(false);
    setHasHydratedMemory(true);
    localStorage.setItem('md_pip_used', 'true');
    const isReport = /monthly report|monthly summary|end-of-month|generate.*report/i.test(text);
    setHasError(false);
    setErrorMessage("");

    const history = toApiHistory();
    const interactionId = crypto.randomUUID();
    const newUserMessage: Message = { text, isUser: true, id: `user-${interactionId}` };
    setMessages((prev) => [...prev, newUserMessage]);
    remember(newUserMessage);
    setIsLoading(true);
    setPipActivity(isReport ? 'analyzing' : 'thinking');

    const aiMessageId = `assistant-${interactionId}`;
    setActiveResponseId(aiMessageId);
    setMessages((prev) => [...prev, { text: "", isUser: false, id: aiMessageId }]);

    const controller = new AbortController();
    abortRef.current = controller;
    let didFail = false;

    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => null);
        throw new Error(cleanAssistantError(errorPayload));
      }

      const result = await readPipStream(response, controller.signal, (text, isReport) => {
        setPipActivity('writing');
        setMessages((previous) => previous.map((message) => message.id === aiMessageId ? { ...message, text, isReport } : message));
      });
      if (!controller.signal.aborted) remember({ id: aiMessageId, text: result.text, isUser: false, isReport: result.isReport });
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
      if (abortRef.current === controller) {
        setIsLoading(false);
        if (!didFail) setPipActivity('ready');
        setActiveResponseId(null);
        abortRef.current = null;
      }
    }
  };

  return (
    <div className="relative flex h-full min-h-0 w-full flex-col overflow-hidden bg-background">
      {/* ── Header — Fixed at the top ── */}
      <div className="flex shrink-0 items-center justify-between gap-4 border-b border-card-border px-4 py-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <PipMascot variant={hasError ? 'sleepy' : PIP_VARIANTS[pipVariantIdx]} status={isLoading ? 'thinking' : hasError ? 'error' : 'idle'} size="sm" errorMessage={hasError ? errorMessage : undefined} />
          <div className="min-w-0">
            <h1 className="text-base font-semibold tracking-tight text-foreground">Pip</h1>
            <p className="mt-0.5 text-xs text-text-muted">Your workspace assistant</p>
          </div>
        </div>
        <span role="status" className="inline-flex items-center gap-2 rounded-full border border-card-border px-3 py-1.5 text-xs text-text-muted">
          <span className={`h-1.5 w-1.5 rounded-full ${hasError ? 'bg-danger' : isLoading ? 'bg-accent' : 'bg-success'}`} />
          {hasError ? 'Try again' : pipActivity === 'writing' ? 'Writing…' : isLoading ? 'Thinking…' : 'Ready'}
        </span>
      </div>

      <div
        ref={containerRef}
        onScroll={(event) => {
          const node = event.currentTarget;
          const nearBottom = node.scrollHeight - node.scrollTop - node.clientHeight < 96;
          followOutput.current = nearBottom;
          setShowJump(!nearBottom);
        }}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
      >
        {messages.length === 0 ? (
          <motion.div initial={reduceMotion ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}
            className="mx-auto flex min-h-full w-full max-w-3xl flex-col justify-center px-5 py-10 sm:px-8 sm:py-14">
            <div className="mb-8">
              <span className="mb-5 inline-flex rounded-full bg-accent/10 px-3 py-1.5 text-xs font-medium text-accent-text">A little clarity for your day</span>
              <h2 className="max-w-xl text-3xl font-semibold leading-tight tracking-tight text-foreground sm:text-4xl">What can we make easier?</h2>
              <p className="mt-3 max-w-lg text-sm leading-relaxed text-text-muted">Find a task, connect your notes, or turn this month’s work into a clear report.</p>
            </div>
            {/* Quick action cards */}
            <AssistantSuggestions onSelect={handleSendMessage} disabled={isLoading} />
          </motion.div>
        ) : (
          <div className="mx-auto w-full max-w-3xl space-y-7 px-4 py-6 sm:px-6 sm:py-8">
            <AnimatePresence initial={false}>
              {messages.map((msg) => <ChatBubble key={msg.id} message={msg} activity={msg.id === activeResponseId ? pipActivity : undefined} />)}
            </AnimatePresence>
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* ── Input bar (sticky at bottom) ── */}
      <div className="relative shrink-0 bg-background px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 sm:px-6 sm:pb-5">
        {showJump && <button type="button" aria-label="Jump to latest message" data-tooltip="Jump to latest"
          onClick={() => { followOutput.current = true; setShowJump(false); containerRef.current?.scrollTo({ top: containerRef.current.scrollHeight, behavior: reduceMotion ? 'auto' : 'smooth' }); }}
          className="absolute -top-12 left-1/2 grid h-10 w-10 -translate-x-1/2 place-items-center rounded-full border border-card-border bg-card text-foreground shadow-md transition-colors hover:bg-input-bg"><FiArrowDown /></button>}
        <div className="mx-auto w-full max-w-3xl">
          <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} onStop={handleStop} />
        </div>
      </div>

      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
