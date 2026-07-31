"use client";

import React, { useState, useEffect } from "react";
import { Toggle } from '@/components/ui/inputs/toggle';
import { motion } from "framer-motion";
import { FiBell, FiClock, FiEye, FiCheck, FiInfo, FiVolume2, FiCpu, FiShield, FiCalendar } from "react-icons/fi";
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

export default function SettingsForm({ user }: SettingsFormProps) {
  const userKey = user?.email || user?.id || "guest";
  const storageKey = `md_settings_${userKey}`;

  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Load settings on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(saved) });
      }
    } catch (e) {
      console.error("Failed to load settings:", e);
    } finally {
      setIsLoaded(true);
    }
  }, [storageKey]);

  // Handle Save
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      localStorage.setItem(storageKey, JSON.stringify(settings));
      
      // Post-save micro-delay to simulate secure sync
      setTimeout(() => {
        setIsSaving(false);
        toast.success("Settings saved");
      }, 800);
    } catch (err) {
      setIsSaving(false);
      toast.error("Couldn't save settings. Try again.");
    }
  };

  const updateSetting = <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  if (!isLoaded) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
        <p className="text-sm text-text-muted">Loading your settings...</p>
      </div>
    );
  }

  return (
    <div className="px-4 py-8 max-w-4xl mx-auto space-y-8">
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-foreground mb-2 tracking-tight">Settings</h1>
        <p className="text-text-muted text-sm">
          Your personal preferences.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-8">
        
        {/* Notifications */}
        <div className="bg-card p-6 md:p-8 rounded-2xl border border-card-border space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-card-border">
            <div className="h-9 w-9 rounded-xl bg-[var(--pastel-blue)]/10 border border-[var(--pastel-blue)]/20 flex items-center justify-center text-[var(--pastel-blue)] shadow-sm shrink-0">
              <FiBell size={18} />
            </div>
            <div>
              <h2 className="text-sm font-black text-foreground uppercase tracking-wider">Communication & Notifications</h2>
              <p className="text-[10px] text-text-muted uppercase tracking-widest mt-0.5">Choose which alerts you receive</p>
            </div>
          </div>

          <div className="space-y-5">
            {/* Email Notifications */}
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground">Email notifications</label>
                <p className="text-xs text-text-muted">Get a daily summary by email</p>
              </div>
              <Toggle
                label="Email notifications"
                isChecked={settings.emailNotifications}
                onChange={(next) => updateSetting("emailNotifications", next)}
              />
            </div>

            {/* Push Notifications */}
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground">Push notifications</label>
                <p className="text-xs text-text-muted">Get alerts as things happen</p>
              </div>
              <Toggle
                label="Push notifications"
                isChecked={settings.pushNotifications}
                onChange={(next) => updateSetting("pushNotifications", next)}
              />
            </div>

            {/* Sound Effects */}
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground">Sound effects</label>
                <p className="text-xs text-text-muted">Play a sound when a task is completed</p>
              </div>
              <Toggle
                label="Sound effects"
                isChecked={settings.soundEffects}
                onChange={(next) => updateSetting("soundEffects", next)}
              />
            </div>
          </div>
        </div>

        {/* Focus timer */}
        <div className="bg-card p-6 md:p-8 rounded-2xl border border-card-border space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-card-border">
            <div className="h-9 w-9 rounded-xl bg-[var(--pastel-purple)]/10 border border-[var(--pastel-purple)]/20 flex items-center justify-center text-[var(--pastel-purple)] shadow-sm shrink-0">
              <FiClock size={18} />
            </div>
            <div>
              <h2 className="text-sm font-black text-foreground uppercase tracking-wider">Focus Timer</h2>
              <p className="text-[10px] text-text-muted uppercase tracking-widest mt-0.5">Set your work and break lengths</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-1">
                Focus session (minutes)
              </label>
              <input
                type="number"
                min={1}
                max={120}
                value={settings.pomodoroLength}
                onChange={(e) => updateSetting("pomodoroLength", Math.max(1, Number(e.target.value)))}
                className="w-full bg-foreground/[0.03] border border-card-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:bg-foreground/[0.06] transition-all font-bold"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-1">
                Short break (minutes)
              </label>
              <input
                type="number"
                min={1}
                max={30}
                value={settings.shortBreakLength}
                onChange={(e) => updateSetting("shortBreakLength", Math.max(1, Number(e.target.value)))}
                className="w-full bg-foreground/[0.03] border border-card-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:bg-foreground/[0.06] transition-all font-bold"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-1">
                Long break (minutes)
              </label>
              <input
                type="number"
                min={1}
                max={60}
                value={settings.longBreakLength}
                onChange={(e) => updateSetting("longBreakLength", Math.max(1, Number(e.target.value)))}
                className="w-full bg-foreground/[0.03] border border-card-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:bg-foreground/[0.06] transition-all font-bold"
              />
            </div>
          </div>
        </div>

        {/* Schedule & layout */}
        <div className="bg-card p-6 md:p-8 rounded-2xl border border-card-border space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-card-border">
            <div className="h-9 w-9 rounded-xl bg-[var(--pastel-amber)]/10 border border-[var(--pastel-amber)]/20 flex items-center justify-center text-[var(--pastel-amber)] shadow-sm shrink-0">
              <FiEye size={18} />
            </div>
            <div>
              <h2 className="text-sm font-black text-foreground uppercase tracking-wider">Schedule & Layout</h2>
              <p className="text-[10px] text-text-muted uppercase tracking-widest mt-0.5">Your regular working hours</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-1">
                Start time
              </label>
              <input
                type="time"
                value={settings.startHour}
                onChange={(e) => updateSetting("startHour", e.target.value)}
                className="w-full bg-foreground/[0.03] border border-card-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:bg-foreground/[0.06] transition-all font-bold cursor-pointer"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-1">
                End time
              </label>
              <input
                type="time"
                value={settings.endHour}
                onChange={(e) => updateSetting("endHour", e.target.value)}
                className="w-full bg-foreground/[0.03] border border-card-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:bg-foreground/[0.06] transition-all font-bold cursor-pointer"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-card-border flex items-center justify-between">
            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground">Compact layout</label>
              <p className="text-xs text-text-muted">Reduce padding and spacing throughout the app</p>
            </div>
            <Toggle
              label="Compact layout"
              isChecked={settings.compactLayout}
              onChange={(next) => updateSetting("compactLayout", next)}
            />
          </div>
        </div>

        {/* SAVE BUTTON */}
        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={isSaving}
            className="px-10 py-4 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-widest rounded-2xl transition-all shadow-lg hover:shadow-emerald-500/25 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSaving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Saving...
              </>
            ) : (
              <>
                <FiCheck size={16} />
                Save Changes
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
