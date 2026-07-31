'use client';

import React, { type ReactNode } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, useReducedMotion } from 'framer-motion';
import { FiArrowLeft, FiArrowRight, FiExternalLink } from 'react-icons/fi';

export interface LegalSection {
  id: string;
  index: string;
  icon: ReactNode;
  title: string;
  children: ReactNode;
}

export interface LegalDocumentProps {
  eyebrow: string;
  title: ReactNode;
  subtitle: string;
  lastUpdated: string;
  meta: string[];
  highlight: { icon: ReactNode; title: string; body: string };
  sections: LegalSection[];
  closing: { title: string; body: string; email: string };
  siblingHref: string;
  siblingLabel: string;
}

export function LegalDocument({
  eyebrow,
  title,
  subtitle,
  lastUpdated,
  meta,
  highlight,
  sections,
  closing,
  siblingHref,
  siblingLabel,
}: LegalDocumentProps) {
  const reduceMotion = useReducedMotion();

  const fadeIn = reduceMotion
    ? { initial: false as const, animate: { opacity: 1, y: 0 } }
    : { initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.5, ease: [0.23, 1, 0.32, 1] as const } };

  const revealOnScroll = reduceMotion
    ? {}
    : {
        initial: { opacity: 0, y: 18 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true, amount: 0.2 },
        transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const },
      };

  return (
    <div className="min-h-screen bg-[#090a0c] text-white selection:bg-emerald-500/30 overflow-x-hidden">
      <div
        className="absolute top-0 inset-x-0 h-[80rem] pointer-events-none -z-10"
        style={{
          backgroundImage:
            'radial-gradient(circle at 30% 0%, rgba(16, 185, 129, 0.06) 0%, rgba(16, 185, 129, 0.01) 50%, transparent 60%), radial-gradient(circle at 70% 10%, rgba(99, 102, 241, 0.04) 0%, transparent 50%)',
        }}
      />
      <div className="absolute top-0 inset-x-0 h-[64rem] opacity-[0.02] pointer-events-none -z-10 bg-[linear-gradient(to_right,rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[size:4rem_4rem]" />

      {/* Navigation */}
      <nav className="fixed top-0 inset-x-0 z-50 px-6 pt-6">
        <div className="max-w-5xl mx-auto rounded-full bg-[#13161b]/70 backdrop-blur-xl border border-white/[0.07] px-6 py-3 flex items-center justify-between shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] shadow-lg shadow-black/20">
          <Link href="/" className="flex items-center gap-3">
            <Image src="/mynd_desk_logo_dark.png" alt="MyndDesk" width={1020} height={323} className="h-7 w-auto" priority />
          </Link>
          <div className="flex items-center gap-3 font-dm-sans text-xs font-semibold">
            <Link
              href={siblingHref}
              className="hidden sm:inline text-zinc-400 hover:text-white transition-colors"
            >
              {siblingLabel}
            </Link>
            <Link
              href="/"
              className="flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 text-zinc-400 hover:text-white hover:border-white/20 hover:bg-white/[0.05] transition-all duration-300"
            >
              <FiArrowLeft className="text-xs" /> Back to home
            </Link>
          </div>
        </div>
      </nav>

      <main className="pt-40 md:pt-48 pb-24 px-6">
        <div className="max-w-4xl mx-auto space-y-16">
          {/* Header */}
          <motion.div {...fadeIn} className="space-y-6 border-b border-white/[0.06] pb-14">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-zinc-300 text-[10px] font-bold uppercase tracking-widest font-sora">
              {eyebrow}
            </span>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-[1.08] text-white font-sora">{title}</h1>
            <p className="text-zinc-400 text-lg max-w-2xl leading-relaxed font-dm-sans">{subtitle}</p>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-2 text-[11px] font-semibold uppercase tracking-widest text-zinc-500 font-sora">
              <span>Last updated: {lastUpdated}</span>
              {meta.map((m) => (
                <span key={m}>{m}</span>
              ))}
            </div>
          </motion.div>

          {/* TL;DR */}
          <motion.div
            {...revealOnScroll}
            className="rounded-3xl border border-emerald-500/15 bg-emerald-500/[0.04] p-8 flex flex-col sm:flex-row gap-5"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
              {highlight.icon}
            </div>
            <div className="space-y-1.5">
              <h3 className="font-bold text-white font-sora text-sm uppercase tracking-wide">{highlight.title}</h3>
              <p className="text-sm text-zinc-400 leading-relaxed font-dm-sans">{highlight.body}</p>
            </div>
          </motion.div>

          {/* Table of contents */}
          <motion.nav {...revealOnScroll} aria-label="Table of contents" className="rounded-3xl border border-white/[0.06] bg-white/[0.015] p-6 sm:p-8">
            <h2 className="text-[11px] font-bold uppercase tracking-widest text-zinc-500 font-sora mb-4">On this page</h2>
            <ol className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
              {sections.map((s) => (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    className="flex items-center gap-2 text-sm text-zinc-400 hover:text-emerald-300 transition-colors py-1 font-dm-sans"
                  >
                    <span className="text-zinc-600 font-sora text-xs w-5 shrink-0">{s.index}</span>
                    {s.title}
                  </a>
                </li>
              ))}
            </ol>
          </motion.nav>

          {/* Sections */}
          <div className="space-y-16">
            {sections.map((s) => (
              <motion.section key={s.id} id={s.id} {...revealOnScroll} className="space-y-6 scroll-mt-32">
                <div className="flex items-start gap-5">
                  <span className="text-3xl font-black text-white/10 font-sora shrink-0 leading-none pt-1">{s.index}</span>
                  <div className="space-y-4 min-w-0 flex-1">
                    <div className="flex items-center gap-3">
                      <span className="text-zinc-500 shrink-0">{s.icon}</span>
                      <h2 className="text-2xl font-bold text-white font-sora tracking-tight">{s.title}</h2>
                    </div>
                    <div className="space-y-4 text-sm text-zinc-400 leading-relaxed font-dm-sans [&_strong]:text-zinc-200 [&_strong]:font-semibold [&_a]:text-emerald-400 [&_a]:hover:underline">
                      {s.children}
                    </div>
                  </div>
                </div>
              </motion.section>
            ))}
          </div>

          {/* Closing / contact */}
          <motion.div {...revealOnScroll} className="rounded-3xl border border-white/[0.06] bg-white/[0.02] p-10 sm:p-12 text-center space-y-5">
            <h2 className="text-2xl font-bold text-white font-sora">{closing.title}</h2>
            <p className="text-zinc-400 max-w-xl mx-auto leading-relaxed font-dm-sans text-sm">{closing.body}</p>
            <Link
              href={`mailto:${closing.email}`}
              className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 font-semibold font-sora transition-colors"
            >
              {closing.email} <FiExternalLink className="text-sm" />
            </Link>
          </motion.div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-white/[0.06] text-xs text-zinc-600 font-sora">
            <span>© 2026 MyndDesk. All rights reserved.</span>
            <Link href={siblingHref} className="inline-flex items-center gap-1.5 text-zinc-500 hover:text-emerald-300 transition-colors">
              {siblingLabel} <FiArrowRight className="text-xs" />
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
