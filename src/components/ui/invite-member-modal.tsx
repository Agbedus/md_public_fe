'use client';

import { useState, useTransition } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Portal } from './portal';
import { FiX, FiSend, FiCheck, FiAlertCircle } from 'react-icons/fi';
import { EmailChipInput } from './email-chip-input';
import { sendInvitation } from '@/app/(dashboard)/[orgSlug]/team/actions';
import { toast } from '@/lib/toast';

interface InviteMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function InviteMemberModal({ isOpen, onClose }: InviteMemberModalProps) {
  const [emails, setEmails] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();
  const [results, setResults] = useState<{ email: string; success: boolean; error?: string }[] | null>(null);

  const handleSend = () => {
    if (emails.length === 0) return;
    setResults(null);
    startTransition(async () => {
      const res = await sendInvitation(emails);
      if (res.results) {
        setResults(res.results);
        if (res.results.some(r => r.success)) {
          toast.success(`Invitations sent to ${res.results.filter(r => r.success).length}/${res.results.length} recipients`);
        }
        if (!res.success) {
          const errors = res.results.filter(r => !r.success).map(r => r.email).join(', ');
          toast.error(`Failed: ${errors}`);
        }
      }
    });
  };

  const handleClose = () => {
    setEmails([]);
    setResults(null);
    onClose();
  };

  const allSucceeded = results && results.every(r => r.success);

  return (
    <Portal>
      <AnimatePresence mode="wait">
        {isOpen && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleClose}
              className="absolute inset-0 bg-white/60 dark:bg-black/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-lg bg-background border border-card-border rounded-[2rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] overflow-hidden"
            >
              <button
                onClick={handleClose}
                className="absolute top-6 right-6 p-2 rounded-2xl hover:bg-foreground/[0.05] text-text-secondary hover:text-foreground transition-all z-20"
              >
                <FiX className="w-5 h-5" />
              </button>

              <div className="p-8">
                <h2 className="text-xl font-bold text-foreground mb-1">Invite Members</h2>
                <p className="text-sm text-text-muted mb-6">
                  Enter email addresses to invite people to this organization.
                </p>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-text-muted mb-1.5 uppercase tracking-wider">
                      Email Addresses
                    </label>
                    <EmailChipInput
                      emails={emails}
                      onChange={setEmails}
                      placeholder="Type email and press Enter..."
                    />
                  </div>

                  <button
                    onClick={handleSend}
                    disabled={emails.length === 0 || isPending}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 disabled:bg-foreground/10 disabled:text-text-muted text-white text-sm font-medium transition-all disabled:cursor-not-allowed"
                  >
                    {isPending ? (
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <FiSend size={16} />
                    )}
                    {isPending ? 'Sending...' : `Send Invitation${emails.length !== 1 ? 's' : ''}`}
                  </button>
                </div>

                {results && results.length > 0 && (
                  <div className="mt-6 space-y-2">
                    <p className="text-xs font-medium text-text-muted uppercase tracking-wider">
                      Results
                    </p>
                    <div className="space-y-1.5 max-h-40 overflow-y-auto">
                      {results.map((r) => (
                        <div
                          key={r.email}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs ${
                            r.success
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : 'bg-rose-500/10 text-rose-400'
                          }`}
                        >
                          {r.success ? <FiCheck size={14} /> : <FiAlertCircle size={14} />}
                          <span className="truncate">{r.email}</span>
                          {r.error && <span className="ml-auto opacity-60">{r.error}</span>}
                        </div>
                      ))}
                    </div>
                    {allSucceeded && (
                      <p className="text-xs text-emerald-400 font-medium text-center pt-2">
                        All invitations sent successfully
                      </p>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </Portal>
  );
}
