'use client';

import { useEffect, useRef, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { motion, type Variants } from 'framer-motion';
import { FiLoader, FiCheckCircle, FiAlertCircle, FiArrowRight, FiUsers, FiLink } from 'react-icons/fi';
import { toast } from '@/lib/toast';
import { acceptOrganizationInvitation, joinOrganizationByInvite } from '@/lib/org-actions';

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

interface InvitationPreview {
  email: string;
  account_exists: boolean;
  already_member: boolean;
  invitation_status: 'pending' | 'accepted';
  organization: OrgInfo;
}

export default function InvitePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const code = searchParams.get('code');
  const orgId = searchParams.get('org');
  const token = searchParams.get('token');
  const hasInvitation = Boolean(code || token);

  const [orgInfo, setOrgInfo] = useState<OrgInfo | null>(null);
  const [loading, setLoading] = useState(hasInvitation);
  const [error, setError] = useState<string | null>(
    hasInvitation ? null : 'No invitation was provided. Please check the link and try again.',
  );
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [sessionEmail, setSessionEmail] = useState('');
  const [preview, setPreview] = useState<InvitationPreview | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const autoJoinStarted = useRef(false);

  const inviteQuery = new URLSearchParams();
  if (code) inviteQuery.set('code', code);
  if (orgId) inviteQuery.set('org', orgId);
  if (token) inviteQuery.set('token', token);
  const invitePath = `/invite?${inviteQuery.toString()}`;
  const invitedEmail = preview?.email || '';
  const isCorrectAccount = !invitedEmail || sessionEmail.toLowerCase() === invitedEmail.toLowerCase();
  const loginParams = new URLSearchParams({
    email: invitedEmail,
    callbackUrl: invitePath,
  });
  if (orgInfo?.name) loginParams.set('organizationName', orgInfo.name);
  if (token) loginParams.set('invitationToken', token);
  const loginHref = `/login?${loginParams.toString()}`;
  const switchAccountHref = `/logout?next=${encodeURIComponent(loginHref)}`;
  const shouldRouteToLogin = Boolean(token && preview?.account_exists && authChecked && !isLoggedIn);
  const shouldAutoAccept = Boolean(
    authChecked && isLoggedIn && isCorrectAccount && orgInfo && !error,
  );

  useEffect(() => {
    fetch('/api/auth/session')
      .then(r => r.json())
      .then(session => {
        setIsLoggedIn(!!session?.user?.id);
        setSessionEmail(session?.user?.email || '');
        setAuthChecked(true);
      })
      .catch(() => {
        setAuthChecked(true);
      });
  }, []);

  useEffect(() => {
    if (!code && !token) return;

    const fetchOrg = async () => {
      try {
        const endpoint = token
          ? `${API_BASE_URL}/invitations/preview/${encodeURIComponent(token)}`
          : `${API_BASE_URL}/organizations/by-invite/${encodeURIComponent(code || '')}`;
        const res = await fetch(endpoint, { cache: 'no-store' });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.detail || 'Invalid or expired invite code');
        }
        const data = await res.json();
        if (token) {
          setPreview(data);
          setOrgInfo(data.organization);
        } else {
          setOrgInfo(data);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to verify invite code');
      } finally {
        setLoading(false);
      }
    };

    fetchOrg();
  }, [code, token]);

  useEffect(() => {
    if (!shouldRouteToLogin) return;
    router.replace(loginHref);
  }, [loginHref, router, shouldRouteToLogin]);

  useEffect(() => {
    if (loading || !shouldAutoAccept || !orgInfo || autoJoinStarted.current) return;
    autoJoinStarted.current = true;
    const accept = async () => {
      const result = token ? await acceptOrganizationInvitation(token) : await joinOrganizationByInvite(code || '');
      if (result.success) {
        toast.success(preview?.already_member || preview?.invitation_status === 'accepted'
          ? `${orgInfo.name} is ready.`
          : `You have joined ${orgInfo.name}!`);
        const destinationSlug = 'slug' in result ? result.slug : undefined;
        router.replace(destinationSlug ? `/${destinationSlug}/dashboard` : '/dashboard');
        router.refresh();
      } else {
        const message = result.error || 'Failed to join organization';
        setError(message);
        toast.error(message);
      }
    };
    void accept();
  }, [code, loading, orgInfo, preview?.already_member, preview?.invitation_status, router, shouldAutoAccept, token]);

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
            <Image src="/logo.svg" alt="MyndDesk" width={44} height={44} className="w-11 h-11" priority />
          </Link>
        </motion.div>

        {loading || !authChecked || shouldRouteToLogin || shouldAutoAccept ? (
          <motion.div variants={item as Variants} className="flex flex-col items-center gap-4 py-12">
            <FiLoader className="w-8 h-8 text-indigo-400 animate-spin" />
            <p className="text-sm text-text-muted">
              {shouldRouteToLogin
                ? `Preparing sign in for ${orgInfo?.name || 'your new workspace'}…`
                : shouldAutoAccept
                  ? `Opening ${orgInfo?.name || 'your new workspace'}…`
                  : 'Checking your invitation…'}
            </p>
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
              <h1 className="text-2xl font-semibold text-foreground">
                {preview?.invitation_status === 'accepted' ? 'Invitation accepted' : 'You’re invited'}
              </h1>
              <p className="text-sm text-text-muted">
                Join <span className="font-semibold text-foreground">{orgInfo.name}</span> on MyndDesk
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
              {code && <div className="px-4 py-3 flex items-center gap-3">
                <FiLink className="w-4 h-4 text-text-muted flex-shrink-0" />
                <span className="text-sm font-mono tracking-wider text-indigo-400">{code}</span>
              </div>}
            </div>

            <div className="space-y-3 pt-2">
              {isLoggedIn && !isCorrectAccount ? (
                <div className="space-y-3">
                  <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-left text-sm text-amber-700 dark:text-amber-300">
                    <FiAlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>This invitation belongs to <strong>{invitedEmail}</strong>. You’re currently signed in as {sessionEmail}.</span>
                  </div>
                  <Link href={switchAccountHref} className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500">
                    Sign in as {invitedEmail}<FiArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              ) : token ? (
                <Link
                  href={`/register?invite=${encodeURIComponent(code || '')}&org=${encodeURIComponent(orgId || '')}&token=${encodeURIComponent(token)}&email=${encodeURIComponent(invitedEmail)}`}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500"
                >
                  Create account and join<FiArrowRight className="h-4 w-4" />
                </Link>
              ) : (
                <div className="space-y-2">
                  <Link href={loginHref} className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500">Sign in to join<FiArrowRight className="h-4 w-4" /></Link>
                  <Link href={`/register?invite=${encodeURIComponent(code || '')}`} className="block w-full rounded-xl px-4 py-2 text-center text-sm font-medium text-text-muted transition hover:bg-foreground/[0.05] hover:text-foreground">Create a new account</Link>
                </div>
              )}
              {!isLoggedIn && token && !preview?.account_exists && (
                <p className="text-xs text-text-muted">
                  Already have an account?{' '}
                  <Link href={loginHref} className="text-emerald-500 hover:text-emerald-400 font-medium transition-colors">
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
