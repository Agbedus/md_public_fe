"use client";
import React, { useEffect, useRef, useState } from "react";
import { FiClock, FiTrash2, FiChevronUp, FiChevronDown, FiChevronLeft, FiChevronRight, FiCheck, FiGlobe } from "react-icons/fi";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { useAdaptiveDropdown } from '@/hooks/use-adaptive-dropdown';

interface ClockItem {
  id: string;
  tz: string;
}

const COMMON_TIMEZONES = [
  { tz: "UTC", label: "UTC" },
  { tz: "America/Los_Angeles", label: "Los Angeles (PT)" },
  { tz: "America/Denver", label: "Denver (MT)" },
  { tz: "America/Chicago", label: "Chicago (CT)" },
  { tz: "America/New_York", label: "New York (ET)" },
  { tz: "Europe/London", label: "London (BST/GMT)" },
  { tz: "Europe/Berlin", label: "Berlin (CET)" },
  { tz: "Africa/Accra", label: "Accra (GMT)" },
  { tz: "Africa/Lagos", label: "Lagos (WAT)" },
  { tz: "Asia/Dubai", label: "Dubai (GST)" },
  { tz: "Asia/Kolkata", label: "Kolkata (IST)" },
  { tz: "Asia/Singapore", label: "Singapore (SGT)" },
  { tz: "Asia/Tokyo", label: "Tokyo (JST)" },
  { tz: "Australia/Sydney", label: "Sydney (AEST)" },
];

function cityLabel(tz: string) {
  return COMMON_TIMEZONES.find((z) => z.tz === tz)?.label ?? tz.split('/').pop()?.replace('_', ' ') ?? tz;
}

function formatInTZ(date: Date, tz: string) {
  try {
    const time = new Intl.DateTimeFormat('en-US', {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: tz,
    }).format(date);
    return { time };
  } catch (e) {
    return { time: "--:--" };
  }
}

/** "UTC+9" / "UTC-5" style offset — the city's difference from UTC at this moment. */
function offsetLabel(date: Date, tz: string) {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      timeZoneName: 'shortOffset',
    }).formatToParts(date);
    const zonePart = parts.find((p) => p.type === 'timeZoneName')?.value ?? '';
    return zonePart.replace('GMT', 'UTC') || 'UTC+0';
  } catch (e) {
    return '';
  }
}

const LS_KEY = "mdp_tz_clocks_v2";

/**
 * Directional roulette variants for the clock slide.
 *
 * `custom` carries which way the user navigated: +1 for next, -1 for prev.
 * The incoming clock always arrives from the side you're heading toward, and
 * the outgoing one leaves toward the opposite side — the standard carousel
 * illusion of "moving through" the list along one axis. Only `x` and
 * `opacity` are animated (no layout properties), so this stays compositor-only.
 *
 * The enter transition is a spring, not a tween — that's what produces the
 * bounce: a slight overshoot past rest before it settles. The exit is a plain
 * fast ease-out because it's the thing leaving; bounce reads as hesitation on
 * an exit, not on an arrival.
 */
const slideVariants: Variants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 26 : -26,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
    transition: { type: 'spring', stiffness: 420, damping: 18, mass: 0.7 },
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -26 : 26,
    opacity: 0,
    transition: { duration: 0.14, ease: 'easeOut' },
  }),
};

export default function TimezoneClocks() {
  const [now, setNow] = useState<Date>(new Date());
  const [clocks, setClocks] = useState<ClockItem[]>(() => {
    try {
      if (typeof window !== 'undefined') {
        const raw = localStorage.getItem(LS_KEY);
        if (raw) {
          const arr = JSON.parse(raw);
          if (Array.isArray(arr) && arr.length > 0) {
            return arr.map((tz: string) => ({ id: tz, tz }));
          }
        }
      }
    } catch (e) {
      console.error("Failed to load clocks from LS", e);
    }
    return [{ id: 'UTC', tz: 'UTC' }];
  });
  // Which saved clock the compact view is showing. The left/right arrows
  // step this back and forth; it is not tied to any one timezone (UTC
  // included) so flipping through the whole list works uniformly.
  const [currentIndex, setCurrentIndex] = useState(0);
  // Which way the last step went — read by slideVariants to pick the side
  // the incoming/outgoing clock animates from/to.
  const [direction, setDirection] = useState(1);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const pickerAnchorRef = useRef<HTMLButtonElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const { style: pickerStyle, side: pickerSide } = useAdaptiveDropdown({
    isOpen: isPickerOpen,
    anchorRef: pickerAnchorRef,
    dropdownRef: pickerRef,
    preferredSide: 'bottom',
    preferredAlign: 'end',
  });

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Persist clocks
  useEffect(() => {
    if (clocks.length > 0) {
      localStorage.setItem(LS_KEY, JSON.stringify(clocks.map(c => c.tz)));
    }
  }, [clocks]);

  // Defensive against `currentIndex` outliving a removal — always resolves
  // to a real entry rather than reading past the end of the array.
  const safeIndex = Math.min(currentIndex, clocks.length - 1);
  const current = clocks[safeIndex] ?? clocks[0];
  const hasMultiple = clocks.length > 1;

  const goPrev = () => {
    setDirection(-1);
    setCurrentIndex((i) => (Math.min(i, clocks.length - 1) - 1 + clocks.length) % clocks.length);
  };
  const goNext = () => {
    setDirection(1);
    setCurrentIndex((i) => (Math.min(i, clocks.length - 1) + 1) % clocks.length);
  };

  /**
   * Toggle a city on or off the saved list.
   *
   * Adding inserts the new clock immediately after the one currently on
   * screen, and moves the display to it — so the newly added city opens to
   * the right of whatever you were looking at, and stepping left with the
   * arrow returns you to where you started. Removing always leaves at least
   * one clock behind; there is nothing meaningful to flip through with zero.
   */
  const toggleCity = (tz: string) => {
    const existingIdx = clocks.findIndex((c) => c.tz === tz);
    if (existingIdx !== -1) {
      if (clocks.length === 1) return;
      setClocks((prev) => prev.filter((c) => c.tz !== tz));
      return;
    }
    const newClock: ClockItem = { id: tz, tz };
    const insertAt = safeIndex + 1;
    setDirection(1);
    setClocks((prev) => [...prev.slice(0, insertAt), newClock, ...prev.slice(insertAt)]);
    setCurrentIndex(insertAt);
  };

  const removeCurrent = () => {
    if (clocks.length === 1) return;
    setClocks((prev) => prev.filter((c) => c.id !== current.id));
  };

  const { time } = formatInTZ(now, current.tz);
  const offset = offsetLabel(now, current.tz);

  return (
    <div className="relative inline-flex items-stretch gap-2">
      {/* Clock slider — a fixed height/width on the row itself, and the
          sliding layers are absolutely positioned within it (both the
          entering and exiting clock exist in the DOM at once during the
          crossfade). Without that, two stacked block-level divs would
          briefly double the row's height mid-slide; with it, the row's
          box never changes size regardless of what's animating inside. */}
      <div className="h-16 bg-card border border-card-border rounded-xl flex items-center shadow-sm">
        <button
          onClick={goPrev}
          disabled={!hasMultiple}
          aria-label="Previous clock"
          className="h-full px-3 text-text-muted hover:text-foreground hover:bg-foreground/[0.05] disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed rounded-l-xl transition-all"
        >
          <FiChevronLeft className="h-4 w-4" />
        </button>

        <div className="relative overflow-hidden h-full w-[188px]">
          <AnimatePresence initial={false} custom={direction}>
            <motion.div
              key={current.id}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="absolute inset-0 flex items-center gap-3 px-3"
            >
              <div className="w-9 h-9 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                <FiClock className="h-4 w-4" />
              </div>
              <div className="text-left min-w-0">
                <div className="text-foreground text-lg font-black tracking-tightest leading-none">
                  {time}
                </div>
                <div className="text-text-muted text-[9px] font-bold uppercase tracking-[0.1em] mt-1 whitespace-nowrap">
                  {cityLabel(current.tz)} · {offset}
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        <button
          onClick={goNext}
          disabled={!hasMultiple}
          aria-label="Next clock"
          className="h-full px-3 text-text-muted hover:text-foreground hover:bg-foreground/[0.05] disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed rounded-r-xl transition-all"
        >
          <FiChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Add/remove clocks — its own square button, matching the slider's height */}
      <button
        ref={pickerAnchorRef}
        onClick={() => setIsPickerOpen((v) => !v)}
        aria-label="Add or remove clocks"
        className="h-16 w-16 shrink-0 bg-card border border-card-border rounded-xl flex items-center justify-center text-text-muted hover:text-foreground hover:bg-foreground/[0.05] shadow-sm transition-all"
      >
        {isPickerOpen ? <FiChevronUp className="h-4 w-4" /> : <FiChevronDown className="h-4 w-4" />}
      </button>

      {/* City picker — a real list to choose from, not a native <select>.
          Clicking a city adds it (and jumps the compact view to it, per the
          insertion rule above); clicking an already-saved city removes it. */}
      <AnimatePresence>
        {isPickerOpen && (
          <motion.div
            ref={pickerRef}
            initial={{ opacity: 0, scale: 0.985 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.985 }}
            style={pickerStyle}
            data-side={pickerSide}
            className={`z-[9999] w-64 bg-card border border-card-border rounded-2xl shadow-2xl overflow-y-auto ${pickerSide === 'top' ? 'origin-bottom-right' : 'origin-top-right'}`}
          >
            <div className="flex items-center gap-2 px-4 py-3 border-b border-card-border">
              <FiGlobe className="h-3.5 w-3.5 text-text-muted" />
              <span className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">Cities</span>
            </div>
            <div className="max-h-72 overflow-y-auto py-1.5">
              {COMMON_TIMEZONES.map((opt) => {
                const isSaved = clocks.some((c) => c.tz === opt.tz);
                const isOnlyOne = isSaved && clocks.length === 1;
                return (
                  <button
                    key={opt.tz}
                    onClick={() => toggleCity(opt.tz)}
                    disabled={isOnlyOne}
                    className={`w-full flex items-center justify-between gap-2 px-4 py-2 text-left text-xs font-medium transition-colors hover:bg-foreground/[0.05] disabled:opacity-40 disabled:cursor-not-allowed ${
                      isSaved ? 'text-foreground' : 'text-text-muted'
                    }`}
                  >
                    <span>{opt.label}</span>
                    {isSaved && <FiCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0" />}
                  </button>
                );
              })}
            </div>
            {hasMultiple && (
              <button
                onClick={removeCurrent}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-left text-xs font-medium text-rose-500 hover:bg-rose-500/10 border-t border-card-border transition-colors"
              >
                <FiTrash2 className="h-3.5 w-3.5" />
                Remove {cityLabel(current.tz)}
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
