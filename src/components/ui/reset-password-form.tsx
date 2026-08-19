'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion, type Variants } from 'framer-motion';
import { FiLock, FiArrowRight, FiLoader, FiEye, FiEyeOff, FiCheckCircle, FiAlertCircle } from 'react-icons/fi';
import { resetPassword } from '@/app/lib/actions';
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

export default function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [succeeded, setSucceeded] = useState(false);

  const inputBase = 'block w-full pl-12 pr-10 py-3 bg-foreground/[0.03] border rounded-xl text-[15px] text-foreground placeholder:text-text-muted/40 focus:outline-none focus:bg-foreground/[0.06] transition-all [font-size:max(16px,inherit)] border-card-border';

  if (!token) {
    return (
      <div className="space-y-6 text-center">
        <div className="flex justify-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-500">
            <FiAlertCircle className="h-6 w-6" />
          </span>
        </div>
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">Invalid reset link</h2>
          <p className="text-sm text-text-muted leading-relaxed">
            This link is missing its reset token. Request a new one to continue.
          </p>
        </div>
        <Link
          href="/forgot-password"
          className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition-all"
        >
          Request a new link
        </Link>
      </div>
    );
  }

  if (succeeded) {
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
          <h2 className="text-lg font-semibold text-foreground">Password reset</h2>
          <p className="text-sm text-text-muted leading-relaxed">
            Your password has been changed. You can now sign in with your new password.
          </p>
        </div>
        <Link
          href="/login"
          className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition-all"
        >
          Continue to sign in
          <FiArrowRight className="h-4 w-4" />
        </Link>
      </motion.div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }

    setIsPending(true);
    try {
      const result = await resetPassword(token, password);
      if (!result.success) {
        toast.error(result.error || 'Failed to reset password.');
        return;
      }
      setSucceeded(true);
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsPending(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <motion.div custom={0} variants={formItem as Variants} initial="hidden" animate="visible" className="space-y-1.5">
        <label htmlFor="password" className="block text-xs font-medium text-text-muted ml-1">New password</label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <FiLock className="h-4 w-4 text-text-muted" />
          </div>
          <input
            className={inputBase}
            id="password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
            autoComplete="new-password"
            autoFocus
            required
            minLength={8}
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
      </motion.div>

      <motion.div custom={1} variants={formItem as Variants} initial="hidden" animate="visible" className="space-y-1.5">
        <label htmlFor="confirmPassword" className="block text-xs font-medium text-text-muted ml-1">Confirm password</label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <FiLock className="h-4 w-4 text-text-muted" />
          </div>
          <input
            className={inputBase}
            id="confirmPassword"
            type={showPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Re-enter your new password"
            autoComplete="new-password"
            required
            minLength={8}
          />
        </div>
      </motion.div>

      <motion.div custom={2} variants={formItem as Variants} initial="hidden" animate="visible">
        <button
          type="submit"
          disabled={isPending}
          className="relative w-full inline-flex items-center justify-center px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.97] hover:shadow-lg hover:shadow-emerald-500/20"
        >
          <span className={isPending ? 'opacity-0' : 'inline-flex items-center gap-2'}>
            Reset password
            <FiArrowRight className="h-4 w-4" />
          </span>
          {isPending && (
            <span className="absolute inset-0 flex items-center justify-center gap-2">
              <FiLoader className="h-4 w-4 animate-spin" />
              <span>Resetting...</span>
            </span>
          )}
        </button>
      </motion.div>
    </form>
  );
}
