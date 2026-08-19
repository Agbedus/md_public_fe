'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion, type Variants } from 'framer-motion';
import { FiMail, FiArrowRight, FiLoader, FiArrowLeft, FiCheckCircle } from 'react-icons/fi';
import { requestPasswordReset } from '@/app/lib/actions';
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

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [isPending, setIsPending] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const inputBase = 'block w-full pl-12 pr-3.5 py-3 bg-foreground/[0.03] border rounded-xl text-[15px] text-foreground placeholder:text-text-muted/40 focus:outline-none focus:bg-foreground/[0.06] transition-all [font-size:max(16px,inherit)] border-card-border';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsPending(true);
    try {
      const result = await requestPasswordReset(email);
      if (!result.success) {
        toast.error(result.error || 'Something went wrong. Please try again.');
        return;
      }
      // Always show the same success state regardless of whether the email
      // matched an account — the backend deliberately returns a generic
      // response for this reason, and the UI must not contradict that by
      // revealing which emails exist.
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
            If an account exists for <span className="text-foreground font-medium">{email}</span>, a password reset
            link has been sent. It expires in 60 minutes.
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

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <motion.div custom={0} variants={formItem as Variants} initial="hidden" animate="visible" className="space-y-1.5">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <FiMail className="h-4 w-4 text-text-muted" />
          </div>
          <input
            className={inputBase}
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
        </div>
      </motion.div>

      <motion.div custom={1} variants={formItem as Variants} initial="hidden" animate="visible">
        <button
          type="submit"
          disabled={isPending}
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
