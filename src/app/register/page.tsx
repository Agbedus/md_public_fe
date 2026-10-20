'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import RegisterForm from '@/components/ui/register-form';
import Link from 'next/link';
import Image from 'next/image';
import { motion, type Variants } from 'framer-motion';

const container = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
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

// This is a Client Component (it uses framer-motion), so it cannot be `async`
// and `searchParams` is not a promise here. Query params are read client-side
// with `useSearchParams`, which Next requires to sit under a Suspense boundary
// (see the default export below).
function RegisterView() {
  const searchParams = useSearchParams();
  const initialInvite = searchParams.get('invite');
  const referralCode = searchParams.get('ref');
  const shareClickId = searchParams.get('click');
  const invitedEmail = searchParams.get('email');
  const invitationToken = searchParams.get('token');
  return (
    <main className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden bg-background isolate">

      <motion.div
        className="relative w-full max-w-md"
        variants={container as Variants}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={item as Variants} className="flex justify-center mb-10">
          <Link href="/" className="block group">
            <motion.div
            >
              <Image src="/logo.svg" alt="MyndDesk" width={44} height={44} className="w-11 h-11" priority />
            </motion.div>
          </Link>
        </motion.div>

        <motion.div variants={item as Variants} className="text-center space-y-2 mb-8">
          <h1 className="text-2xl font-semibold text-foreground font-sora tracking-tight">Create your account</h1>
          <p className="text-sm text-text-muted">Set up your organization to get started</p>
        </motion.div>

        <motion.div variants={item as Variants}>
          <RegisterForm
            initialInviteCode={initialInvite}
            initialReferralCode={referralCode}
            initialShareClickId={shareClickId}
            initialEmail={invitedEmail}
            initialInvitationToken={invitationToken}
          />
        </motion.div>
      </motion.div>
    </main>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterView />
    </Suspense>
  );
}
