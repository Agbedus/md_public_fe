'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { motion, type Variants } from 'framer-motion';
import { FiMail, FiArrowRight, FiLoader, FiArrowLeft, FiCheckCircle, FiAlertCircle } from 'react-icons/fi';
import { requestPasswordReset, checkEmailExists } from '@/app/lib/actions';
import { toast } from '@/lib/toast';

const formItem = {
  hidden: { opacity: 0, y: 10 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.45,
      ease: [0.23, 1, 0.32, 1] as const,
      delay: 0.06 * i,
    },
  }),
};

const EMAIL_FORMAT = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CHECK_DEBOUNCE_MS = 500;

type EmailStatus = 'idle' | 'bad-format' | 'checking' | 'found' | 'not-found' | 'unknown';

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<EmailStatus>('idle');
  const [isPending, setIsPending] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);

  const inputBase = 'block w-full pl-12 pr-3.5 py-3 bg-foreground/[0.03] border rounded-xl text-[15px] text-foreground placeholder:text-text-muted/40 focus:outline-none focus:bg-foreground/[0.06] transition-all [font-size:max(16px,inherit)]';
  const borderClass = status === 'not-found' || status === 'bad-format'
    ? 'border-rose-500/40'
    : status === 'found'
    ? 'border-emerald-500/40'
    : 'border-card-border';

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = email.trim();
    if (!trimmed) {
      setStatus('idle');
      return;
    }
    if (!EMAIL_FORMAT.test(trimmed)) {
      setStatus('bad-format');
      return;
    }

    setStatus('checking');
    const thisRequestId = ++requestIdRef.current;

    debounceRef.current = setTimeout(async () => {
      const exists = await checkEmailExists(trimmed);
      // Stale response guard — user may have kept typing while this was in flight.
      if (thisRequestId !== requestIdRef.current) return;
      if (exists === null) {
        // Network hiccup on the check itself — don't block submission over it.
        setStatus('unknown');
      } else {
        setStatus(exists ? 'found' : 'not-found');
      }
    }, CHECK_DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || status === 'bad-format' || status === 'not-found' || status === 'checking') return;

    setIsPending(true);
    try {
      const result = await requestPasswordReset(email);
      if (!result.success) {
        toast.error(result.error || 'Something went wrong. Please try again.');
        return;
      }
      setSubmitted(true);
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsPending(false);
    }
  };

  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
        className="space-y-6 text-center"
      >
        <div className="flex justify-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500">
            <FiCheckCircle className="h-6 w-6" />
          </span>
        </div>
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">Check your email</h2>
          <p className="text-sm text-text-muted leading-relaxed">
            A password reset link has been sent to <span className="text-foreground font-medium">{email}</span>. It
            expires in 60 minutes.
          </p>
        </div>
        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-sm text-emerald-500 hover:text-emerald-400 font-medium transition-colors"
        >
          <FiArrowLeft className="h-4 w-4" />
          Back to sign in
        </Link>
      </motion.div>
    );
  }

  const canSubmit = !isPending && status !== 'bad-format' && status !== 'not-found' && status !== 'checking' && email.length > 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <motion.div custom={0} variants={formItem as Variants} initial="hidden" animate="visible" className="space-y-1.5">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <FiMail className="h-4 w-4 text-text-muted" />
          </div>
          <input
            className={`${inputBase} ${borderClass} border pr-10`}
            id="email"
            type="email"
            name="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
            autoComplete="email"
            autoFocus
            required
          />
          <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none">
            {status === 'checking' && <FiLoader className="h-4 w-4 text-text-muted animate-spin" />}
            {status === 'found' && <FiCheckCircle className="h-4 w-4 text-emerald-500" />}
            {(status === 'not-found' || status === 'bad-format') && <FiAlertCircle className="h-4 w-4 text-rose-500" />}
          </div>
        </div>
        {status === 'bad-format' && (
          <p className="text-xs text-rose-500 ml-1">Enter a valid email address.</p>
        )}
        {status === 'not-found' && (
          <p className="text-xs text-rose-500 ml-1">No account found with this email.</p>
        )}
      </motion.div>

      <motion.div custom={1} variants={formItem as Variants} initial="hidden" animate="visible">
        <button
          type="submit"
          disabled={!canSubmit}
          className="relative w-full inline-flex items-center justify-center px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.97] hover:shadow-lg hover:shadow-emerald-500/20"
        >
          <span className={isPending ? 'opacity-0' : 'inline-flex items-center gap-2'}>
            Send reset link
            <FiArrowRight className="h-4 w-4" />
          </span>
          {isPending && (
            <span className="absolute inset-0 flex items-center justify-center gap-2">
              <FiLoader className="h-4 w-4 animate-spin" />
              <span>Sending...</span>
            </span>
          )}
        </button>
      </motion.div>

      <motion.div custom={2} variants={formItem as Variants} initial="hidden" animate="visible" className="text-center">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-foreground font-medium transition-colors"
        >
          <FiArrowLeft className="h-3.5 w-3.5" />
          Back to sign in
        </Link>
      </motion.div>
    </form>
  );
}
