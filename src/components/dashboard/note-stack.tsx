'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiChevronUp, FiChevronDown, FiFileText, FiZap, FiCalendar } from 'react-icons/fi';

interface Note {
  title: string;
  content?: string;
  type: string;
  color: string;
  updatedAt?: string | null;
}

export function NoteStack({ notes }: { notes: Note[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0); // 1 for next (down), -1 for prev (up)

  if (notes.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center opacity-50">
        <FiFileText className="text-2xl mb-2 text-(--text-muted)" />
        <p className="text-sm text-(--text-muted) font-bold uppercase tracking-tight">No recent notes</p>
      </div>
    );
  }

  const nextNote = () => {
    setDirection(1);
    setCurrentIndex((prev) => (prev + 1) % notes.length);
  };

  const prevNote = () => {
    setDirection(-1);
    setCurrentIndex((prev) => (prev - 1 + notes.length) % notes.length);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'meeting': return FiCalendar;
      case 'idea': return FiZap;
      default: return FiFileText;
    }
  };

  const getVisibleNotes = () => {
    const result = [];
    for (let i = 0; i < Math.min(notes.length, 3); i++) {
      result.push(notes[(currentIndex + i) % notes.length]);
    }
    return result;
  };

  const visibleNotes = getVisibleNotes();

  const variants = {
    initial: (direction: number) => ({
      y: direction > 0 ? 150 : -150,
      opacity: 0,
      scale: 0.8,
      filter: 'blur(8px)',
    }),
    active: {
      y: 0,
      opacity: 1,
      scale: 1,
      filter: 'blur(0px)',
    },
    exit: (direction: number) => ({
      y: direction > 0 ? -150 : 150,
      opacity: 0,
      scale: 1.1,
      filter: 'blur(8px)',
    })
  };

  return (
    <div className="relative w-full h-full flex flex-col">
      <div className="flex-1 relative perspective-1000 mt-2 mb-4">
        {/* Visual Stack (Back Cards) - Only static during transition to avoid flicker */}
        {visibleNotes.slice(1).reverse().map((note, index) => {
            const depth = visibleNotes.length - 1 - index;
            return (
                <div
                    key={`stack-${(currentIndex + depth) % notes.length}`}
                    className="absolute inset-0 rounded-3xl bg-card border border-card-border shadow-md transition-all duration-500 pointer-events-none"
                    style={{
                        transform: `translateY(${depth * 8}px) scale(${1 - depth * 0.04})`,
                        opacity: 1 - depth * 0.35,
                        zIndex: -depth
                    }}
                />
            );
        })}

        {/* Current Active Card */}
        <div className="absolute inset-0 overflow-hidden rounded-3xl">
            <AnimatePresence mode="popLayout" initial={false} custom={direction}>
                <motion.div
                    key={currentIndex}
                    custom={direction}
                    variants={variants}
                    initial="initial"
                    animate="active"
                    exit="exit"
                    transition={{ 
                        type: 'spring', 
                        damping: 28, 
                        stiffness: 300, 
                        mass: 0.6,
                    }}
                    className="absolute inset-0 p-5 rounded-3xl bg-card border border-card-border shadow-xl flex flex-col group/card cursor-pointer hover:border-emerald-500/20 transition-colors duration-300"
                >
                    <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative z-10">
                        <div className="flex items-center justify-between mb-3 shrink-0">
                            <div className="flex items-center gap-2.5">
                            <div className={`p-1.5 rounded-lg bg-background/50 border border-card-border ${notes[currentIndex].color}`}>
                                {React.createElement(getIcon(notes[currentIndex].type), { className: "text-sm" })}
                            </div>
                            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-(--text-muted) opacity-50">
                                {notes[currentIndex].type}
                            </span>
                            </div>
                            <div className="text-[9px] text-(--text-muted) font-bold font-numbers px-2 py-0.5 rounded-full bg-foreground/[0.02] border border-card-border">
                            {currentIndex + 1} / {notes.length}
                            </div>
                        </div>
                        
                        <h3 className="text-lg font-bold text-foreground leading-tight mb-2 group-hover/card:text-emerald-400 transition-colors line-clamp-2 uppercase tracking-tight">
                            {notes[currentIndex].title}
                        </h3>
                        
                        <div className="flex-1 overflow-hidden">
                            <p className="text-xs text-(--text-muted) font-medium leading-relaxed italic opacity-70 line-clamp-[6]">
                                &quot;{notes[currentIndex].content?.replace(/<[^>]*>/g, '').trim() || 'No briefings recorded for this tactical note.'}&quot;
                            </p>
                        </div>
                    </div>
                    
                    <div className="mt-auto pt-3 border-t border-card-border/50 flex items-center justify-between shrink-0 relative z-10">
                        <div className="flex items-center gap-2">
                            <div className="w-1 h-1 rounded-full bg-emerald-500/50" />
                            <p className="text-[9px] text-(--text-muted) font-bold font-numbers uppercase tracking-widest" suppressHydrationWarning>
                                {notes[currentIndex].updatedAt ? new Date(notes[currentIndex].updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'ARCHIVED'}
                            </p>
                        </div>
                    </div>
                </motion.div>
            </AnimatePresence>
        </div>

        {/* Absolute Control Group - Bottom Right Overlay */}
        <div className="absolute bottom-4 right-4 flex flex-col gap-2 z-50">
          <button 
            onClick={(e) => { e.stopPropagation(); prevNote(); }}
            className="w-8 h-8 rounded-full bg-background/80 border border-card-border text-(--text-muted) flex items-center justify-center hover:bg-emerald-500 hover:text-emerald-950 hover:border-emerald-400 transition-all active:scale-90 backdrop-blur-md shadow-sm"
            title="Previous Note"
          >
            <FiChevronUp className="text-lg" />
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); nextNote(); }}
            className="w-8 h-8 rounded-full bg-background/80 border border-card-border text-(--text-muted) flex items-center justify-center hover:bg-emerald-500 hover:text-emerald-950 hover:border-emerald-400 transition-all active:scale-90 backdrop-blur-md shadow-sm"
            title="Next Note"
          >
            <FiChevronDown className="text-lg" />
          </button>
        </div>
      </div>
    </div>
  );
}
