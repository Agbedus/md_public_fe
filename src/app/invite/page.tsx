'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { motion, type Variants } from 'framer-motion';
import { FiLoader, FiCheckCircle, FiAlertCircle, FiArrowRight, FiUsers, FiLink, FiUserPlus } from 'react-icons/fi';
import { toast } from '@/lib/toast';
import { joinOrganizationByInvite } from '@/lib/org-actions';

const container = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 },
  },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.23, 1, 0.32, 1] as const },
  },
};

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL_LOCAL || process.env.NEXT_PUBLIC_BASE_URL_PRODUCTION || 'http://127.0.0.1:8000';
const API_BASE_URL = `${BASE_URL}/api/v1`;

interface OrgInfo {
  name: string;
  description?: string | null;
  industry?: string | null;
  company_size?: string | null;
  member_count?: number;
}

export default function InvitePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const code = searchParams.get('code');
  const orgId = searchParams.get('org');

  const [orgInfo, setOrgInfo] = useState<OrgInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    fetch('/api/auth/session')
      .then(r => r.json())
      .then(session => {
        setIsLoggedIn(!!session?.user?.id);
        setAuthChecked(true);
      })
      .catch(() => {
        setAuthChecked(true);
      });
  }, []);

  useEffect(() => {
    if (!code) {
      setError('No invite code provided. Please check the link or enter the code on the registration page.');
      setLoading(false);
      return;
    }

    const fetchOrg = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/organizations/by-invite/${encodeURIComponent(code)}`);
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.detail || 'Invalid or expired invite code');
        }
        const data = await res.json();
        setOrgInfo(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to verify invite code');
      } finally {
        setLoading(false);
      }
    };

    fetchOrg();
  }, [code]);

  const handleJoin = async () => {
    if (!code) return;
    setJoining(true);
    const result = await joinOrganizationByInvite(code);
    setJoining(false);
    if (result.success) {
      toast.success(`You have joined ${orgInfo?.name || 'the organization'}!`);
      router.push('/');
    } else {
      toast.error(result.error || 'Failed to join organization');
    }
  };

  return (
    <main className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden bg-background isolate">
      <div className="absolute inset-0 pointer-events-none -z-10">
        <motion.div
          className="absolute top-[-25%] right-[-20%] w-[70%] h-[70%] rounded-full bg-indigo-500/[0.06] blur-[200px]"
          animate={{ x: [0, -30, 0], y: [0, -20, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute bottom-[-25%] left-[-20%] w-[70%] h-[70%] rounded-full bg-emerald-500/[0.06] blur-[200px]"
          animate={{ x: [0, 30, 0], y: [0, 20, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      <motion.div
        className="relative w-full max-w-md"
        variants={container as Variants}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={item as Variants} className="flex justify-center mb-10">
          <Link href="/" className="block group">
            <Image src="/logo.svg" alt="MD Logo" width={44} height={44} className="w-11 h-11" priority />
          </Link>
        </motion.div>

        {loading || !authChecked ? (
          <motion.div variants={item as Variants} className="flex flex-col items-center gap-4 py-12">
            <FiLoader className="w-8 h-8 text-indigo-400 animate-spin" />
            <p className="text-sm text-text-muted">Verifying invite code...</p>
          </motion.div>
        ) : error ? (
          <motion.div variants={item as Variants} className="text-center space-y-6 py-8">
            <div className="w-16 h-16 rounded-full bg-rose-500/10 flex items-center justify-center mx-auto">
              <FiAlertCircle className="w-8 h-8 text-rose-400" />
            </div>
            <div className="space-y-2">
              <h1 className="text-xl font-semibold text-foreground">Invite Not Found</h1>
              <p className="text-sm text-text-muted">{error}</p>
            </div>
            <div className="space-y-3 pt-2">
              <Link
                href="/register"
                className="block w-full text-center px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition-all"
              >
                Create an account instead
              </Link>
              <Link
                href="/"
                className="block w-full text-center text-sm text-text-muted hover:text-foreground transition-colors"
              >
                Back to home
              </Link>
            </div>
          </motion.div>
        ) : orgInfo ? (
          <motion.div variants={item as Variants} className="text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto">
              <FiCheckCircle className="w-8 h-8 text-emerald-400" />
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-semibold text-foreground">You&apos;re Invited!</h1>
              <p className="text-sm text-text-muted">
                Join <span className="font-semibold text-foreground">{orgInfo.name}</span> on MD Platform
              </p>
            </div>

            <div className="rounded-xl bg-foreground/[0.02] border border-card-border divide-y divide-card-border text-left">
              <div className="px-4 py-3 flex items-center gap-3">
                <FiUsers className="w-4 h-4 text-text-muted flex-shrink-0" />
                <span className="text-sm text-foreground font-medium">{orgInfo.name}</span>
              </div>
              {orgInfo.description && (
                <div className="px-4 py-3">
                  <p className="text-sm text-text-muted">{orgInfo.description}</p>
                </div>
              )}
              {orgInfo.industry && (
                <div className="px-4 py-3 flex items-center justify-between">
                  <span className="text-sm text-text-muted">Industry</span>
                  <span className="text-sm font-medium text-foreground">{orgInfo.industry}</span>
                </div>
              )}
              {orgInfo.company_size && (
                <div className="px-4 py-3 flex items-center justify-between">
                  <span className="text-sm text-text-muted">Company size</span>
                  <span className="text-sm font-medium text-foreground">{orgInfo.company_size}</span>
                </div>
              )}
              <div className="px-4 py-3 flex items-center gap-3">
                <FiLink className="w-4 h-4 text-text-muted flex-shrink-0" />
                <span className="text-sm font-mono tracking-wider text-indigo-400">{code}</span>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              {isLoggedIn ? (
                <button
                  onClick={handleJoin}
                  disabled={joining}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold transition-all"
                >
                  {joining ? (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <FiUserPlus className="w-4 h-4" />
                  )}
                  {joining ? 'Joining...' : 'Join Organization'}
                </button>
              ) : (
                <Link
                  href={`/register?invite=${encodeURIComponent(code || '')}${orgId ? `&org=${encodeURIComponent(orgId)}` : ''}`}
                  className="block w-full text-center px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition-all flex items-center justify-center gap-2"
                >
                  Accept Invitation
                  <FiArrowRight className="w-4 h-4" />
                </Link>
              )}
              {!isLoggedIn && (
                <p className="text-xs text-text-muted">
                  Already have an account?{' '}
                  <Link href="/login" className="text-emerald-500 hover:text-emerald-400 font-medium transition-colors">
                    Sign in
                  </Link>
                </p>
              )}
            </div>
          </motion.div>
        ) : null}
      </motion.div>
    </main>
  );
}
