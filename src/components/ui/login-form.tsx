'use client';

import { useActionState, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { authenticateWithDetail } from '@/app/lib/actions';
import { FiMail, FiLock, FiArrowRight, FiLoader, FiEye, FiEyeOff, FiCheckCircle, FiAlertCircle } from 'react-icons/fi';
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

  const [state, dispatch, isPending] = useActionState(authenticateWithDetail, undefined);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState(prefillEmail);

  useEffect(() => {
    if (state?.error) {
      toast.error(state.error);
    }
  }, [state]);

  const inputBase = 'block w-full pl-12 pr-3.5 py-3 bg-input-bg border rounded-xl text-[15px] text-foreground placeholder:text-text-muted/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all [font-size:max(16px,inherit)] border-card-border';

  return (
    <form action={dispatch} className="space-y-5">
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
              href={`/verify-otp?email=${encodeURIComponent(state.email || email)}`}
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
            Sign in
            <FiArrowRight className="h-4 w-4" />
          </span>
          {isPending && (
            <span className="absolute inset-0 flex items-center justify-center gap-2">
              <FiLoader className="h-4 w-4 animate-spin" />
              <span>Signing in...</span>
            </span>
          )}
        </button>
      </motion.div>
    </form>
  );
}
