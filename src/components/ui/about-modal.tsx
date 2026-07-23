"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { FiX, FiGithub, FiGlobe, FiCpu, FiShield, FiHeart } from "react-icons/fi";

interface AboutModalProps {
    isOpen: boolean;
    onClose: () => void;
    version: string;
}

import { Portal } from "./portal";

export function AboutModal({ isOpen, onClose, version }: AboutModalProps) {
    return (
        <Portal>
            <AnimatePresence mode="wait">
                {isOpen && (
                    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 sm:p-6">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={onClose}
                            className="absolute inset-0 bg-white/60 dark:bg-black/60 backdrop-blur-md"
                        />
                        
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="relative w-full max-w-xl bg-background border border-card-border rounded-[3rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] overflow-hidden"
                        >
                            <button
                                onClick={onClose}
                                className="absolute top-8 right-8 p-2 rounded-2xl hover:bg-foreground/[0.05] text-text-secondary hover:text-foreground transition-all z-20"
                            >
                                <FiX className="w-5 h-5" />
                            </button>

                            <div className="p-10 lg:p-12 text-center space-y-10">
                                <div className="space-y-6">
                                    <div className="mx-auto w-28 h-28 rounded-[2rem] bg-foreground/[0.03] flex items-center justify-center border border-card-border relative group">
                                        <div className="absolute inset-0 bg-indigo-500/10 rounded-[2rem] blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                                        <Image 
                                            src="/logo.svg" 
                                            alt="MD Logo" 
                                            width={72} 
                                            height={72} 
                                            className="w-14 h-14 object-contain relative z-10"
                                        />
                                    </div>
                                    <div>
                                        <h2 className="text-3xl font-black text-foreground uppercase tracking-tight">MD Platform</h2>
                                        <div className="flex items-center justify-center gap-2 mt-4 font-numbers">
                                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted">Core Version</span>
                                            <span className="px-3 py-0.5 rounded-full bg-indigo-500 text-white text-[10px] font-black uppercase tracking-wider shadow-sm">{version}</span>
                                            <span className="px-3 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-500 border border-amber-500/20 text-[10px] font-black uppercase tracking-wider">Operational</span>
                                        </div>
                                    </div>
                                </div>

                                <p className="text-text-secondary text-base leading-relaxed max-w-md mx-auto font-bold uppercase tracking-tight">
                                    A bespoke, secure, and intelligent productivity ecosystem designed for high-performance teams and strategic maneuvers.
                                </p>

                                <div className="grid grid-cols-3 gap-6 pt-2">
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="w-14 h-14 rounded-2xl bg-foreground/[0.03] border border-card-border flex items-center justify-center text-indigo-400 group hover:bg-indigo-500/10 transition-colors">
                                            <FiCpu className="w-6 h-6" />
                                        </div>
                                        <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">Intelligent</span>
                                    </div>
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="w-14 h-14 rounded-2xl bg-foreground/[0.03] border border-card-border flex items-center justify-center text-emerald-400 group hover:bg-emerald-500/10 transition-colors">
                                            <FiShield className="w-6 h-6" />
                                        </div>
                                        <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">Secure</span>
                                    </div>
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="w-14 h-14 rounded-2xl bg-foreground/[0.03] border border-card-border flex items-center justify-center text-amber-400 group hover:bg-amber-500/10 transition-colors">
                                            <FiHeart className="w-6 h-6" />
                                        </div>
                                        <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">Bespoke</span>
                                    </div>
                                </div>

                                <div className="pt-10 border-t border-card-border flex flex-col items-center gap-6">
                                    <div className="flex items-center gap-8">
                                        <a href="#" className="text-text-muted hover:text-foreground transition-all hover:scale-110"><FiGithub className="w-5 h-5" /></a>
                                        <a href="#" className="text-text-muted hover:text-foreground transition-all hover:scale-110"><FiGlobe className="w-5 h-5" /></a>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.3em]">
                                            © 2026 MD TECHNOLOGIES
                                        </p>
                                        <p className="text-[8px] font-bold text-text-muted/30 uppercase tracking-[0.2em]">
                                            ALL RIGHTS RESERVED • SUPRA-LEVEL SECURITY ENFORCED
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </Portal>
    );
}
