"use client";

import React, { useState, useEffect } from "react";
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
        toast.success("Operational configuration successfully synchronized.");
      }, 800);
    } catch (err) {
      setIsSaving(false);
      toast.error("Failed to synchronize configurations.");
    }
  };

  const updateSetting = <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  if (!isLoaded) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
        <p className="text-xs text-text-muted font-black uppercase tracking-widest">Decrypting preferences...</p>
      </div>
    );
  }

  return (
    <div className="px-4 py-8 max-w-4xl mx-auto space-y-8">
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-foreground mb-2 tracking-tight">Configuration Settings</h1>
        <p className="text-(--text-muted) text-xs lg:text-sm font-bold uppercase tracking-widest">
          Personalized operational metrics for {user?.name || "Personnel"}
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-8">
        
        {/* SECTION 1: COMMUNICATION PROTOCOL */}
        <div className="glass p-6 md:p-8 rounded-3xl border border-card-border space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-card-border">
            <div className="h-9 w-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500 shadow-sm shrink-0">
              <FiBell size={18} />
            </div>
            <div>
              <h2 className="text-sm font-black text-foreground uppercase tracking-wider">Communication & Notifications</h2>
              <p className="text-[10px] text-text-muted uppercase tracking-widest mt-0.5">Control system alerts and broadcasts</p>
            </div>
          </div>

          <div className="space-y-5">
            {/* Email Notifications */}
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <label className="text-xs font-bold text-foreground uppercase tracking-tight">Email Notifications</label>
                <p className="text-[10px] text-text-muted uppercase tracking-widest">Receive daily tactical digests and activity summaries</p>
              </div>
              <button
                type="button"
                onClick={() => updateSetting("emailNotifications", !settings.emailNotifications)}
                className={`relative w-11 h-6 rounded-full transition-all duration-300 border ${
                  settings.emailNotifications ? "bg-emerald-500/20 border-emerald-500/50" : "bg-input-bg border-card-border"
                }`}
              >
                <div
                  className={`absolute top-0.5 w-4 h-4 rounded-full transition-all duration-300 ${
                    settings.emailNotifications ? "right-1 bg-emerald-500" : "left-1 bg-text-muted"
                  }`}
                />
              </button>
            </div>

            {/* Push Notifications */}
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <label className="text-xs font-bold text-foreground uppercase tracking-tight">Push Broadcasts</label>
                <p className="text-[10px] text-text-muted uppercase tracking-widest">Enable immediate operational alerts in real-time</p>
              </div>
              <button
                type="button"
                onClick={() => updateSetting("pushNotifications", !settings.pushNotifications)}
                className={`relative w-11 h-6 rounded-full transition-all duration-300 border ${
                  settings.pushNotifications ? "bg-emerald-500/20 border-emerald-500/50" : "bg-input-bg border-card-border"
                }`}
              >
                <div
                  className={`absolute top-0.5 w-4 h-4 rounded-full transition-all duration-300 ${
                    settings.pushNotifications ? "right-1 bg-emerald-500" : "left-1 bg-text-muted"
                  }`}
                />
              </button>
            </div>

            {/* Sound Effects */}
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <label className="text-xs font-bold text-foreground uppercase tracking-tight">Audio Signals</label>
                <p className="text-[10px] text-text-muted uppercase tracking-widest">Play subtle sound updates on task completions</p>
              </div>
              <button
                type="button"
                onClick={() => updateSetting("soundEffects", !settings.soundEffects)}
                className={`relative w-11 h-6 rounded-full transition-all duration-300 border ${
                  settings.soundEffects ? "bg-emerald-500/20 border-emerald-500/50" : "bg-input-bg border-card-border"
                }`}
              >
                <div
                  className={`absolute top-0.5 w-4 h-4 rounded-full transition-all duration-300 ${
                    settings.soundEffects ? "right-1 bg-emerald-500" : "left-1 bg-text-muted"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* SECTION 2: TACTICAL TIMER */}
        <div className="glass p-6 md:p-8 rounded-3xl border border-card-border space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-card-border">
            <div className="h-9 w-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-500 shadow-sm shrink-0">
              <FiClock size={18} />
            </div>
            <div>
              <h2 className="text-sm font-black text-foreground uppercase tracking-wider">Tactical Focus Engine</h2>
              <p className="text-[10px] text-text-muted uppercase tracking-widest mt-0.5">Define intervals for focus mode sessions</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-1">
                Focus Session (Mins)
              </label>
              <input
                type="number"
                min={1}
                max={120}
                value={settings.pomodoroLength}
                onChange={(e) => updateSetting("pomodoroLength", Math.max(1, Number(e.target.value)))}
                className="w-full bg-input-bg border border-card-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all font-bold"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-1">
                Short Break (Mins)
              </label>
              <input
                type="number"
                min={1}
                max={30}
                value={settings.shortBreakLength}
                onChange={(e) => updateSetting("shortBreakLength", Math.max(1, Number(e.target.value)))}
                className="w-full bg-input-bg border border-card-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all font-bold"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-1">
                Long Break (Mins)
              </label>
              <input
                type="number"
                min={1}
                max={60}
                value={settings.longBreakLength}
                onChange={(e) => updateSetting("longBreakLength", Math.max(1, Number(e.target.value)))}
                className="w-full bg-input-bg border border-card-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all font-bold"
              />
            </div>
          </div>
        </div>

        {/* SECTION 3: OPERATIONS & VISUAL LAYOUT */}
        <div className="glass p-6 md:p-8 rounded-3xl border border-card-border space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-card-border">
            <div className="h-9 w-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shadow-sm shrink-0">
              <FiEye size={18} />
            </div>
            <div>
              <h2 className="text-sm font-black text-foreground uppercase tracking-wider">Operations & Display</h2>
              <p className="text-[10px] text-text-muted uppercase tracking-widest mt-0.5">Align schedules and workspace viewports</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-1">
                Shift Start Coordinates
              </label>
              <input
                type="time"
                value={settings.startHour}
                onChange={(e) => updateSetting("startHour", e.target.value)}
                className="w-full bg-input-bg border border-card-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all font-bold cursor-pointer"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-1">
                Shift End Coordinates
              </label>
              <input
                type="time"
                value={settings.endHour}
                onChange={(e) => updateSetting("endHour", e.target.value)}
                className="w-full bg-input-bg border border-card-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all font-bold cursor-pointer"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-card-border flex items-center justify-between">
            <div className="space-y-1">
              <label className="text-xs font-bold text-foreground uppercase tracking-tight">Compact Interface</label>
              <p className="text-[10px] text-text-muted uppercase tracking-widest">Condense padding and headers across workspaces</p>
            </div>
            <button
              type="button"
              onClick={() => updateSetting("compactLayout", !settings.compactLayout)}
              className={`relative w-11 h-6 rounded-full transition-all duration-300 border ${
                settings.compactLayout ? "bg-emerald-500/20 border-emerald-500/50" : "bg-input-bg border-card-border"
              }`}
            >
              <div
                className={`absolute top-0.5 w-4 h-4 rounded-full transition-all duration-300 ${
                  settings.compactLayout ? "right-1 bg-emerald-500" : "left-1 bg-text-muted"
                }`}
              />
            </button>
          </div>
        </div>

        {/* SAVE BUTTON */}
        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={isSaving}
            className="px-10 py-4 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black uppercase tracking-widest rounded-2xl transition-all shadow-lg hover:shadow-indigo-500/25 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSaving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Synchronizing...
              </>
            ) : (
              <>
                <FiCheck size={16} />
                Synchronize Configuration
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
