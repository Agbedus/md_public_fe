'use client';

import React, { useState, useEffect } from 'react';
import { useTaskTimer } from '@/providers/task-timer-provider';
import { motion, AnimatePresence } from 'framer-motion';
import { FiPause, FiPlay, FiSquare, FiClock, FiStar, FiAward, FiZap, FiTarget } from 'react-icons/fi';

export function TaskTimerUI() {
    const { activeTask, isPaused, elapsedTime, pauseTimer, resumeTimer, stopTimer } = useTaskTimer();
    const [milestone, setMilestone] = useState<number | null>(null);

    // Watch for milestones every 15 minutes (900 seconds)
    useEffect(() => {
        if (elapsedTime > 0 && elapsedTime % 900 === 0) {
            const milestoneNum = elapsedTime / 900;
            
            // Use a microtask to avoid synchronous setState warning and cascading renders
            queueMicrotask(() => {
                setMilestone(milestoneNum);
            });

            // Hide milestone after 5 seconds
            const timer = setTimeout(() => setMilestone(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [elapsedTime]);

    const formatTime = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    if (!activeTask) return null;

    return (
        <AnimatePresence>
            {!isPaused && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[100] bg-foreground/[0.03] flex items-center justify-center p-4 overflow-hidden"
                >
                    {/* Animated background highlights */}
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    </div>

                    <motion.div
                        initial={{ scale: 0.95, opacity: 0, y: 30 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 1.05, opacity: 0, y: -30 }}
                        transition={{ duration: 0.5, ease: "circOut" }}
                        className="w-full max-w-4xl glass border border-foreground/5 rounded-[40px] p-8 lg:p-16 -[0_0_100px_rgba(0,0,0,0.5)] relative overflow-hidden flex flex-col items-center text-center space-y-12"
                    >
                        {/* Header Section */}
                        <div className="space-y-4">
                            <motion.div 
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                                className="flex items-center justify-center gap-2"
                            >
                                <span className="px-4 py-1.5 rounded-full bg-accent/10 text-accent-text text-[11px] font-medium border border-accent/20 -[0_0_20px_rgba(99,102,241,0.1)]">
                                    Active Focus Mode
                                </span>
                            </motion.div>
                            
                            <motion.h2 
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                                className="text-4xl lg:text-7xl font-medium text-foreground tracking-tight leading-tight max-w-2xl mx-auto"
                            >
                                {activeTask.name}
                            </motion.h2>
                            
                            {activeTask.description && (
                                <motion.p 
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.4 }}
                                    className="text-text-muted text-base lg:text-xl font-medium max-w-xl mx-auto leading-relaxed"
                                >
                                    {activeTask.description}
                                </motion.p>
                            )}
                        </div>

                        {/* Timer Section */}
                        <div className="relative group">
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.5, duration: 0.7 }}
                                className="text-[120px] lg:text-[200px] font-medium text-foreground tracking-tight tabular-nums leading-none select-none filter blur-none group-hover:-[0_0_50px_rgba(255,255,255,0.15)] transition-all duration-700"
                            >
                                {formatTime(elapsedTime)}
                            </motion.div>
                            
                            {/* Decorative dots for milliseconds (simulated) */}
                            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 flex gap-3">
                                {[...Array(3)].map((_, i) => (
                                    <div key={i} className="w-1.5 h-1.5 rounded-full bg-accent/30 animate-bounce" style={{ animationDelay: `${i * 0.2}s` }} />
                                ))}
                            </div>
                        </div>

                        {/* Controls Section */}
                        <div className="flex items-center gap-6 lg:gap-12 pt-8">
                            <button
                                onClick={pauseTimer}
                                className="group relative flex flex-col items-center gap-3 transition-all hover-scale"
                            >
                                <div className="w-20 h-20 lg:w-24 lg:h-24 bg-foreground/[0.03] border border-foreground/5 flex items-center justify-center group-hover:bg-warning group-hover:border-warning group-hover:scale-110 transition-all duration-500 group-hover:-amber-500/20 rounded-full">
                                    <FiPause className="w-8 h-8 lg:w-10 lg:h-10 text-foreground transition-transform group-active:scale-95" />
                                </div>
                                <span className="text-[11px] font-medium text-text-muted group-hover:text-warning-text transition-colors">Break Time</span>
                            </button>

                            <button
                                onClick={stopTimer}
                                className="group relative flex flex-col items-center gap-3 transition-all hover-scale"
                            >
                                <div className="w-24 h-24 lg:w-32 lg:h-32 rounded-[32px] bg-danger/10 border border-danger/30 flex items-center justify-center group-hover:bg-danger group-hover:border-danger group-hover:scale-110 transition-all duration-500 group-hover:-rose-500/30">
                                    <FiSquare className="w-10 h-10 lg:w-12 lg:h-12 text-danger-text group-hover:text-foreground transition-transform group-active:scale-95" />
                                </div>
                                <span className="text-[11px] font-medium text-danger-text/80 group-hover:text-danger-text transition-colors">Complete task</span>
                            </button>
                        </div>

                        {/* Milestone Animation Overlay */}
                        <AnimatePresence>
                            {milestone && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.5, y: 50 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 1.5, y: -50 }}
                                    className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none"
                                >
                                    <div className="bg-accent text-on-accent px-12 py-8 rounded-[40px] -[0_0_80px_rgba(79,70,229,0.5)] flex flex-col items-center gap-4">
                                        <div className="relative">
                                            <FiAward className="w-20 h-20 animate-bounce" />
                                            <motion.div 
                                                animate={{ rotate: 360 }}
                                                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                                                className="absolute inset-0 border-4 border-foreground/30 border-t-white rounded-full"
                                            />
                                        </div>
                                        <div className="text-center">
                                            <h3 className="text-3xl font-medium tracking-tight">Milestone Reached!</h3>
                                            <p className="text-accent-text font-bold">{milestone * 15} Minutes of pure focus</p>
                                        </div>
                                        <div className="flex gap-2">
                                            {[...Array(milestone)].map((_, i) => (
                                                <FiZap key={i} className="text-warning-text fill-warning w-6 h-6" />
                                            ))}
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Footer Tips */}
                        <div className="pt-8 w-full">
                            <p className="text-[11px] font-bold text-text-muted opacity-50">
                                Deep Work in Progress • All notifications muted
                            </p>
                        </div>
                    </motion.div>
                </motion.div>
            )}

            {isPaused && (
                <motion.div
                    initial={{ opacity: 0, y: 20, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 20, scale: 0.9 }}
                    transition={{ duration: 0.3, ease: "circOut" }}
                    className="fixed bottom-6 right-6 z-[101]"
                >
                    <button
                        onClick={resumeTimer}
                        className="group flex items-center gap-3 h-12 pl-3 pr-2 rounded-2xl bg-foreground/[0.03] border border-foreground/5 -[0_8px_32px_rgba(0,0,0,0.6)] hover:border-accent/30 transition-all duration-300 backdrop-blur-2xl"
                    >
                        {/* Pulse dot */}
                        <div className="w-1.5 h-1.5 rounded-full bg-warning animate-pulse flex-shrink-0" />
                        {/* Task name + time */}
                        <div className="flex items-center gap-2">
                            <span className="text-[11px] font-medium text-text-muted capitalize max-w-[100px] truncate hidden sm:block">{activeTask.name}</span>
                            <span className="text-sm font-medium text-foreground tabular-nums tracking-tight">{formatTime(elapsedTime)}</span>
                        </div>
                        {/* Divider */}
                        <div className="w-px h-4 bg-foreground/[0.06]" />
                        {/* Play button */}
                        <div className="w-8 h-8 bg-accent/20 border border-accent/30 flex items-center justify-center group-hover:bg-accent group-hover:border-accent transition-all duration-300 rounded-full">
                            <FiPlay className="w-3.5 h-3.5 text-accent-text group-hover:text-foreground fill-current transition-colors" />
                        </div>
                    </button>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
