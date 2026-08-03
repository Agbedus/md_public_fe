'use client';

import React, { useEffect, useRef, useState } from 'react';
import { animate } from 'animejs';
import { FiPlay, FiPause, FiRefreshCw, FiSettings, FiClock, FiCoffee, FiMoon, FiX, FiPlus, FiMinus, FiCheck, FiActivity } from 'react-icons/fi';

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

/* ── Liquid countdown geometry ───────────────────────────────────── */
const SIZE = 360;
const LIQUID_TOP = 18;
const LIQUID_HEIGHT = 324;
const LIQUID_WAVES = 3;
const LIQUID_AMP = 8;
const LIQUID_STEPS = 48;

function buildLiquidD(level: number, wave: number): string {
  const surfaceY = LIQUID_TOP + (1 - level) * LIQUID_HEIGHT;
  // phase oscillates back and forth, amplitude breathes gently around it
  const phase = wave * Math.PI * 2;
  const amp = LIQUID_AMP * (0.5 + 0.5 * Math.sin(wave * Math.PI));
  let d = `M 0,${surfaceY.toFixed(1)}`;
  for (let i = 1; i <= LIQUID_STEPS; i++) {
    const x = (SIZE / LIQUID_STEPS) * i;
    const y = surfaceY + amp * Math.sin((x / SIZE) * LIQUID_WAVES * Math.PI * 2 + phase);
    d += ` L ${x.toFixed(1)},${y.toFixed(1)}`;
  }
  d += ` L ${SIZE},${SIZE} L 0,${SIZE} Z`;
  return d;
}

const MODE_ACCENT: Record<Mode, string> = {
  work: 'var(--pastel-teal)',
  short: 'var(--pastel-amber)',
  long: 'var(--pastel-purple)',
};

interface SettingCardProps {
  icon: React.ElementType;
  label: string;
  hint: string;
  value: number;
  accent: string;
  chipBg: string;
  onIncrement: () => void;
  onDecrement: () => void;
}

function SettingCard({ icon: Icon, label, hint, value, accent, chipBg, onIncrement, onDecrement }: SettingCardProps) {
  return (
    <div className="flex flex-col items-center gap-3.5 p-5 rounded-2xl bg-foreground/[0.03] border border-card-border">
      <div className={`p-3 rounded-xl ${chipBg} ${accent}`}>
        <Icon size={20} />
      </div>
      <div className="text-center">
        <div className="text-sm font-bold text-foreground">{label}</div>
        <div className="text-[11px] text-text-muted font-medium">{hint}</div>
      </div>
      <div className="font-numbers text-4xl text-foreground leading-none">
        {value}
        <span className="text-lg text-text-muted">m</span>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={onDecrement}
          title={`Decrease ${label}`}
          className="w-9 h-9 rounded-full bg-background hover:bg-foreground/[0.08] border border-card-border text-foreground flex items-center justify-center transition-all active:scale-90"
        >
          <FiMinus size={14} />
        </button>
        <button
          onClick={onIncrement}
          title={`Increase ${label}`}
          className="w-9 h-9 rounded-full bg-background hover:bg-foreground/[0.08] border border-card-border text-foreground flex items-center justify-center transition-all active:scale-90"
        >
          <FiPlus size={14} />
        </button>
      </div>
    </div>
  );
}

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

  const liquidPathRef = useRef<SVGPathElement | null>(null);
  const liquidStateRef = useRef({ level: 1, target: 1, wave: 0 });

  const drawLiquid = () => {
    const path = liquidPathRef.current;
    const s = liquidStateRef.current;
    if (!path) return;
    s.level += (s.target - s.level) * 0.18;
    if (Math.abs(s.level - s.target) < 0.001) s.level = s.target;
    path.setAttribute('d', buildLiquidD(s.level, s.wave));
  };

  // Continuous floating sine wave — glides back and forth for the lifetime of the component
  useEffect(() => {
    drawLiquid();
    const ripple = animate(liquidStateRef.current, {
      wave: 1,
      duration: 5000,
      ease: 'inOutSine',
      alternate: true,
      loop: true,
      onRender: drawLiquid,
    });
    return () => { ripple.pause(); };
  }, []);

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const totalSeconds = mode === 'work' ? settings.workMinutes * 60 : mode === 'short' ? settings.shortBreakMinutes * 60 : settings.longBreakMinutes * 60;

  // Feed the timer state into the liquid level
  useEffect(() => {
    liquidStateRef.current.target = totalSeconds > 0 ? Math.max(0, timeLeft) / totalSeconds : 0;
  }, [timeLeft, totalSeconds]);

  useEffect(() => {
    if (!isRunning) return;
    intervalRef.current = window.setInterval(() => {
      setTimeLeft(prev => (prev <= 1 ? 0 : prev - 1));
    }, 1000) as unknown as number;

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
    };
  }, [isRunning]);

  // Handle session completion
  useEffect(() => {
    if (isRunning && timeLeft === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsRunning(false);
      if (mode === 'work') {
        const nextCycles = cyclesCompleted + 1;
        setCyclesCompleted(nextCycles);
        const nextMode = nextCycles % 4 === 0 ? 'long' : 'short';
        setMode(nextMode);
        setTimeLeft((nextMode === 'long' ? settings.longBreakMinutes : settings.shortBreakMinutes) * 60);
      } else {
        setMode('work');
        setTimeLeft(settings.workMinutes * 60);
      }
    }
  }, [isRunning, timeLeft, mode, cyclesCompleted, settings.workMinutes, settings.shortBreakMinutes, settings.longBreakMinutes]);

  const startPause = () => {
    if (!isRunning && timeLeft === 0) {
      reset();
      setIsRunning(true);
    } else {
      setIsRunning(r => !r);
    }
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

  const cancelSettings = () => {
    let next: Settings = DEFAULTS;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) next = JSON.parse(raw) as Settings;
    } catch {}
    setSettings(next);
    if (!isRunning) {
      if (mode === 'work') setTimeLeft(next.workMinutes * 60);
      else if (mode === 'short') setTimeLeft(next.shortBreakMinutes * 60);
      else setTimeLeft(next.longBreakMinutes * 60);
    }
    setSettingsOpen(false);
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
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {}
  };

  function formatTime(seconds: number) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  const radius = 180;
  const stroke = 16;
  const normalizedRadius = radius - stroke / 2;
  const liquidColor = MODE_ACCENT[mode];
  const ModeIcon = mode === 'work' ? FiClock : mode === 'short' ? FiCoffee : FiMoon;
  const liquidId = `pomodoro-liquid-${mode}`;
  const clipId = `pomodoro-liquid-clip`;

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2 tracking-tight">Focus</h1>
          <p className="text-text-muted text-sm">Stay on task with a work-and-break timer.</p>
        </div>
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-card-border bg-foreground/[0.03]">
          <FiActivity size={14} className="text-[var(--pastel-teal)]" />
          <span className="text-sm font-medium text-text-secondary">
            {cyclesCompleted} cycle{cyclesCompleted === 1 ? '' : 's'}
          </span>
        </div>
      </div>

      <div className="bg-card border border-card-border rounded-2xl p-6 lg:p-10">
        {settingsOpen ? (
          /* Settings panel — rendered inside the same container as the clock and controls */
          <div className="flex flex-col justify-center min-h-[540px]">
            <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-[var(--pastel-teal)]/10 text-[var(--pastel-teal)]">
                  <FiSettings size={18} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground tracking-tight leading-none">Focus Settings</h3>
                  <p className="text-xs text-text-muted mt-1">Tune your work and break durations</p>
                </div>
              </div>
              <button onClick={() => setSettingsOpen(false)} className="p-2 rounded-xl bg-foreground/[0.03] hover:bg-foreground/[0.06] border border-card-border text-text-secondary hover:text-foreground transition-all" title="Close settings">
                <FiX size={16} />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <SettingCard
                icon={FiClock}
                label="Work"
                hint="Focus session"
                value={settings.workMinutes}
                accent="text-[var(--pastel-teal)]"
                chipBg="bg-[var(--pastel-teal)]/10"
                onIncrement={() => updateSetting('workMinutes', Math.max(1, settings.workMinutes + 1))}
                onDecrement={() => updateSetting('workMinutes', Math.max(1, settings.workMinutes - 1))}
              />
              <SettingCard
                icon={FiCoffee}
                label="Short Break"
                hint="Between sessions"
                value={settings.shortBreakMinutes}
                accent="text-[var(--pastel-amber)]"
                chipBg="bg-[var(--pastel-amber)]/10"
                onIncrement={() => updateSetting('shortBreakMinutes', Math.max(1, settings.shortBreakMinutes + 1))}
                onDecrement={() => updateSetting('shortBreakMinutes', Math.max(1, settings.shortBreakMinutes - 1))}
              />
              <SettingCard
                icon={FiMoon}
                label="Long Break"
                hint="After 4 sessions"
                value={settings.longBreakMinutes}
                accent="text-[var(--pastel-purple)]"
                chipBg="bg-[var(--pastel-purple)]/10"
                onIncrement={() => updateSetting('longBreakMinutes', Math.max(1, settings.longBreakMinutes + 1))}
                onDecrement={() => updateSetting('longBreakMinutes', Math.max(1, settings.longBreakMinutes - 1))}
              />
            </div>

            <div className="pt-5 border-t border-card-border flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-xs text-text-muted">Changes apply instantly and save automatically.</p>
              <div className="flex items-center gap-3">
                <button onClick={cancelSettings} className="px-5 py-2 rounded-xl text-sm font-medium text-text-secondary bg-foreground/[0.03] hover:bg-foreground/[0.06] border border-card-border transition-all">
                  Cancel
                </button>
                <button
                  onClick={() => { saveSettings(settings); setSettingsOpen(false); }}
                  className="flex items-center gap-2 p-1.5 rounded-xl bg-foreground/[0.03] hover:bg-foreground/[0.06] border border-card-border text-sm text-text-muted hover:text-foreground transition-all duration-200 group"
                >
                  <div className="p-1 rounded-lg bg-foreground/[0.03] group-hover:bg-foreground/[0.06] transition-colors">
                    <FiCheck size={14} />
                  </div>
                  <span>Save</span>
                </button>
              </div>
            </div>
            </div>
          </div>
        ) : (
          /* Centered large clock with liquid countdown */
          <div className="flex flex-col items-center justify-center gap-6">
            <div className="relative" style={{ width: radius * 2, height: radius * 2 }}>
              <svg height={radius * 2} width={radius * 2} className="absolute inset-0">
                <defs>
                  <clipPath id={clipId}>
                    <circle cx={radius} cy={radius} r={162} />
                  </clipPath>
                  <linearGradient id={liquidId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={liquidColor} stopOpacity="0.45" />
                    <stop offset="100%" stopColor={liquidColor} stopOpacity="0.9" />
                  </linearGradient>
                </defs>

                <g clipPath={`url(#${clipId})`}>
                  <path ref={liquidPathRef} d={buildLiquidD(1, 0)} fill={`url(#${liquidId})`} />
                </g>

                <circle
                  cx={radius}
                  cy={radius}
                  r={normalizedRadius}
                  stroke="var(--card-border)"
                  strokeWidth={stroke}
                  fill="transparent"
                />
              </svg>

              <div className="absolute inset-0 flex items-center justify-center">
                <div className="p-6 rounded-full bg-background border border-card-border flex items-center justify-center" style={{ width: radius * 1.6, height: radius * 1.6 }}>
                  <div className="flex flex-col items-center">
                    <ModeIcon size={22} style={{ color: liquidColor }} className="mb-2" />
                    <div className="text-5xl font-numbers text-foreground leading-none">{formatTime(Math.max(0, timeLeft))}</div>
                    <div className="text-sm text-text-muted mt-2">{mode === 'work' ? 'Work' : mode === 'short' ? 'Short Break' : 'Long Break'}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Controls beneath the circle */}
            <div className="flex flex-col items-center gap-4">
              <div className="flex items-center justify-center gap-5">
                <button title="Reset" onClick={reset} className="p-4 rounded-full bg-foreground/[0.03] hover:bg-foreground/[0.06] text-text-secondary border border-card-border transition-all">
                  <FiRefreshCw size={20} />
                </button>

                {/* Play / pause — theme coloured, red while running so it reads as stop */}
                <button
                  title={isRunning ? 'Pause' : 'Start'}
                  onClick={startPause}
                  className={`flex items-center justify-center gap-3 px-10 py-4 rounded-full text-base font-bold tracking-wide transition-all active:scale-95 ${
                    isRunning
                      ? 'bg-rose-500 hover:bg-rose-600 text-white'
                      : 'bg-foreground text-background hover:bg-foreground/90'
                  }`}
                >
                  {isRunning ? <FiPause size={18} /> : <FiPlay size={18} />}
                  <span>{isRunning ? 'Pause' : 'Start'}</span>
                </button>

                <button title="Settings" onClick={() => setSettingsOpen(true)} className="p-4 rounded-full bg-foreground/[0.03] hover:bg-foreground/[0.06] text-text-secondary border border-card-border transition-all">
                  <FiSettings size={20} />
                </button>
              </div>

              <div className="flex items-center gap-4 mt-1">
                <button title="Work" onClick={() => switchMode('work')} className={`p-3 rounded-full ${mode === 'work' ? 'bg-foreground/[0.03] text-foreground' : 'bg-foreground/[0.06] text-text-secondary'}`}>
                  <FiClock size={18} />
                </button>
                <button title="Short Break" onClick={() => switchMode('short')} className={`p-3 rounded-full ${mode === 'short' ? 'bg-foreground/[0.03] text-foreground' : 'bg-foreground/[0.06] text-text-secondary'}`}>
                  <FiCoffee size={18} />
                </button>
                <button title="Long Break" onClick={() => switchMode('long')} className={`p-3 rounded-full ${mode === 'long' ? 'bg-foreground/[0.03] text-foreground' : 'bg-foreground/[0.06] text-text-secondary'}`}>
                  <FiMoon size={18} />
                </button>
              </div>

              <div className="text-sm text-text-muted mt-2">Total: {mode === 'work' ? settings.workMinutes : mode === 'short' ? settings.shortBreakMinutes : settings.longBreakMinutes} min</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
