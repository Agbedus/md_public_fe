'use client';

import React, { useState } from 'react';
import { FiX, FiLoader, FiAlertCircle, FiInfo, FiAlertTriangle } from 'react-icons/fi';
import { HiSpeakerphone } from 'react-icons/hi';
import { useAnnouncements } from './announcement-provider';
import { AnnouncementType } from '@/types/announcement';
import { motion, AnimatePresence } from 'framer-motion';

export const AnnouncementForm = () => {
  const { createAnnouncement, isAdminFormOpen, setIsAdminFormOpen } = useAnnouncements();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState<AnnouncementType>('info');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isAdminFormOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await createAnnouncement({ title, content, type, is_active: true });
      if (res.success) {
        setSuccess(true);
        setTitle('');
        setContent('');
        setTimeout(() => {
          setIsAdminFormOpen(false);
          setSuccess(false);
        }, 1500);
      } else {
        setError(res.error || 'Failed to create announcement');
      }
    } catch (err) {
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
          className="relative w-full max-w-lg bg-background border border-card-border rounded-[2.5rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] overflow-hidden"
        >
          <div className="p-8 space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold text-foreground italic flex items-center gap-3 tracking-tight">
                <HiSpeakerphone className="text-[var(--pastel-yellow)]" />
                New Broadcast
              </h3>
              <button 
                onClick={() => setIsAdminFormOpen(false)}
                className="p-2 hover:bg-foreground/[0.05] rounded-xl text-text-secondary hover:text-foreground transition-all"
              >
                <FiX size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-[10px] font-black text-text-muted uppercase tracking-[0.2em] mb-2 ml-1">
                  Announcement Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="What's the big news?"
                  className="w-full bg-foreground/[0.03] border border-card-border rounded-2xl px-5 py-3 text-sm text-foreground placeholder:text-text-muted/50 focus:outline-none focus:border-emerald-500/30 transition-all font-bold"
                  required
                  disabled={loading || success}
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-text-muted uppercase tracking-[0.2em] mb-2 ml-1">
                  Announcement Message
                </label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Keep it concise and clear..."
                  className="w-full bg-foreground/[0.03] border border-card-border rounded-2xl px-5 py-3 text-sm text-foreground placeholder:text-text-muted/50 focus:outline-none focus:border-emerald-500/30 transition-all min-h-[120px] font-bold resize-none"
                  required
                  disabled={loading || success}
                />
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] font-black text-text-muted uppercase tracking-[0.2em] mb-1 ml-1">
                  Classification
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {(['info', 'success', 'warning', 'error', 'critical'] as AnnouncementType[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setType(t)}
                      className={`py-3 px-1 rounded-2xl border text-[9px] font-black uppercase tracking-tight transition-all flex flex-col items-center gap-1.5 ${
                        type === t 
                          ? 'bg-foreground/10 border-foreground/20 text-foreground ' 
                          : 'bg-transparent border-card-border text-text-muted hover:bg-foreground/[0.02]'
                      }`}
                    >
                      {t === 'info' && <FiInfo size={16} className="text-blue-600 dark:text-blue-500" />}
                      {t === 'success' && <FiAlertCircle size={16} className="text-emerald-600 dark:text-emerald-500" />}
                      {t === 'warning' && <FiAlertTriangle size={16} className="text-amber-600 dark:text-amber-500" />}
                      {t === 'error' && <FiAlertCircle size={16} className="text-rose-600 dark:text-rose-500" />}
                      {t === 'critical' && <FiAlertCircle size={16} className="text-purple-600 dark:text-purple-500" />}
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-3 text-xs text-rose-400 bg-rose-500/10 p-4 rounded-2xl border border-rose-500/10 animate-in fade-in zoom-in-95 duration-200">
                  <FiAlertCircle size={16} className="flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {success && (
                <div className="flex items-center gap-3 text-xs text-emerald-400 bg-emerald-500/10 p-4 rounded-2xl border border-emerald-500/10 animate-in fade-in zoom-in-95 duration-200">
                  <FiAlertCircle size={16} className="flex-shrink-0" />
                  <span>Announcement broadcasted successfully!</span>
                </div>
              )}

              <div className="flex justify-end pt-4">
                <button
                  type="submit"
                  disabled={loading || success || !title.trim() || !content.trim()}
                  className="px-8 py-3 bg-[var(--pastel-yellow)] hover:bg-[#ffe666] text-black text-xs font-bold rounded-2xl transition-all  hover:-[var(--pastel-yellow)]/20 disabled:opacity-50 disabled:hover: flex items-center gap-2 hover:-translate-y-0.5 active:translate-y-0"
                >
                  {loading ? (
                    <>
                      <FiLoader className="animate-spin" size={16} />
                      Broadcasting...
                    </>
                  ) : success ? (
                    <>
                      <HiSpeakerphone size={16} />
                      Dispatched
                    </>
                  ) : (
                    <>
                      <HiSpeakerphone size={16} />
                      Broadcast Now
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
