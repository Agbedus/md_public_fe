"use client";

import React, { useState, useEffect } from "react";
import { FiX, FiMessageSquare } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import { useOrgPath } from "@/hooks/use-org-path";

const DISMISSED_KEY = "md_sms_feature_banner_dismissed";

/**
 * Self-expiring — this announces one specific release (SMS notifications,
 * shipped 2026-08-25) and stops being relevant once it's had a fair run. Past
 * this date the component renders nothing, on every account, with no code
 * change needed to retire it.
 */
const BANNER_EXPIRES_AT = "2026-09-25T00:00:00Z";

export function SmsFeatureBanner({ userKey }: { userKey?: string | null }) {
  const [isVisible, setIsVisible] = useState(false);
  const { path: orgPath } = useOrgPath();

  useEffect(() => {
    if (Date.now() > Date.parse(BANNER_EXPIRES_AT)) return;
    if (localStorage.getItem(DISMISSED_KEY)) return;

    // Give the onboarding tour room to run first — it uses the same
    // `md_onboarding_<userKey>` key (set in OnboardingTour) once it's
    // finished, skipped, or was never relevant for this account. Two
    // popups competing for attention in someone's first few seconds reads
    // as cluttered, so a brand-new account (no onboarding flag yet) waits
    // longer; everyone else gets the normal short delay.
    const onboardingPending = Boolean(userKey) && !localStorage.getItem(`md_onboarding_${userKey}`);
    const timer = setTimeout(() => setIsVisible(true), onboardingPending ? 9000 : 1200);
    return () => clearTimeout(timer);
  }, [userKey]);

  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, "1");
    setIsVisible(false);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-6 left-6 right-6 md:left-8 md:right-auto md:w-[400px] z-40"
        >
          <div className="glass bg-background/80 backdrop-blur-2xl border border-card-border rounded-3xl p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 shrink-0">
                  <FiMessageSquare className="text-emerald-400 text-lg" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-semibold text-foreground tracking-tight">SMS notifications</h3>
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-500 text-[9px] font-black uppercase tracking-widest">New</span>
                  </div>
                  <p className="text-xs text-text-muted">Now available for your account</p>
                </div>
              </div>
              <button
                onClick={dismiss}
                className="p-2 hover:bg-foreground/[0.05] rounded-full text-text-secondary hover:text-foreground transition-colors shrink-0"
                aria-label="Dismiss"
              >
                <FiX />
              </button>
            </div>

            <p className="text-sm text-text-secondary leading-relaxed">
              Get a text for sign-in codes, time-off decisions, and critical announcements.
              Turn it on in <span className="text-foreground font-medium">Settings → My settings → Notifications</span> — your organization also needs SMS switched on for it to actually send.
            </p>

            <div className="flex items-center gap-3">
              <a
                href={orgPath("/settings")}
                onClick={dismiss}
                className="flex-1 bg-foreground text-background px-5 py-2.5 rounded-2xl text-xs font-bold hover:bg-foreground/90 transition-all flex items-center justify-center gap-2 active:scale-95"
              >
                Open Settings
              </a>
              <button
                onClick={dismiss}
                className="px-5 py-2.5 rounded-2xl text-xs font-bold text-text-muted hover:bg-foreground/[0.05] transition-all border border-transparent hover:border-card-border"
              >
                Not now
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
