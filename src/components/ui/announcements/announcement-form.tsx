'use client';

import React, { useState } from 'react';
import { FiX, FiLoader, FiAlertCircle, FiInfo, FiAlertTriangle } from 'react-icons/fi';
import { HiSpeakerphone } from 'react-icons/hi';
import { useAnnouncements } from './announcement-provider';
import { AnnouncementType } from '@/types/announcement';
import { motion, AnimatePresence } from 'framer-motion';

import { BusyIcon } from '@/components/ui/busy-icon';
export const AnnouncementForm = () => {
  const { createAnnouncement, isAdminFormOpen, setIsAdminFormOpen } = useAnnouncements();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState<AnnouncementType>('info');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isAdminFormOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    setLoading(true);
    setError(null);

    try {
      // `createAnnouncement` already raises a toast for both outcomes, so the
      // modal just closes on success and lets that be the confirmation. The
      // inline banner below is kept for failures only, where the form stays
      // open and the message belongs next to the fields that caused it.
      const res = await createAnnouncement({ title, content, type, is_active: true });
      if (res.success) {
        setTitle('');
        setContent('');
        setType('info');
        setIsAdminFormOpen(false);
      } else {
        setError(res.error || 'Failed to create announcement');
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setIsAdminFormOpen(false)}
          className="absolute inset-0 bg-white/60 dark:bg-black/60 backdrop-blur-md"
        />
        
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          className="relative w-full max-w-lg bg-background border border-card-border rounded-[28px] overflow-hidden"
        >
          <div className="space-y-5 p-4 sm:p-6 md:space-y-6 md:p-8">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold text-foreground italic flex items-center gap-3 tracking-tight">
                <HiSpeakerphone className="text-[var(--warning)]" />
                New announcement
              </h3>
              <button 
                onClick={() => setIsAdminFormOpen(false)}
                className="p-2 hover:bg-foreground/[0.05] text-text-secondary hover:text-foreground transition-all rounded-full"
              >
                <FiX size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-[11px] font-semibold text-text-muted mb-2 ml-1">
                  Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="What's the big news?"
                  className="w-full bg-foreground/[0.03] border border-card-border rounded-2xl px-5 py-3 text-sm text-foreground placeholder:text-text-muted/50 focus:outline-none transition-all font-bold"
                  required
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-text-muted mb-2 ml-1">
                  Message
                </label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Keep it concise and clear..."
                  className="w-full bg-foreground/[0.03] border border-card-border rounded-2xl px-5 py-3 text-sm text-foreground placeholder:text-text-muted/50 focus:outline-none transition-all min-h-[120px] font-bold resize-none"
                  required
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <label className="block text-[11px] font-semibold text-text-muted mb-1 ml-1">
                  Classification
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {(['info', 'success', 'warning', 'error', 'critical'] as AnnouncementType[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setType(t)}
                      className={`py-3 px-1 rounded-full border text-[11px] font-semibold tracking-tight transition-all flex flex-col items-center gap-1.5 ${
 type === t 
 ? 'bg-foreground/10 border-foreground/20 text-foreground ' 
 : 'bg-transparent border-card-border text-text-muted hover:bg-foreground/[0.02]'
 }`}
                    >
                      {t === 'info' && <FiInfo size={16} className="text-accent-text dark:text-accent-text" />}
                      {t === 'success' && <FiAlertCircle size={16} className="text-success-text dark:text-success-text" />}
                      {t === 'warning' && <FiAlertTriangle size={16} className="text-warning-text dark:text-warning-text" />}
                      {t === 'error' && <FiAlertCircle size={16} className="text-danger-text dark:text-danger-text" />}
                      {t === 'critical' && <FiAlertCircle size={16} className="text-[var(--status-qa)] dark:text-[var(--status-qa)]" />}
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-3 text-xs text-danger-text bg-danger/10 p-4 rounded-2xl border border-danger/10 animate-in fade-in zoom-in-95 duration-200">
                  <FiAlertCircle size={16} className="flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="flex justify-end pt-4">
                <button
                  type="submit"
                  disabled={loading || !title.trim() || !content.trim()}
                  className="md-btn md-btn-primary"
                >
                  {loading ? 'Sending…' : 'Send announcement'}
                  <span className="md-btn-chip"><BusyIcon state={loading ? 'loading' : 'idle'} icon={<HiSpeakerphone />} /></span>
                </button>
              </div>
            </form>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
