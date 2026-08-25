"use client";

import React, { useState, useEffect } from "react";
import { Toggle } from '@/components/ui/inputs/toggle';
import { CustomTimePicker } from '@/components/ui/inputs/custom-time-picker';
import { motion, useReducedMotion } from "framer-motion";
import { FiBell, FiClock, FiLayout, FiCheck, FiCloud, FiMessageSquare } from "react-icons/fi";
import { toast } from "@/lib/toast";
import Link from "next/link";
import { updateMySmsPreference } from "@/app/(dashboard)/[orgSlug]/settings/actions";
import { useOrgPath } from "@/hooks/use-org-path";

interface UserSettings {
  emailNotifications: boolean;
  pushNotifications: boolean;
  soundEffects: boolean;
  pomodoroLength: number;
  shortBreakLength: number;
  longBreakLength: number;
  compactLayout: boolean;
  startHour: string;
  endHour: string;
}

const DEFAULT_SETTINGS: UserSettings = {
  emailNotifications: true,
  pushNotifications: true,
  soundEffects: false,
  pomodoroLength: 25,
  shortBreakLength: 5,
  longBreakLength: 15,
  compactLayout: false,
  startHour: "09:00",
  endHour: "17:00",
};

interface SettingsFormProps {
  user?: {
    id?: string | null;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    roles?: string[];
  };
  phone: string | null;
  initialSmsEnabled: boolean;
}

const inputClass = "w-full px-3 py-2 rounded-lg bg-foreground/[0.03] border border-card-border text-foreground text-sm focus:outline-none focus:bg-foreground/[0.06] focus:border-emerald-500/40 transition-all font-numbers";
const labelClass = "block text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1.5 ml-0.5";

/** Neutral icon chip — dark/gray with a plain foreground-colored icon, no
 *  per-section color coding. Rolling out site-wide later; this page first. */
const iconChipClass = "bg-foreground/[0.06] border-card-border text-foreground";

function SectionCard({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="glass p-5 rounded-2xl border border-card-border space-y-5">
      <div className="flex items-center gap-3 pb-4 border-b border-card-border">
        <div className={`p-2 rounded-xl border shrink-0 ${iconChipClass}`}>
          {icon}
        </div>
        <div className="min-w-0">
          <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">{title}</h2>
          <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest mt-0.5">{subtitle}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

function SettingRow({
  label,
  description,
  isChecked,
  onChange,
  isDisabled,
}: {
  label: string;
  description: string;
  isChecked: boolean;
  onChange: (next: boolean) => void;
  isDisabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="space-y-0.5 min-w-0">
        <label className="text-sm font-medium text-foreground">{label}</label>
        <p className="text-xs text-text-muted">{description}</p>
      </div>
      <Toggle label={label} isChecked={isChecked} onChange={onChange} isDisabled={isDisabled} />
    </div>
  );
}

export default function SettingsForm({ user, phone, initialSmsEnabled }: SettingsFormProps) {
  const { path: orgPath } = useOrgPath();
  const userKey = user?.email || user?.id || "guest";
  const storageKey = `md_settings_${userKey}`;

  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [savedSettings, setSavedSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const reduceMotion = useReducedMotion();

  // SMS is real, backend-persisted state — separate from the localStorage
  // settings above, and saved immediately on toggle rather than batched
  // behind the "Save changes" button.
  const [smsEnabled, setSmsEnabled] = useState(initialSmsEnabled);
  const [isSmsSaving, setIsSmsSaving] = useState(false);

  // Load settings on mount
  useEffect(() => {
    let frame: number | undefined;
    try {
      const saved = localStorage.getItem(storageKey);
      const merged = saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
      frame = window.requestAnimationFrame(() => {
        setSettings(merged);
        setSavedSettings(merged);
        setIsLoaded(true);
      });
    } catch (e) {
      console.error("Failed to load settings:", e);
      frame = window.requestAnimationFrame(() => setIsLoaded(true));
    }
    return () => {
      if (frame !== undefined) window.cancelAnimationFrame(frame);
    };
  }, [storageKey]);

  const isDirty = JSON.stringify(settings) !== JSON.stringify(savedSettings);

  // Handle Save
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isDirty || isSaving) return;
    setIsSaving(true);

    try {
      localStorage.setItem(storageKey, JSON.stringify(settings));

      setTimeout(() => {
        setIsSaving(false);
        setSavedSettings(settings);
        toast.success("Settings saved");
      }, 500);
    } catch {
      setIsSaving(false);
      toast.error("Couldn't save settings. Try again.");
    }
  };

  const updateSetting = <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSmsToggle = async (next: boolean) => {
    const previous = smsEnabled;
    setSmsEnabled(next);
    setIsSmsSaving(true);
    try {
      const result = await updateMySmsPreference(next);
      if (!result.success) {
        setSmsEnabled(previous);
        toast.error(result.error || "Couldn't update SMS notifications.");
        return;
      }
      toast.success(next ? "SMS notifications on" : "SMS notifications off");
    } catch {
      setSmsEnabled(previous);
      toast.error("Couldn't update SMS notifications.");
    } finally {
      setIsSmsSaving(false);
    }
  };

  const fadeUp = reduceMotion
    ? {}
    : {
        initial: { opacity: 0, y: 10 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] as const },
      };

  if (!isLoaded) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-500"></div>
        <p className="text-xs text-text-muted">Loading your settings...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-5">

      {/* Notifications */}
      <motion.div {...fadeUp}>
        <SectionCard
          icon={<FiBell size={16} />}
          title="Notifications"
          subtitle="Choose which alerts you receive"
        >
          <div className="space-y-4">
            <SettingRow
              label="Email notifications"
              description="Get a daily summary by email"
              isChecked={settings.emailNotifications}
              onChange={(next) => updateSetting("emailNotifications", next)}
            />
            <SettingRow
              label="Push notifications"
              description="Get alerts as things happen"
              isChecked={settings.pushNotifications}
              onChange={(next) => updateSetting("pushNotifications", next)}
            />
            <SettingRow
              label="Sound effects"
              description="Play a sound when a task is completed"
              isChecked={settings.soundEffects}
              onChange={(next) => updateSetting("soundEffects", next)}
            />
            <div className="pt-4 border-t border-card-border space-y-3">
              <SettingRow
                label="SMS notifications"
                description="Text alerts for time-off decisions and sign-in codes — nothing else, for now"
                isChecked={smsEnabled}
                onChange={handleSmsToggle}
                isDisabled={isSmsSaving}
              />
              <div className="flex items-start gap-2 text-xs text-text-muted bg-foreground/[0.03] border border-card-border rounded-xl px-3 py-2.5 leading-relaxed">
                <FiMessageSquare className="shrink-0 mt-0.5" size={13} />
                {phone ? (
                  <span>Sent to <span className="text-foreground font-medium">{phone}</span>. Wrong number? <Link href={orgPath("/profile")} className="text-[var(--pastel-blue)] hover:underline">Update it on your profile</Link>.</span>
                ) : (
                  <span>You don&apos;t have a phone number on file yet. <Link href={orgPath("/profile")} className="text-[var(--pastel-blue)] hover:underline">Add one</Link> before turning this on.</span>
                )}
              </div>
            </div>
          </div>
        </SectionCard>
      </motion.div>

      {/* Focus timer */}
      <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: reduceMotion ? 0 : 0.05 }}>
        <SectionCard
          icon={<FiClock size={16} />}
          title="Focus timer"
          subtitle="Set your work and break lengths"
        >
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelClass}>Focus (min)</label>
              <input
                type="number"
                min={1}
                max={120}
                value={settings.pomodoroLength}
                onChange={(e) => updateSetting("pomodoroLength", Math.max(1, Number(e.target.value)))}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Short break</label>
              <input
                type="number"
                min={1}
                max={30}
                value={settings.shortBreakLength}
                onChange={(e) => updateSetting("shortBreakLength", Math.max(1, Number(e.target.value)))}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Long break</label>
              <input
                type="number"
                min={1}
                max={60}
                value={settings.longBreakLength}
                onChange={(e) => updateSetting("longBreakLength", Math.max(1, Number(e.target.value)))}
                className={inputClass}
              />
            </div>
          </div>
        </SectionCard>
      </motion.div>

      {/* Schedule & layout */}
      <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: reduceMotion ? 0 : 0.1 }}>
        <SectionCard
          icon={<FiLayout size={16} />}
          title="Schedule & layout"
          subtitle="Your regular working hours"
        >
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Start time</label>
                <CustomTimePicker
                  value={settings.startHour}
                  onChange={(val) => updateSetting("startHour", val)}
                  placeholder="Start time"
                />
              </div>
              <div>
                <label className={labelClass}>End time</label>
                <CustomTimePicker
                  value={settings.endHour}
                  onChange={(val) => updateSetting("endHour", val)}
                  placeholder="End time"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-card-border">
              <SettingRow
                label="Compact layout"
                description="Reduce padding and spacing throughout the app"
                isChecked={settings.compactLayout}
                onChange={(next) => updateSetting("compactLayout", next)}
              />
            </div>
          </div>
        </SectionCard>
      </motion.div>

      {/* SAVE BAR */}
      <div className="flex items-center justify-between gap-4 pt-1">
        <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-text-muted">
          <FiCloud size={12} className={isDirty ? "text-amber-500" : "text-emerald-500"} />
          {isDirty ? "Unsaved changes" : "All changes saved"}
        </span>
        <button
          type="submit"
          disabled={isSaving || !isDirty}
          aria-busy={isSaving}
          className="flex min-h-11 items-center gap-2 px-5 py-2.5 rounded-md text-sm font-medium text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 transition-[transform,opacity,background-color] duration-150 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isSaving ? (
            <>
              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-emerald-500"></div>
              Saving...
            </>
          ) : (
            <>
              <FiCheck size={13} />
              Save changes
            </>
          )}
        </button>
      </div>
    </form>
  );
}
