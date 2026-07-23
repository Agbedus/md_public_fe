'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion, type Variants } from 'framer-motion';
import { FiArrowLeft, FiLoader, FiCheck, FiClock } from 'react-icons/fi';
import { verifyOtp, resendOtp } from '@/app/lib/actions';
import { toast } from '@/lib/toast';

const easeOut = [0.23, 1, 0.32, 1] as [number, number, number, number];

const formItem = {
  hidden: { opacity: 0, y: 10 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: easeOut, delay: 0.06 * i },
  }),
};

const RESEND_COOLDOWN = 60;
const EXPIRY_MINUTES = 10;

export default function VerifyOtpForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const email = searchParams.get('email') || '';

  const [digits, setDigits] = useState<string[]>(Array(6).fill(''));
  const [isPending, setIsPending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [expirySeconds, setExpirySeconds] = useState(EXPIRY_MINUTES * 60);
  const [attemptsLeft, setAttemptsLeft] = useState<number | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>(Array(6).fill(null));
  const expiryTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!email) router.replace('/register');
  }, [email, router]);

  useEffect(() => {
    expiryTimerRef.current = setInterval(() => {
      setExpirySeconds((prev) => {
        if (prev <= 1) {
          clearInterval(expiryTimerRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (expiryTimerRef.current) clearInterval(expiryTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const id = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(id);
  }, [resendCooldown]);

  const focusInput = useCallback((index: number) => {
    if (index >= 0 && index < 6) {
      inputRefs.current[index]?.focus();
    }
  }, []);

  function handleDigitChange(index: number, value: string) {
    if (!/^\d*$/.test(value)) return;

    const newDigits = [...digits];
    newDigits[index] = value.slice(-1);
    setDigits(newDigits);

    if (value && index < 5) {
      focusInput(index + 1);
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      focusInput(index - 1);
    }
    if (e.key === 'ArrowLeft' && index > 0) {
      focusInput(index - 1);
    }
    if (e.key === 'ArrowRight' && index < 5) {
      focusInput(index + 1);
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text/plain').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;

    const newDigits = [...digits];
    for (let i = 0; i < pasted.length; i++) {
      newDigits[i] = pasted[i];
    }
    setDigits(newDigits);

    const nextIndex = Math.min(pasted.length, 5);
    focusInput(nextIndex);
  }

  function getInputClass() {
    return 'w-full h-14 text-center text-xl font-semibold tracking-widest bg-input-bg border border-card-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all [font-size:max(16px,inherit)]';
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const otp = digits.join('');
    if (otp.length !== 6) return;

    setIsPending(true);

    let pendingOrgStr: string | null = null;
    try {
      pendingOrgStr = sessionStorage.getItem('pendingOrg');
    } catch {}

    const formData = new FormData();
    formData.append('email', email);
    formData.append('otp', otp);
    if (pendingOrgStr) {
      formData.append('_pendingOrg', pendingOrgStr);
    }

    try {
      const result = await verifyOtp(formData);
      if (result.success) {
        sessionStorage.removeItem('pendingOrg');
        toast.success('Account verified! Please sign in.');
        router.push(`/login?email=${encodeURIComponent(email)}&verified=1`);
      } else {
        toast.error(result.error || 'Verification failed');
        setDigits(Array(6).fill(''));
        focusInput(0);

        if (result.error?.toLowerCase().includes('attempt')) {
          const match = result.error.match(/(\d+)/);
          if (match) setAttemptsLeft(parseInt(match[1]));
        }
      }
    } catch {
      toast.error('An unexpected error occurred');
    } finally {
      setIsPending(false);
    }
  }

  async function handleResend() {
    if (resendCooldown > 0) return;
    const result = await resendOtp(email);
    if (result.success) {
      toast.success('A new code has been sent to your email');
      setResendCooldown(RESEND_COOLDOWN);
      setExpirySeconds(EXPIRY_MINUTES * 60);
      setAttemptsLeft(null);
      setDigits(Array(6).fill(''));
      focusInput(0);
    } else {
      toast.error(result.error || 'Failed to resend code');
    }
  }

  function formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  if (!email) return null;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <motion.div custom={0} variants={formItem as Variants} initial="hidden" animate="visible" className="text-center space-y-2">
        <p className="text-sm text-text-muted">
          Enter the 6-digit code sent to
        </p>
        <p className="text-sm font-medium text-foreground">{email}</p>
      </motion.div>

      <motion.div custom={1} variants={formItem as Variants} initial="hidden" animate="visible">
        <div className="flex gap-2 sm:gap-3 justify-center">
          {digits.map((digit, i) => (
            <input
              key={i}
              ref={(el) => { inputRefs.current[i] = el; }}
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={1}
              value={digit}
              onChange={(e) => handleDigitChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              onPaste={i === 0 ? handlePaste : undefined}
              className={getInputClass()}
              disabled={isPending}
              aria-label={`Digit ${i + 1}`}
            />
          ))}
        </div>
      </motion.div>

      <motion.div custom={2} variants={formItem as Variants} initial="hidden" animate="visible" className="flex items-center justify-center gap-1.5 text-sm">
        {expirySeconds > 0 ? (
          <>
            <FiClock className="h-3.5 w-3.5 text-text-muted" />
            <span className="text-text-muted">
              Code expires in{' '}
              <span className={expirySeconds < 60 ? 'text-rose-500 font-medium' : 'text-text-muted'}>
                {formatTime(expirySeconds)}
              </span>
            </span>
          </>
        ) : (
          <span className="text-rose-500 text-sm">Code expired — request a new one</span>
        )}
      </motion.div>

      {attemptsLeft !== null && (
        <motion.div custom={2.5} variants={formItem as Variants} initial="hidden" animate="visible" className="text-center">
          <span className="text-xs text-rose-500">{attemptsLeft} attempt{attemptsLeft !== 1 ? 's' : ''} remaining</span>
        </motion.div>
      )}

      <motion.div custom={3} variants={formItem as Variants} initial="hidden" animate="visible">
        <button
          type="submit"
          disabled={isPending || digits.join('').length !== 6}
          className="relative w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.97] hover:shadow-lg hover:shadow-emerald-500/20"
        >
          <span className={isPending ? 'opacity-0' : 'inline-flex items-center gap-2'}>
            <FiCheck className="h-4 w-4" />
            Verify account
          </span>
          {isPending && (
            <span className="absolute inset-0 flex items-center justify-center gap-2">
              <FiLoader className="h-4 w-4 animate-spin" />
              <span>Verifying...</span>
            </span>
          )}
        </button>
      </motion.div>

      <motion.div custom={4} variants={formItem as Variants} initial="hidden" animate="visible" className="text-center">
        <span className="text-sm text-text-muted">
          Didn&apos;t receive the code?{' '}
          <button
            type="button"
            onClick={handleResend}
            disabled={resendCooldown > 0 || isPending}
            className="text-emerald-500 hover:text-emerald-400 font-medium transition-colors disabled:text-text-muted/40 disabled:cursor-not-allowed"
          >
            {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
          </button>
        </span>
      </motion.div>

      <motion.div custom={5} variants={formItem as Variants} initial="hidden" animate="visible" className="text-center">
        <button
          type="button"
          onClick={() => router.push('/register')}
          className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-foreground transition-colors"
        >
          <FiArrowLeft className="h-3.5 w-3.5" />
          Use a different email
        </button>
      </motion.div>
    </form>
  );
}
