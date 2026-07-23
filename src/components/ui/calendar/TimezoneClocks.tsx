"use client";
import React, { useEffect, useMemo, useState } from "react";
import { FiClock, FiTrash2, FiPlus, FiChevronUp, FiChevronDown, FiX, FiCheck } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";

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

function formatInTZ(date: Date, tz: string) {
  try {
    const time = new Intl.DateTimeFormat('en-US', {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: tz,
    }).format(date);
    const day = new Intl.DateTimeFormat('en-US', {
      weekday: "short",
      month: "short",
      day: "2-digit",
      timeZone: tz,
    }).format(date);
    return { time, day };
  } catch (e) {
    return { time: "--:--", day: "Invalid TZ" };
  }
}

const LS_KEY = "mdp_tz_clocks_v2";

export default function TimezoneClocks() {
  const [now, setNow] = useState<Date>(new Date());
  const [clocks, setClocks] = useState<ClockItem[]>(() => {
    try {
      if (typeof window !== 'undefined') {
        const raw = localStorage.getItem(LS_KEY);
        if (raw) {
          const arr = JSON.parse(raw);
          if (Array.isArray(arr) && arr.length > 0) {
            return arr.map(tz => ({ id: Math.random().toString(36).substr(2, 9), tz }));
          }
        }
      }
    } catch (e) {
      console.error("Failed to load clocks from LS", e);
    }
    return [{ id: 'utc-default', tz: 'UTC' }];
  });
  const [selected, setSelected] = useState<string>("UTC");
  const [isExpanded, setIsExpanded] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

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

  const addClock = () => {
    if (!selected) return;
    if (clocks.some(c => c.tz === selected)) {
        setIsAdding(false);
        return;
    }
    setClocks(prev => [...prev, { id: Math.random().toString(36).substr(2, 9), tz: selected }]);
    setIsAdding(false);
    setIsExpanded(true);
  };

  const removeClock = (id: string) => {
    setClocks(prev => prev.filter(c => c.id !== id));
  };

  const utcClock = clocks.find(c => c.tz === 'UTC') || { id: 'utc', tz: 'UTC' };
  const otherClocks = clocks.filter(c => c.tz !== 'UTC');

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-row-reverse items-end gap-3 pointer-events-none">
      {/* Main UTC Toggle Button */}
      <div className="flex items-center gap-2 pointer-events-auto">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="bg-background border border-card-border rounded-2xl p-3 flex items-center gap-4 hover:border-card-border transition-all group backdrop-blur-xl shadow-xl shadow-foreground/[0.05]"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-sm">
              <FiClock className="h-4 w-4" />
            </div>
            <div className="text-left">
              <div className="text-foreground text-lg font-black tracking-tightest leading-none">
                {formatInTZ(now, 'UTC').time}
              </div>
              <div className="text-text-muted text-[9px] font-black uppercase tracking-[0.2em] mt-1">Universal Time</div>
            </div>
          </div>
          <div className="pl-2 border-l border-card-border">
            {isExpanded ? <FiChevronDown className="text-text-muted group-hover:text-foreground transition-colors" /> : <FiChevronUp className="text-text-muted group-hover:text-foreground transition-colors" />}
          </div>
        </button>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, x: 20, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.95 }}
            className="flex flex-row-reverse items-center gap-2 pointer-events-auto"
          >
           {isAdding ? (
              <div className="bg-background border border-indigo-500/30 rounded-2xl p-2.5 flex items-center gap-2 backdrop-blur-xl shadow-2xl">
                <select
                  value={selected}
                  onChange={(e) => setSelected(e.target.value)}
                  className="bg-foreground/[0.03] text-foreground text-xs px-3 py-2 rounded-xl border border-card-border outline-none focus:border-indigo-500/30 font-bold appearance-none cursor-pointer"
                >
                  {COMMON_TIMEZONES.map((opt) => (
                    <option key={opt.tz} value={opt.tz} className="bg-background">
                      {opt.label}
                    </option>
                  ))}
                </select>
                <button onClick={addClock} className="p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-500/20">
                  <FiCheck className="h-4 w-4" />
                </button>
                <button onClick={() => setIsAdding(false)} className="p-2 bg-foreground/[0.05] text-text-muted rounded-xl hover:bg-foreground/[0.1] transition-colors">
                  <FiX className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button 
                onClick={() => setIsAdding(true)}
                className="flex items-center justify-center h-[56px] w-[52px] rounded-2xl border border-dashed border-card-border hover:border-indigo-500/50 text-text-muted hover:text-indigo-600 dark:hover:text-indigo-400 transition-all bg-background/50 hover:bg-indigo-500/5 backdrop-blur-md shadow-xl"
                title="Add Timezone"
              >
                <FiPlus className="h-5 w-5" />
              </button>
            )}

            {otherClocks.map((c) => {
              const { time, day } = formatInTZ(now, c.tz);
              return (
                <div key={c.id} className="bg-background border border-card-border rounded-2xl p-3.5 flex items-center justify-between gap-6 min-w-[180px] backdrop-blur-xl shadow-xl shadow-foreground/[0.02] group/item border-b-2 border-b-indigo-500/20">
                  <div>
                    <div className="text-foreground text-base font-black tracking-tightest leading-none">{time}</div>
                    <div className="text-text-muted text-[9px] font-black uppercase tracking-widest mt-1.5 opacity-70">{day} • {c.tz.split('/').pop()?.replace('_', ' ')}</div>
                  </div>
                  <button onClick={() => removeClock(c.id)} className="p-1.5 text-text-muted hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all opacity-0 group-hover/item:opacity-100">
                    <FiTrash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
