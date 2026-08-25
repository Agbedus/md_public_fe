'use client';

import { useRef, useState, useTransition } from 'react';
import { AnimatePresence, motion, useReducedMotion, type Variants } from 'framer-motion';
import {
  FiAlertCircle,
  FiCheckCircle,
  FiLoader,
  FiMail,
  FiSend,
  FiUsers,
  FiX,
} from 'react-icons/fi';
import { sendInvitation } from '@/app/(dashboard)/[orgSlug]/team/actions';
import { ONBOARDING_TOUR_READY_EVENT } from '@/lib/onboarding-events';
import { EmailChipInput } from './email-chip-input';
import { Portal } from './portal';
import { toast } from '@/lib/toast';

interface InviteMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInvited?: (count: number) => void;
  canInviteAdmin?: boolean;
}

type ModalPhase = 'compose' | 'sending' | 'complete';
type DeliveryStatus = 'queued' | 'sending' | 'success' | 'failed';

interface DeliveryItem {
  email: string;
  status: DeliveryStatus;
  error?: string;
}

const phaseVariants: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.24, ease: 'easeOut' } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.16, ease: 'easeOut' } },
};

const rowVariants: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.22, ease: 'easeOut' } },
  exit: { opacity: 0, transition: { duration: 0.14 } },
};

function wait(duration: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, duration));
}

export function InviteMemberModal({
  isOpen,
  onClose,
  onInvited,
  canInviteAdmin = false,
}: InviteMemberModalProps) {
  const [emails, setEmails] = useState<string[]>([]);
  const [role, setRole] = useState('member');
  const [personalMessage, setPersonalMessage] = useState('');
  const [phase, setPhase] = useState<ModalPhase>('compose');
  const [deliveries, setDeliveries] = useState<DeliveryItem[]>([]);
  const [visibleCount, setVisibleCount] = useState(0);
  const [isPending, startTransition] = useTransition();
  const sequenceIdRef = useRef(0);
  const hasSuccessfulInviteRef = useRef(false);
  const shouldReduceMotion = useReducedMotion();

  const resetComposer = (retryEmails: string[] = []) => {
    setEmails(retryEmails);
    setDeliveries([]);
    setVisibleCount(0);
    setPhase('compose');
  };

  const handleSend = () => {
    if (emails.length === 0 || phase !== 'compose') return;

    const batch = [...emails];
    const sequenceId = sequenceIdRef.current + 1;
    sequenceIdRef.current = sequenceId;
    setDeliveries(batch.map((email, index) => ({
      email,
      status: index === 0 ? 'sending' : 'queued',
    })));
    setVisibleCount(1);
    setPhase('sending');

    startTransition(async () => {
      const response = await sendInvitation(batch, { role, personalMessage });
      if (sequenceIdRef.current !== sequenceId) return;

      const resultByEmail = new Map(
        (response.results || []).map((result) => [result.email.toLowerCase(), result]),
      );
      const resolvedResults = batch.map((email) => resultByEmail.get(email.toLowerCase()) || {
        email,
        success: false,
        error: response.error || 'The invitation could not be sent.',
      });

      for (let index = 0; index < resolvedResults.length; index += 1) {
        if (sequenceIdRef.current !== sequenceId) return;
        setVisibleCount(index + 1);
        setDeliveries((current) => current.map((item, itemIndex) => (
          itemIndex === index ? { ...item, status: 'sending', error: undefined } : item
        )));

        await wait(shouldReduceMotion ? 60 : index === 0 ? 260 : 380);
        if (sequenceIdRef.current !== sequenceId) return;

        const result = resolvedResults[index];
        setDeliveries((current) => current.map((item, itemIndex) => (
          itemIndex === index
            ? { ...item, status: result.success ? 'success' : 'failed', error: result.error }
            : item
        )));
        await wait(shouldReduceMotion ? 30 : 170);
      }

      if (sequenceIdRef.current !== sequenceId) return;
      const successCount = resolvedResults.filter((result) => result.success).length;
      setPhase('complete');
      if (successCount > 0) {
        hasSuccessfulInviteRef.current = true;
        onInvited?.(successCount);
      }
      if (successCount === resolvedResults.length) {
        toast.success(`${successCount} ${successCount === 1 ? 'invitation' : 'invitations'} sent`);
      } else if (successCount > 0) {
        toast.warning(`${successCount} sent, ${resolvedResults.length - successCount} need attention`);
      } else {
        toast.error(response.error || 'The invitations could not be sent.');
      }
    });
  };

  const handleClose = () => {
    if (phase === 'sending' || isPending) return;
    sequenceIdRef.current += 1;
    setEmails([]);
    setDeliveries([]);
    setVisibleCount(0);
    setPhase('compose');
    setRole('member');
    setPersonalMessage('');
    if (hasSuccessfulInviteRef.current) {
      hasSuccessfulInviteRef.current = false;
      window.dispatchEvent(new Event(ONBOARDING_TOUR_READY_EVENT));
    }
    onClose();
  };

  const successfulDeliveries = deliveries.filter((item) => item.status === 'success');
  const failedDeliveries = deliveries.filter((item) => item.status === 'failed');
  const allSucceeded = phase === 'complete' && failedDeliveries.length === 0;
  const title = phase === 'compose'
    ? 'Invite your team'
    : phase === 'sending'
      ? 'Sending invitations'
      : allSucceeded
        ? 'Your invitations are on their way'
        : successfulDeliveries.length > 0
          ? 'Most invitations were sent'
          : 'Invitations need your attention';
  const description = phase === 'compose'
    ? 'Bring your teammates into this workspace. You can paste a list or add emails one at a time.'
    : phase === 'sending'
      ? 'We are preparing and delivering each invitation.'
      : `${successfulDeliveries.length} of ${deliveries.length} ${deliveries.length === 1 ? 'invitation' : 'invitations'} sent successfully.`;

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
              className="absolute inset-0 bg-white/60 backdrop-blur-md dark:bg-black/60"
            />
            <motion.div
              initial={{ scale: 0.96, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0, y: 16 }}
              transition={{ duration: shouldReduceMotion ? 0 : 0.24, ease: 'easeOut' }}
              role="dialog"
              aria-modal="true"
              aria-labelledby="invite-modal-title"
              className="relative flex h-[min(36rem,calc(100dvh-2rem))] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-card-border bg-background shadow-2xl"
            >
              <button
                type="button"
                onClick={handleClose}
                disabled={phase === 'sending' || isPending}
                aria-label="Close invitation dialog"
                className="absolute right-5 top-5 z-20 flex h-11 w-11 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-foreground/[0.05] hover:text-foreground disabled:cursor-wait disabled:opacity-40"
              >
                <FiX className="h-5 w-5" />
              </button>

              <div className="shrink-0 border-b border-card-border px-6 pb-5 pt-6 pr-20 sm:px-8 sm:pt-8">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
                  {phase === 'compose' ? (
                    <FiUsers className="h-5 w-5" />
                  ) : phase === 'sending' ? (
                    <motion.span
                      animate={shouldReduceMotion ? undefined : { opacity: [0.55, 1, 0.55] }}
                      transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
                    >
                      <FiSend className="h-5 w-5" />
                    </motion.span>
                  ) : allSucceeded ? (
                    <FiCheckCircle className="h-5 w-5" />
                  ) : (
                    <FiAlertCircle className="h-5 w-5 text-amber-500" />
                  )}
                </div>
                <h2 id="invite-modal-title" className="text-xl font-semibold leading-tight text-foreground">{title}</h2>
                <p className="mt-1.5 text-sm leading-relaxed text-text-muted">{description}</p>
              </div>

              <div className="min-h-0 flex-1 overflow-hidden px-6 py-5 sm:px-8">
                <AnimatePresence mode="wait" initial={false}>
                  {phase === 'compose' ? (
                    <motion.div key="compose" variants={phaseVariants} initial="hidden" animate="visible" exit="exit" className="flex h-full flex-col">
                      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
                        <div>
                          <label className="mb-1.5 block text-sm font-medium text-foreground">Email addresses</label>
                          <EmailChipInput
                            emails={emails}
                            onChange={setEmails}
                            placeholder="Type an email, then press Enter"
                          />
                          <p className="mt-1.5 text-xs text-text-muted">Separate addresses with Enter, Space, or a comma.</p>
                        </div>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <div>
                            <label className="mb-1.5 block text-sm font-medium text-foreground">Workspace role</label>
                            <select
                              value={role}
                              onChange={(event) => setRole(event.target.value)}
                              className="h-11 w-full rounded-md border border-card-border bg-input-bg px-3 text-sm text-foreground outline-none transition focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20"
                            >
                              <option value="member">Member</option>
                              <option value="manager">Manager</option>
                              <option value="guest">Guest</option>
                              {canInviteAdmin && <option value="admin">Admin</option>}
                            </select>
                          </div>
                          <p className="self-end pb-2 text-xs leading-relaxed text-text-muted">This role applies to everyone in this batch.</p>
                        </div>

                        <div>
                          <label className="mb-1.5 block text-sm font-medium text-foreground">
                            Personal note <span className="font-normal text-text-muted">(optional)</span>
                          </label>
                          <textarea
                            value={personalMessage}
                            onChange={(event) => setPersonalMessage(event.target.value.slice(0, 500))}
                            rows={3}
                            placeholder="Add a short welcome message…"
                            className="w-full resize-none rounded-md border border-card-border bg-input-bg px-3 py-2.5 text-sm text-foreground outline-none transition placeholder:text-text-muted focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20"
                          />
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleSend}
                        disabled={emails.length === 0}
                        className="mt-5 flex min-h-11 w-full shrink-0 items-center justify-center gap-2 rounded-md bg-emerald-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-500/90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <FiSend className="h-4 w-4" />
                        Send {emails.length || ''} invitation{emails.length === 1 ? '' : 's'}
                      </button>
                    </motion.div>
                  ) : (
                    <motion.div key="delivery" variants={phaseVariants} initial="hidden" animate="visible" exit="exit" className="flex h-full flex-col">
                      <div className="min-h-0 flex-1 overflow-y-auto" aria-live="polite" aria-busy={phase === 'sending'}>
                        <motion.div initial="hidden" animate="visible" className="space-y-2.5">
                          <AnimatePresence initial={false}>
                            {deliveries.slice(0, visibleCount).map((delivery) => (
                              <motion.div
                                key={delivery.email}
                                layout
                                variants={rowVariants}
                                initial="hidden"
                                animate="visible"
                                exit="exit"
                                className={`flex min-h-14 items-center gap-3 rounded-xl border px-3.5 py-3 ${
                                  delivery.status === 'success'
                                    ? 'border-emerald-500/20 bg-emerald-500/10'
                                    : delivery.status === 'failed'
                                      ? 'border-rose-500/20 bg-rose-500/10'
                                      : 'border-card-border bg-foreground/[0.025]'
                                }`}
                              >
                                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                                  delivery.status === 'success'
                                    ? 'bg-emerald-500/15 text-emerald-500'
                                    : delivery.status === 'failed'
                                      ? 'bg-rose-500/15 text-rose-500'
                                      : 'bg-foreground/[0.05] text-text-muted'
                                }`}>
                                  {delivery.status === 'success' ? (
                                    <FiCheckCircle className="h-4 w-4" />
                                  ) : delivery.status === 'failed' ? (
                                    <FiAlertCircle className="h-4 w-4" />
                                  ) : delivery.status === 'sending' ? (
                                    <FiLoader className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <FiMail className="h-4 w-4" />
                                  )}
                                </span>
                                <span className="min-w-0 flex-1">
                                  <span className="block truncate text-sm font-medium text-foreground">{delivery.email}</span>
                                  <span className={`mt-0.5 block truncate text-xs ${delivery.status === 'failed' ? 'text-rose-500' : 'text-text-muted'}`}>
                                    {delivery.status === 'success'
                                      ? 'Invitation sent'
                                      : delivery.status === 'failed'
                                        ? delivery.error || 'Delivery failed'
                                        : delivery.status === 'sending'
                                          ? 'Sending invitation…'
                                          : 'Waiting to send'}
                                  </span>
                                </span>
                              </motion.div>
                            ))}
                          </AnimatePresence>
                        </motion.div>
                      </div>

                      {phase === 'complete' && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-5 flex shrink-0 gap-3">
                          {failedDeliveries.length > 0 && (
                            <button
                              type="button"
                              onClick={() => resetComposer(failedDeliveries.map((item) => item.email))}
                              className="min-h-11 flex-1 rounded-md border border-card-border px-4 py-2.5 text-sm font-medium text-foreground transition hover:bg-foreground/[0.05] active:scale-[0.98]"
                            >
                              Retry failed
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={handleClose}
                            className="min-h-11 flex-1 rounded-md bg-emerald-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-500/90 active:scale-[0.98]"
                          >
                            Done
                          </button>
                        </motion.div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </Portal>
  );
}
