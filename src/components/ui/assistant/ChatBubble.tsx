import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { motion } from 'framer-motion';
import { FiDownload, FiCopy, FiLoader } from 'react-icons/fi';
import { toast } from '@/lib/toast';
import PipMascot from './pip-mascot';
import { PipStatusIndicator, type PipActivity } from './pip-status-indicator';

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
  activity?: PipActivity;
}

const ChatBubble: React.FC<ChatBubbleProps> = ({ message, activity }) => {
  const [copied, setCopied] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const isLoading = !message.text && !message.isUser;

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
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 60_000);
    try {
      const heading = clean.split('\n').find((line) => /^#{1,2}\s+/.test(line.trim()));
      const title = heading?.replace(/^#+\s*/, '').trim() || 'MyndDesk AI Report';
      const response = await fetch('/api/assistant/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: clean, title }),
        signal: controller.signal,
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || 'The PDF could not be generated.');
      }
      const blob = await response.blob();
      if (blob.size === 0) throw new Error('The generated PDF was empty. Please try again.');
      const disposition = response.headers.get('content-disposition') || '';
      const filename = disposition.match(/filename="([^"]+)"/)?.[1] || `mynddesk-ai-report-${new Date().toISOString().slice(0, 10)}.pdf`;
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      anchor.style.display = 'none';
      document.body.appendChild(anchor);
      await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
      toast.success('Your PDF report is ready');
    } catch (error) {
      const message = error instanceof DOMException && error.name === 'AbortError'
        ? 'The PDF took too long to prepare. Please try again.'
        : error instanceof Error ? error.message : 'The PDF could not be generated.';
      toast.error(message);
    } finally {
      window.clearTimeout(timeoutId);
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
    return (
      <div className="flex justify-start mb-3 items-start gap-3">
        <div className="shrink-0 mt-1">
          <PipMascot variant="smart" status={activity === 'thinking' || activity === 'analyzing' ? 'thinking' : 'idle'} size="sm" />
        </div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex min-h-14 items-center rounded-2xl rounded-bl-md border border-card-border bg-card/80 px-4 py-3 backdrop-blur-xl"
        >
          <PipStatusIndicator activity={activity || 'thinking'} />
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
        {!message.isUser && activity === 'writing' && (
          <div className="mb-2 flex justify-start border-b border-card-border/60 pb-2">
            <PipStatusIndicator activity="writing" />
          </div>
        )}
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

        {!message.isUser && (isLong || message.isReport) && (
          <div className="mt-3 space-y-2">
            <p className="text-[10px] text-text-muted/60 italic font-medium">
              This response is not saved — download or copy it to keep a record.
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={message.isReport ? handleDownloadPdf : handleDownload}
                disabled={isDownloadingPdf}
                aria-busy={isDownloadingPdf}
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
