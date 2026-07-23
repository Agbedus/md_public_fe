'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiChevronUp, FiChevronDown, FiMapPin, FiUsers, FiClock, FiActivity } from 'react-icons/fi';
import { presenceStateLabels, presenceStateColors, attendanceStateLabels, attendanceStateColors, PresenceState, AttendanceState } from '@/types/attendance';

interface AttendanceStats {
  myStatus: AttendanceState | string;
  myPresence: PresenceState | string;
  teamActiveCount: number;
  teamTotalCount: number;
  avgDailyHours: number;
  lastClockIn: string | null;
}

export function AttendanceStack({ stats }: { stats: AttendanceStats }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);

  const pColors = presenceStateColors[stats.myPresence as PresenceState] || presenceStateColors.OUT_OF_OFFICE;
  const aColors = attendanceStateColors[stats.myStatus as AttendanceState] || attendanceStateColors.NOT_CLOCKED_IN;

  const slides = [
    {
      id: 'status',
      title: 'Deployment Status',
      icon: FiMapPin,
      color: pColors.text,
      bg: pColors.bg,
      content: (
        <div className="flex-1 flex flex-col justify-center">
          <div className="glass p-4 rounded-2xl border border-card-border relative overflow-hidden mb-2">
             <div className={`absolute left-0 top-0 bottom-0 w-1 ${pColors.dot}`} />
             <p className="text-[10px] text-(--text-muted) font-black uppercase tracking-widest mb-1">Live Presence</p>
             <h3 className="text-xl font-bold text-foreground">{presenceStateLabels[stats.myPresence as PresenceState] || 'Standby'}</h3>
          </div>
          <div className="flex items-center justify-between px-1">
             <span className={`text-[10px] font-black uppercase tracking-widest ${aColors.text}`}>
                {attendanceStateLabels[stats.myStatus as AttendanceState] || 'Inactive'}
             </span>
             {stats.lastClockIn && (
                <span className="text-[10px] text-(--text-muted) font-bold font-numbers uppercase tracking-tight" suppressHydrationWarning>
                   SINCE {new Date(stats.lastClockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
             )}
          </div>
        </div>
      )
    },
    {
      id: 'team',
      title: 'Team Presence',
      icon: FiUsers,
      color: 'text-[var(--pastel-blue)]',
      bg: 'bg-[var(--pastel-blue)]/10',
      content: (
        <div className="flex-1 flex flex-col justify-center">
          <div className="flex items-baseline justify-between mb-4">
             <h3 className="text-3xl font-black font-numbers text-foreground leading-none">{stats.teamActiveCount}</h3>
             <span className="text-xs text-(--text-muted) font-bold uppercase tracking-widest">Active Units</span>
          </div>
          <div className="space-y-2">
             <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-(--text-muted)">
                <span>Engagement</span>
                <span>{Math.round((stats.teamActiveCount / (stats.teamTotalCount || 1)) * 100)}%</span>
             </div>
             <div className="h-2 bg-background/50 rounded-full border border-card-border overflow-hidden">
                <motion.div 
                   initial={{ width: 0 }}
                   animate={{ width: `${(stats.teamActiveCount / (stats.teamTotalCount || 1)) * 100}%` }}
                   className="h-full bg-[var(--pastel-blue)] rounded-full"
                />
             </div>
             <p className="text-[9px] text-(--text-muted) font-bold uppercase tracking-tight text-right">
                Total Personnel: {stats.teamTotalCount}
             </p>
          </div>
        </div>
      )
    },
    {
      id: 'performance',
      title: 'Performance Metrics',
      icon: FiClock,
      color: 'text-[var(--pastel-teal)]',
      bg: 'bg-[var(--pastel-teal)]/10',
      content: (
        <div className="flex-1 flex flex-col justify-center">
           <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-2xl bg-background/40 border border-card-border">
                 <p className="text-[9px] text-(--text-muted) font-black uppercase tracking-widest mb-1">Avg Daily</p>
                 <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-black font-numbers text-foreground">{stats.avgDailyHours}</span>
                    <span className="text-[10px] text-(--text-muted) font-bold uppercase">HRS</span>
                 </div>
              </div>
              <div className="p-3 rounded-2xl bg-background/40 border border-card-border">
                 <p className="text-[9px] text-(--text-muted) font-black uppercase tracking-widest mb-1">Efficiency</p>
                 <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-black font-numbers text-emerald-400">{(stats.avgDailyHours / 8 * 100).toFixed(0)}%</span>
                 </div>
              </div>
           </div>
           <p className="mt-4 text-[9px] text-(--text-muted) font-bold uppercase tracking-widest text-center opacity-60">
              Calculated from latest 5 deployment cycles
           </p>
        </div>
      )
    }
  ];

  const nextSlide = () => {
    setDirection(1);
    setCurrentIndex((prev) => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    setDirection(-1);
    setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const currentSlide = slides[currentIndex];

  const variants = {
    initial: (direction: number) => ({
      y: direction > 0 ? 100 : -100,
      opacity: 0,
      scale: 0.9,
      filter: 'blur(10px)',
    }),
    active: {
      y: 0,
      opacity: 1,
      scale: 1,
      filter: 'blur(0px)',
    },
    exit: (direction: number) => ({
      y: direction > 0 ? -100 : 100,
      opacity: 0,
      scale: 1.1,
      filter: 'blur(10px)',
    })
  };

  return (
    <div className="relative w-full h-full flex flex-col group/stack">
      <div className="flex-1 relative perspective-1000 mt-2 mb-2">
        <div className="absolute inset-0 overflow-hidden rounded-3xl">
          <AnimatePresence mode="popLayout" initial={false} custom={direction}>
            <motion.div
              key={currentIndex}
              custom={direction}
              variants={variants}
              initial="initial"
              animate="active"
              exit="exit"
              transition={{ type: 'spring', damping: 25, stiffness: 800, mass: 0.2 }}
              className="absolute inset-0 p-5 rounded-3xl bg-card border border-card-border flex flex-col group/card cursor-pointer"
            >
              <div className="flex items-center justify-between mb-4 shrink-0">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl ${currentSlide.bg} border border-card-border ${currentSlide.color}`}>
                    <currentSlide.icon className="text-lg" />
                  </div>
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground">
                    {currentSlide.title}
                  </h3>
                </div>
                <div className="flex items-center gap-1">
                   {slides.map((_, i) => (
                     <div key={i} className={`w-1 h-1 rounded-full transition-all ${i === currentIndex ? 'bg-emerald-500 w-3' : 'bg-card-border'}`} />
                   ))}
                </div>
              </div>

              {currentSlide.content}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Floating Controls */}
        <div className="absolute bottom-4 right-4 flex flex-col gap-2 z-50 opacity-0 group-hover/stack:opacity-100 transition-opacity">
          <button 
            onClick={(e) => { e.stopPropagation(); prevSlide(); }}
            className="w-8 h-8 rounded-full bg-background/80 border border-card-border text-foreground flex items-center justify-center hover:bg-emerald-500 hover:text-emerald-950 transition-all active:scale-90 shadow-lg backdrop-blur-md"
          >
            <FiChevronUp className="text-lg" />
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); nextSlide(); }}
            className="w-8 h-8 rounded-full bg-background/80 border border-card-border text-foreground flex items-center justify-center hover:bg-emerald-500 hover:text-emerald-950 transition-all active:scale-90 shadow-lg backdrop-blur-md"
          >
            <FiChevronDown className="text-lg" />
          </button>
        </div>
      </div>
    </div>
  );
}
