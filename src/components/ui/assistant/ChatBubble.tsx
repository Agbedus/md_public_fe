import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { motion, AnimatePresence } from 'framer-motion';
import { FiDownload, FiCopy, FiZap, FiCpu, FiTerminal, FiLoader } from 'react-icons/fi';
import { toast } from '@/lib/toast';
import PipMascot from './pip-mascot';

const NoteWidget = dynamic(() => import('./widgets/NoteWidget'));
const TaskWidget = dynamic(() => import('./widgets/TaskWidget'));
const ProjectWidget = dynamic(() => import('./widgets/ProjectWidget'));
const EventWidget = dynamic(() => import('./widgets/EventWidget'));
const StatsWidget = dynamic(() => import('./widgets/StatsWidget'));
const ReportWidget = dynamic(() => import('./widgets/ReportWidget'));

interface ChatBubbleProps {
  message: {
    id?: number | string;
    text: string;
    isUser: boolean;
    isReport?: boolean;
  };
}

const TOOL_ICONS = [FiZap, FiCpu, FiTerminal];

const ChatBubble: React.FC<ChatBubbleProps> = ({ message }) => {
  const [copied, setCopied] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [iconIdx, setIconIdx] = useState(0);
  const isLoading = !message.text && !message.isUser;

  useEffect(() => {
    if (!isLoading) return;
    const interval = setInterval(() => {
      setIconIdx(prev => (prev + 1) % TOOL_ICONS.length);
    }, 300);
    return () => clearInterval(interval);
  }, [isLoading]);

  const getCleanText = () => message.text.replace(/__WIDGET__[\s\S]*?__WIDGET__/g, '').trim();

  const handleCopy = async () => {
    const clean = getCleanText();
    if (!clean) return;
    try {
      await navigator.clipboard.writeText(clean);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = clean;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    const clean = getCleanText();
    if (!clean) return;
    const blob = new Blob([clean], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const dateStr = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `mynddesk-report-${dateStr}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadPdf = async () => {
    const clean = getCleanText();
    if (!clean || isDownloadingPdf) return;
    setIsDownloadingPdf(true);
    try {
      const heading = clean.split('\n').find((line) => /^#{1,2}\s+/.test(line.trim()));
      const title = heading?.replace(/^#+\s*/, '').trim() || 'MyndDesk AI Report';
      const response = await fetch('/api/assistant/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: clean, title }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || 'The PDF could not be generated.');
      }
      const blob = await response.blob();
      const disposition = response.headers.get('content-disposition') || '';
      const filename = disposition.match(/filename="([^"]+)"/)?.[1] || `mynddesk-ai-report-${new Date().toISOString().slice(0, 10)}.pdf`;
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      toast.success('Your PDF report is ready');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'The PDF could not be generated.');
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const isLong = message.text && message.text.length > 300;

  const parts = message.text ? message.text.split(/(__WIDGET__[\s\S]*?__WIDGET__)/g) : [];

  const renderWidget = (widgetToken: string) => {
    try {
      const jsonStr = widgetToken.replace(/__WIDGET__/g, '');
      const { widget, data } = JSON.parse(jsonStr);

      switch (widget) {
        case 'note':
          return (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="grid grid-cols-1 gap-3 my-3">
              {Array.isArray(data) ? data.map((n: any) => <NoteWidget key={n.id} {...{note: n}} />) : <NoteWidget {...{note: data}} />}
            </motion.div>
          );
        case 'task':
          return (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="grid grid-cols-1 gap-3 my-3">
              {Array.isArray(data) ? data.map((t: any) => <TaskWidget key={t.id} {...{task: t}} />) : <TaskWidget {...{task: data}} />}
            </motion.div>
          );
        case 'project':
          return (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="grid grid-cols-1 gap-3 my-3">
              {Array.isArray(data) ? data.map((p: any) => <ProjectWidget key={p.id} {...{project: p}} />) : <ProjectWidget {...{project: data}} />}
            </motion.div>
          );
        case 'event':
          return (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="grid grid-cols-1 gap-3 my-3">
              {Array.isArray(data) ? data.map((e: any) => <EventWidget key={e.id} {...{event: e}} />) : <EventWidget {...{event: data}} />}
            </motion.div>
          );
        case 'stats':
          return (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="my-3">
              <StatsWidget title={data.title} stats={data.stats} />
            </motion.div>
          );
        case 'report':
          return (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="my-3">
              <ReportWidget title={data.title} data={data} />
            </motion.div>
          );
        default:
          return null;
      }
    } catch (e) {
      console.error('Failed to parse widget data:', e);
      return null;
    }
  };

  if (!message.text && !message.isUser) {
    const LoadingIcon = TOOL_ICONS[iconIdx];
    return (
      <div className="flex justify-start mb-6 px-4 mt-2">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-card/40 border border-card-border/40"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={iconIdx}
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.6 }}
              transition={{ duration: 0.15 }}
            >
              <LoadingIcon className="w-4 h-4 text-indigo-400" />
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={`flex ${message.isUser ? 'justify-end' : 'justify-start'} mb-3 items-start gap-3`}>
      {!message.isUser && (
        <div className="shrink-0 mt-1">
          <PipMascot variant="smart" status="idle" size="sm" />
        </div>
      )}
      <motion.div
        layoutId={message.id ? `bubble-${message.id}` : undefined}
        initial={{ opacity: 0, scale: 0.9, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 24 }}
        className={`
          max-w-2xl px-5 py-4 overflow-hidden relative
          ${message.isUser
            ? 'bg-indigo-600 text-white rounded-2xl rounded-br-md'
            : 'bg-card/80 backdrop-blur-xl text-foreground rounded-2xl rounded-bl-md border border-card-border'
          }
        `}
      >
        {parts.map((part, i) => {
          if (!part) return null;
          if (part.startsWith('__WIDGET__')) {
            return <React.Fragment key={i}>{renderWidget(part)}</React.Fragment>;
          }
          return (
            <div key={i} className={`prose prose-sm max-w-none ${message.isUser ? 'prose-invert' : 'dark:prose-invert'} prose-p:leading-relaxed prose-pre:bg-foreground/[0.05] prose-pre:border prose-pre:border-card-border prose-pre:text-foreground prose-code:text-indigo-400 prose-a:text-indigo-400`}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {part}
              </ReactMarkdown>
            </div>
          );
        })}

        {!message.isUser && isLong && (
          <div className="mt-3 space-y-2">
            <p className="text-[10px] text-text-muted/60 italic font-medium">
              This response is not saved — download or copy it to keep a record.
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={message.isReport ? handleDownloadPdf : handleDownload}
                disabled={isDownloadingPdf}
                className="flex min-h-11 items-center gap-2 rounded-lg border border-card-border bg-foreground/[0.05] px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-text-muted transition-all hover:border-indigo-500/30 hover:text-indigo-400 disabled:cursor-wait disabled:opacity-60"
              >
                {isDownloadingPdf ? <FiLoader className="h-3.5 w-3.5 animate-spin" /> : <FiDownload className="h-3.5 w-3.5" />}
                {message.isReport ? (isDownloadingPdf ? 'Preparing PDF' : 'Download PDF') : 'Download .md'}
              </button>
              <button
                onClick={handleCopy}
                className="flex min-h-11 items-center gap-2 rounded-lg border border-card-border bg-foreground/[0.05] px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-text-muted transition-all hover:border-indigo-500/30 hover:text-indigo-400"
              >
                <FiCopy className="w-3 h-3" />
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default ChatBubble;
