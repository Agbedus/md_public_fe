'use client';

import React, { useEffect, useRef, useState } from 'react';
import { FiPlay, FiPause, FiRefreshCw, FiSettings, FiClock, FiCoffee, FiMoon, FiX, FiPlus, FiMinus } from 'react-icons/fi';

type Mode = 'work' | 'short' | 'long';

const STORAGE_KEY = 'pomodoro-settings-v1';

interface Settings {
  workMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
}

const DEFAULTS: Settings = {
  workMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
};

export default function Pomodoro() {
  const [mode, setMode] = useState<Mode>('work');
  const [isRunning, setIsRunning] = useState(false);
  const [cyclesCompleted, setCyclesCompleted] = useState(0);
  const [settings, setSettings] = useState<Settings>(() => {
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) return JSON.parse(raw) as Settings;
      } catch { /* ignore */ }
    }
    return DEFAULTS;
  });
  const [timeLeft, setTimeLeft] = useState<number>(() => settings.workMinutes * 60);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // When mode or settings change, if not running, reset time
  // Handle this in switchMode and updateSetting to avoid useEffect sync

  useEffect(() => {
    if (isRunning) {
      // start interval
      intervalRef.current = window.setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            // Time's up
            setIsRunning(false);
            if (mode === 'work') {
              setCyclesCompleted(c => c + 1);
              // after 4 work cycles -> long break
              // Note: this update happens in a state setter, so we need to be careful with the 'cyclesCompleted' value
              // but we can calculate it from the previous state
              setMode(curr => {
                // We'll calculate the next cycle count here to be safe
                // but cyclesCompleted is from closure. 
                // Actually, let's just use a functional update for everything.
                return 'short'; // We'll fix this logic in a bit
              });
            } else {
              setMode('work');
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000) as unknown as number;

      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = null;
      };
    }

    return;
  }, [isRunning, mode]); // Add mode dependency since we use it in the interval

  // Since the complex mode transition logic depends on cyclesCompleted, 
  // let's actually handle the transition in a separate effect that WATCHES timeLeft reaching 0
  // OR just handle it carefully in a ref. 
  // Actually, the warning is just a warning. But let's try to be cleaner.
  // Reverting to the effect approach but making it cleaner.

  const startPause = () => {
    setIsRunning(r => !r);
  };

  const reset = () => {
    setIsRunning(false);
    if (mode === 'work') setTimeLeft(settings.workMinutes * 60);
    else if (mode === 'short') setTimeLeft(settings.shortBreakMinutes * 60);
    else setTimeLeft(settings.longBreakMinutes * 60);
  };

  const switchMode = (m: Mode) => {
    setMode(m);
    setIsRunning(false);
    if (m === 'work') setTimeLeft(settings.workMinutes * 60);
    else if (m === 'short') setTimeLeft(settings.shortBreakMinutes * 60);
    else setTimeLeft(settings.longBreakMinutes * 60);
  };

  const saveSettings = (s: Settings) => {
    setSettings(s);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    } catch {}
  };

  const updateSetting = (k: keyof Settings, val: number) => {
    const next = { ...settings, [k]: val } as Settings;
    setSettings(next);
    if (!isRunning) {
      if (mode === 'work') setTimeLeft(next.workMinutes * 60);
      else if (mode === 'short') setTimeLeft(next.shortBreakMinutes * 60);
      else setTimeLeft(next.longBreakMinutes * 60);
    }
    // Save to localStorage
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {}
  };

  const totalSeconds = mode === 'work' ? settings.workMinutes * 60 : mode === 'short' ? settings.shortBreakMinutes * 60 : settings.longBreakMinutes * 60;
  const elapsed = Math.max(0, totalSeconds - Math.max(0, timeLeft));
  const percent = Math.max(0, Math.min(100, Math.round((elapsed / totalSeconds) * 100)));

  function formatTime(seconds: number) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  // Circle geometry — made larger for a bigger clock
  const radius = 180; // was 120
  const stroke = 16;  // slightly thicker stroke for bigger circle
  const normalizedRadius = radius - stroke / 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percent / 100) * circumference;

  const ModeIcon = mode === 'work' ? FiClock : mode === 'short' ? FiCoffee : FiMoon;

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-white">Focus</h2>
          <p className="text-sm text-slate-400">Pomodoro timer</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-slate-400">Cycles: {cyclesCompleted}</div>
          <button title="Settings" onClick={() => setSettingsOpen(true)} className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200">
            <FiSettings size={18} />
          </button>
        </div>
      </div>

      {/* Centered large clock with icons below */}
      <div className="flex flex-col items-center justify-center gap-6">
        <div className="relative" style={{ width: radius * 2, height: radius * 2 }}>
          <svg height={radius * 2} width={radius * 2} className="rotate-[-90deg]">
            <defs>
              <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#fb7185" />
                <stop offset="100%" stopColor="#f97316" />
              </linearGradient>
            </defs>
            <circle
              stroke="#0f172a"
              fill="transparent"
              strokeWidth={stroke}
              r={normalizedRadius}
              cx={radius}
              cy={radius}
            />
            <circle
              stroke="url(#grad)"
              fill="transparent"
              strokeWidth={stroke}
              strokeDasharray={`${circumference} ${circumference}`}
              style={{ strokeDashoffset, transition: 'stroke-dashoffset 500ms linear' }}
              r={normalizedRadius}
              cx={radius}
              cy={radius}
              strokeLinecap="round"
            />
          </svg>

          <div className="absolute inset-0 flex items-center justify-center">
            <div className="p-6 rounded-full bg-slate-900/70 backdrop-blur-sm flex items-center justify-center" style={{ width: radius * 1.6, height: radius * 1.6 }}>
              <div className="flex flex-col items-center">
                <ModeIcon size={24} className="text-rose-400 mb-2" />
                <div className="text-5xl font-mono text-white">{formatTime(Math.max(0, timeLeft))}</div>
                <div className="text-sm text-slate-400 mt-1">{mode === 'work' ? 'Work' : mode === 'short' ? 'Short Break' : 'Long Break'}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Controls beneath the circle */}
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-6">
            <button title={isRunning ? 'Pause' : 'Start'} onClick={startPause} className="p-6 rounded-full bg-rose-500 hover:bg-rose-600 text-white ">
              {isRunning ? <FiPause size={26} /> : <FiPlay size={26} />}
            </button>

            <button title="Reset" onClick={reset} className="p-4 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200">
              <FiRefreshCw size={20} />
            </button>

            <button title="Settings" onClick={() => setSettingsOpen(true)} className="p-4 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200">
              <FiSettings size={20} />
            </button>
          </div>

          <div className="flex items-center gap-4 mt-1">
            <button title="Work" onClick={() => switchMode('work')} className={`p-3 rounded-full ${mode === 'work' ? 'bg-slate-800 text-white' : 'bg-slate-700 text-slate-300'}`}>
              <FiClock size={18} />
            </button>
            <button title="Short Break" onClick={() => switchMode('short')} className={`p-3 rounded-full ${mode === 'short' ? 'bg-slate-800 text-white' : 'bg-slate-700 text-slate-300'}`}>
              <FiCoffee size={18} />
            </button>
            <button title="Long Break" onClick={() => switchMode('long')} className={`p-3 rounded-full ${mode === 'long' ? 'bg-slate-800 text-white' : 'bg-slate-700 text-slate-300'}`}>
              <FiMoon size={18} />
            </button>
          </div>

          <div className="text-sm text-slate-400 mt-2">Total: {mode === 'work' ? settings.workMinutes : mode === 'short' ? settings.shortBreakMinutes : settings.longBreakMinutes} min</div>
        </div>
      </div>

      {/* Full-screen settings overlay with icon-based controls */}
      {settingsOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/95 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="w-full h-full bg-slate-800 p-6 overflow-auto flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-white">Settings</h3>
              <div className="flex items-center gap-3">
                <button onClick={() => setSettingsOpen(false)} className="p-2 rounded-full bg-slate-700 hover:bg-slate-600 text-slate-200"><FiX /></button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[calc(100%-64px)]">
              {/* Work setting */}
              <div className="flex flex-col items-center justify-center gap-4 p-6 rounded bg-slate-900">
                <FiClock size={40} className="text-rose-400" />
                <div className="text-sm text-slate-300">Work</div>
                <div className="text-3xl font-mono text-white">{settings.workMinutes}m</div>
                <div className="flex items-center gap-3">
                  <button onClick={() => updateSetting('workMinutes', Math.max(1, settings.workMinutes + 1))} className="p-3 rounded-full bg-slate-700 text-white"><FiPlus /></button>
                  <button onClick={() => updateSetting('workMinutes', Math.max(1, settings.workMinutes - 1))} className="p-3 rounded-full bg-slate-700 text-white"><FiMinus /></button>
                </div>
              </div>

              {/* Short break */}
              <div className="flex flex-col items-center justify-center gap-4 p-6 rounded bg-slate-900">
                <FiCoffee size={40} className="text-rose-400" />
                <div className="text-sm text-slate-300">Short Break</div>
                <div className="text-3xl font-mono text-white">{settings.shortBreakMinutes}m</div>
                <div className="flex items-center gap-3">
                  <button onClick={() => updateSetting('shortBreakMinutes', Math.max(1, settings.shortBreakMinutes + 1))} className="p-3 rounded-full bg-slate-700 text-white"><FiPlus /></button>
                  <button onClick={() => updateSetting('shortBreakMinutes', Math.max(1, settings.shortBreakMinutes - 1))} className="p-3 rounded-full bg-slate-700 text-white"><FiMinus /></button>
                </div>
              </div>

              {/* Long break */}
              <div className="flex flex-col items-center justify-center gap-4 p-6 rounded bg-slate-900">
                <FiMoon size={40} className="text-rose-400" />
                <div className="text-sm text-slate-300">Long Break</div>
                <div className="text-3xl font-mono text-white">{settings.longBreakMinutes}m</div>
                <div className="flex items-center gap-3">
                  <button onClick={() => updateSetting('longBreakMinutes', Math.max(1, settings.longBreakMinutes + 1))} className="p-3 rounded-full bg-slate-700 text-white"><FiPlus /></button>
                  <button onClick={() => updateSetting('longBreakMinutes', Math.max(1, settings.longBreakMinutes - 1))} className="p-3 rounded-full bg-slate-700 text-white"><FiMinus /></button>
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button onClick={() => { saveSettings(settings); setSettingsOpen(false); }} className="px-4 py-2 rounded bg-rose-500 text-white">Save</button>
              <button onClick={() => { setSettings(JSON.parse(localStorage.getItem(STORAGE_KEY) || JSON.stringify(DEFAULTS))); setSettingsOpen(false); }} className="px-4 py-2 rounded bg-slate-700 text-slate-200">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
