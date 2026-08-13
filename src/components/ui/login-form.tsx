'use client';

import { useActionState, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { authenticateWithDetail } from '@/app/lib/actions';
import { FiMail, FiLock, FiArrowRight, FiLoader, FiEye, FiEyeOff, FiCheckCircle, FiAlertCircle, FiUsers } from 'react-icons/fi';
import { toast } from '@/lib/toast';
import Link from 'next/link';
import { motion, type Variants } from 'framer-motion';

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

export default function LoginForm() {
  const searchParams = useSearchParams();
  const verified = searchParams.get('verified') === '1';
  const prefillEmail = searchParams.get('email') || '';
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';
  const organizationName = searchParams.get('organizationName') || '';
  const invitationToken = searchParams.get('invitationToken') || '';

  const [state, dispatch, isPending] = useActionState(authenticateWithDetail, undefined);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState(prefillEmail);

  useEffect(() => {
    if (state?.error) {
      toast.error(state.error);
    }
  }, [state]);

  const inputBase = 'block w-full pl-12 pr-3.5 py-3 bg-foreground/[0.03] border rounded-xl text-[15px] text-foreground placeholder:text-text-muted/40 focus:outline-none focus:bg-foreground/[0.06] transition-all [font-size:max(16px,inherit)] border-card-border';

  return (
    <form action={dispatch} className="space-y-5">
      <input type="hidden" name="callbackUrl" value={callbackUrl} />
      <input type="hidden" name="invitationToken" value={invitationToken} />
      {organizationName && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
          className="flex items-start gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3"
        >
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
            <FiUsers className="h-4 w-4" />
          </span>
          <div className="min-w-0 text-left">
            <p className="text-sm font-semibold text-foreground">Join {organizationName}</p>
            <p className="mt-0.5 text-xs leading-5 text-text-muted">Sign in once. We’ll add this workspace and open it for you automatically.</p>
          </div>
        </motion.div>
      )}
      {verified && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
          className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-sm text-emerald-700 dark:text-emerald-300"
        >
          <FiCheckCircle className="h-4 w-4 shrink-0" />
          <span>Account verified! Please sign in.</span>
        </motion.div>
      )}

      {state?.needsVerification && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
          className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-sm text-amber-700 dark:text-amber-300"
        >
          <FiAlertCircle className="h-4 w-4 shrink-0" />
          <span>
            Email not verified.{' '}
            <Link
              href={`/verify-otp?email=${encodeURIComponent(state.email || email)}&callbackUrl=${encodeURIComponent(callbackUrl)}${organizationName ? `&organizationName=${encodeURIComponent(organizationName)}` : ''}`}
              className="underline underline-offset-2 font-medium hover:text-amber-600 dark:hover:text-amber-200"
            >
              Resend verification code
            </Link>
          </span>
        </motion.div>
      )}

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
            readOnly={Boolean(organizationName && prefillEmail)}
            placeholder="name@example.com"
            autoComplete="email"
            required
          />
        </div>
      </motion.div>

      <motion.div custom={1} variants={formItem as Variants} initial="hidden" animate="visible" className="space-y-1.5">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <FiLock className="h-4 w-4 text-text-muted" />
          </div>
          <input
            className={`${inputBase} pr-10`}
            id="password"
            type={showPassword ? "text" : "password"}
            name="password"
            placeholder="Enter your password"
            autoComplete="current-password"
            required
            minLength={6}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute inset-y-0 right-0 pr-4 flex items-center text-text-muted hover:text-foreground transition-colors"
            tabIndex={-1}
          >
            {showPassword ? <FiEyeOff className="h-4 w-4" /> : <FiEye className="h-4 w-4" />}
          </button>
        </div>
        <div className="flex justify-end">
          <Link href="/forgot-password" className="text-xs text-text-muted hover:text-emerald-500 transition-colors font-medium">
            Forgot password?
          </Link>
        </div>
      </motion.div>

      <motion.div custom={2} variants={formItem as Variants} initial="hidden" animate="visible">
        <button
          type="submit"
          disabled={isPending}
          className="relative w-full inline-flex items-center justify-center px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.97] hover:shadow-lg hover:shadow-emerald-500/20"
        >
          <span className={isPending ? 'opacity-0' : 'inline-flex items-center gap-2'}>
            {organizationName ? 'Sign in and join' : 'Sign in'}
            <FiArrowRight className="h-4 w-4" />
          </span>
          {isPending && (
            <span className="absolute inset-0 flex items-center justify-center gap-2">
              <FiLoader className="h-4 w-4 animate-spin" />
              <span>{organizationName ? 'Joining workspace…' : 'Signing in...'}</span>
            </span>
          )}
        </button>
      </motion.div>
    </form>
  );
}
