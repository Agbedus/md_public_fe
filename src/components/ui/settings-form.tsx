"use client";

import React, { useState, useEffect } from "react";
import { Toggle } from '@/components/ui/inputs/toggle';
import { motion, useReducedMotion } from "framer-motion";
import { FiBell, FiClock, FiLayout, FiCheck, FiCloud } from "react-icons/fi";
import { toast } from "@/lib/toast";

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
}

const inputClass = "w-full px-3 py-2 rounded-lg bg-foreground/[0.03] border border-card-border text-foreground text-sm focus:outline-none focus:bg-foreground/[0.06] focus:border-emerald-500/40 transition-all font-numbers";
const labelClass = "block text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1.5 ml-0.5";

function SectionCard({
  icon,
  iconClass,
  title,
  subtitle,
  children,
}: {
  icon: React.ReactNode;
  iconClass: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="glass p-5 rounded-2xl border border-card-border space-y-5">
      <div className="flex items-center gap-3 pb-4 border-b border-card-border">
        <div className={`p-2 rounded-xl border shrink-0 ${iconClass}`}>
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
}: {
  label: string;
  description: string;
  isChecked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="space-y-0.5 min-w-0">
        <label className="text-sm font-medium text-foreground">{label}</label>
        <p className="text-xs text-text-muted">{description}</p>
      </div>
      <Toggle label={label} isChecked={isChecked} onChange={onChange} />
    </div>
  );
}

export default function SettingsForm({ user }: SettingsFormProps) {
  const userKey = user?.email || user?.id || "guest";
  const storageKey = `md_settings_${userKey}`;

  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [savedSettings, setSavedSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const reduceMotion = useReducedMotion();

  // Load settings on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const merged = { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
        setSettings(merged);
        setSavedSettings(merged);
      }
    } catch (e) {
      console.error("Failed to load settings:", e);
    } finally {
      setIsLoaded(true);
    }
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
    <div className="px-4 py-6 md:py-8 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Settings</h1>
          <p className="text-text-muted text-sm mt-0.5">Your personal preferences.</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-5">

        {/* Notifications */}
        <motion.div {...fadeUp}>
          <SectionCard
            icon={<FiBell size={16} />}
            iconClass="bg-[var(--pastel-blue)]/10 border-[var(--pastel-blue)]/20 text-[var(--pastel-blue)]"
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
            </div>
          </SectionCard>
        </motion.div>

        {/* Focus timer */}
        <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: reduceMotion ? 0 : 0.05 }}>
          <SectionCard
            icon={<FiClock size={16} />}
            iconClass="bg-[var(--pastel-purple)]/10 border-[var(--pastel-purple)]/20 text-[var(--pastel-purple)]"
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
            iconClass="bg-[var(--pastel-teal)]/10 border-[var(--pastel-teal)]/20 text-[var(--pastel-teal)]"
            title="Schedule & layout"
            subtitle="Your regular working hours"
          >
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Start time</label>
                  <input
                    type="time"
                    value={settings.startHour}
                    onChange={(e) => updateSetting("startHour", e.target.value)}
                    className={`${inputClass} cursor-pointer`}
                  />
                </div>
                <div>
                  <label className={labelClass}>End time</label>
                  <input
                    type="time"
                    value={settings.endHour}
                    onChange={(e) => updateSetting("endHour", e.target.value)}
                    className={`${inputClass} cursor-pointer`}
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
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
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
    </div>
  );
}
