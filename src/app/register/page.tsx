'use client';

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

export default async function RegisterPage(props: {
  searchParams?: Promise<{ invite?: string; org?: string }>;
}) {
  const params = await props.searchParams;
  const initialInvite = params?.invite ?? null;
  return (
    <main className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden bg-background isolate">
      <div className="absolute inset-0 pointer-events-none -z-10">
        <motion.div
          className="absolute top-[-25%] left-[-20%] w-[70%] h-[70%] rounded-full bg-emerald-500/[0.06] blur-[200px]"
          animate={{
            x: [0, 30, 0],
            y: [0, -20, 0],
          }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute bottom-[-25%] right-[-20%] w-[70%] h-[70%] rounded-full bg-indigo-500/[0.06] blur-[200px]"
          animate={{
            x: [0, -30, 0],
            y: [0, 20, 0],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[40%] h-[40%] rounded-full bg-emerald-500/[0.03] blur-[150px]"
          animate={{
            scale: [1, 1.08, 1],
            opacity: [0.4, 0.8, 0.4],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      <div className="absolute inset-0 opacity-[0.02] pointer-events-none -z-10 bg-[radial-gradient(ellipse_at_center,currentColor_0px,transparent_1px)] bg-[size:24px_24px] text-foreground" />

      <motion.div
        className="relative w-full max-w-md"
        variants={container as Variants}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={item as Variants} className="flex justify-center mb-10">
          <Link href="/" className="block group">
            <motion.div
              animate={{ y: [0, -3, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Image src="/logo.svg" alt="MD Logo" width={44} height={44} className="w-11 h-11" priority />
            </motion.div>
          </Link>
        </motion.div>

        <motion.div variants={item as Variants} className="text-center space-y-2 mb-8">
          <h1 className="text-2xl font-semibold text-foreground font-sora tracking-tight">Create your account</h1>
          <p className="text-sm text-text-muted">Set up your organization to get started</p>
        </motion.div>

        <motion.div variants={item as Variants}>
          <RegisterForm initialInviteCode={initialInvite} />
        </motion.div>
      </motion.div>
    </main>
  );
}
