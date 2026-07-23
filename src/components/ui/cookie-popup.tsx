"use client";

import React, { useState, useEffect } from "react";
import { FiX, FiInfo, FiCheck, FiChevronDown, FiChevronUp, FiSettings, FiShield } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

const COOKIE_CONSENT_KEY = "md_dash_cookie_consent";
const COOKIE_PREFS_KEY = "md_dash_cookie_prefs";

export const CookiePopup = () => {
    const [isVisible, setIsVisible] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [prefs, setPrefs] = useState({
        essential: true,
        analytics: false,
        personalization: false
    });

    useEffect(() => {
        const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
        const storedPrefs = localStorage.getItem(COOKIE_PREFS_KEY);
        
        if (storedPrefs) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setPrefs(JSON.parse(storedPrefs));
        }

        if (!consent) {
            const timer = setTimeout(() => setIsVisible(true), 1500);
            return () => clearTimeout(timer);
        }

        // Listen for external trigger
        const handleTrigger = () => {
            setIsVisible(true);
            setShowSettings(true);
        };
        window.addEventListener('open-cookie-settings', handleTrigger);
        return () => window.removeEventListener('open-cookie-settings', handleTrigger);
    }, []);

    const savePrefs = (newConsent: string, newPrefs: typeof prefs) => {
        localStorage.setItem(COOKIE_CONSENT_KEY, newConsent);
        localStorage.setItem(COOKIE_PREFS_KEY, JSON.stringify(newPrefs));
        setIsVisible(false);
    };

    const handleAcceptAll = () => {
        const allOn = { essential: true, analytics: true, personalization: true };
        setPrefs(allOn);
        savePrefs("accepted", allOn);
    };

    const handleSaveSettings = () => {
        savePrefs("custom", prefs);
    };

    const togglePref = (key: keyof typeof prefs) => {
        if (key === 'essential') return; // Cannot toggle essential
        setPrefs(prev => ({ ...prev, [key]: !prev[key] }));
    };

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 100, opacity: 0 }}
                    className="fixed bottom-6 left-6 right-6 md:left-auto md:right-8 md:w-[450px] z-[100]"
                >
                    <div className="glass bg-background/80 backdrop-blur-2xl border border-card-border rounded-3xl p-6 shadow-2xl flex flex-col gap-6">
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                                    <FiShield className="text-indigo-400 text-lg" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Privacy Preference</h3>
                                    <p className="text-[10px] text-text-muted font-bold uppercase tracking-tight">Compliance Shield v1.0</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setIsVisible(false)}
                                className="p-2 hover:bg-foreground/[0.05] rounded-full text-text-secondary hover:text-foreground transition-colors"
                            >
                                <FiX />
                            </button>
                        </div>

                        {!showSettings ? (
                            <>
                                <p className="text-xs text-text-secondary leading-relaxed font-bold">
                                    We use cookies to enhance your executive oversight experience, analyze mission-critical traffic, and provide secure authentication. By clicking &quot;Accept All&quot;, you consent to our use of all cookies. 
                                    <button 
                                        onClick={() => setShowSettings(true)}
                                        className="text-indigo-500 dark:text-indigo-400 hover:underline ml-1 font-black"
                                    >
                                        Customize Preferences
                                    </button>
                                </p>

                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={handleAcceptAll}
                                        className="flex-1 bg-foreground text-background px-6 py-3 rounded-2xl text-xs font-bold hover:bg-foreground/90 transition-all flex items-center justify-center gap-2 active:scale-95"
                                    >
                                        <FiCheck className="text-lg" /> Accept All
                                    </button>
                                    <button
                                        onClick={() => savePrefs("declined", { essential: true, analytics: false, personalization: false })}
                                        className="px-6 py-3 rounded-2xl text-xs font-bold text-text-muted hover:bg-foreground/[0.05] transition-all border border-transparent hover:border-card-border"
                                    >
                                        Essential Only
                                    </button>
                                </div>
                            </>
                        ) : (
                            <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
                                <div className="space-y-3">
                                    {/* Essential */}
                                    <div className="p-4 rounded-2xl bg-foreground/[0.02] border border-card-border flex items-center justify-between group">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-bold text-foreground uppercase tracking-wide">Strictly Essential</span>
                                                <span className="px-1.5 py-0.5 rounded bg-card-border text-[8px] font-black text-text-muted uppercase tracking-tighter">Required</span>
                                            </div>
                                            <p className="text-[10px] text-text-muted leading-relaxed">Necessary for authentication, security, and platform stability.</p>
                                        </div>
                                        <div className="w-10 h-6 rounded-full bg-indigo-500/50 flex items-center px-1 opacity-50 cursor-not-allowed">
                                            <div className="w-4 h-4 rounded-full bg-white ml-auto" />
                                        </div>
                                    </div>

                                    {/* Analytics */}
                                    <div 
                                        onClick={() => togglePref('analytics')}
                                        className="p-4 rounded-2xl bg-foreground/[0.03] border border-card-border flex items-center justify-between cursor-pointer hover:bg-foreground/[0.06] transition-colors"
                                    >
                                        <div className="space-y-1">
                                            <span className="text-xs font-bold text-foreground uppercase tracking-wide">Performance & Intel</span>
                                            <p className="text-[10px] text-text-secondary font-bold leading-relaxed">Helps us understand operational velocity and bottleneck patterns.</p>
                                        </div>
                                        <div className={`w-10 h-6 rounded-full transition-colors flex items-center px-1 ${prefs.analytics ? 'bg-emerald-500' : 'bg-card-border'}`}>
                                            <motion.div 
                                                animate={{ x: prefs.analytics ? 16 : 0 }}
                                                className="w-4 h-4 rounded-full bg-white shadow-sm" 
                                            />
                                        </div>
                                    </div>

                                    {/* Personalization */}
                                    <div 
                                        onClick={() => togglePref('personalization')}
                                        className="p-4 rounded-2xl bg-foreground/[0.03] border border-card-border flex items-center justify-between cursor-pointer hover:bg-foreground/[0.06] transition-colors"
                                    >
                                        <div className="space-y-1">
                                            <span className="text-xs font-bold text-foreground uppercase tracking-wide">Personalization</span>
                                            <p className="text-[10px] text-text-secondary font-bold leading-relaxed">Remembers your preferred command-center layout and AI persona settings.</p>
                                        </div>
                                        <div className={`w-10 h-6 rounded-full transition-colors flex items-center px-1 ${prefs.personalization ? 'bg-indigo-500' : 'bg-card-border'}`}>
                                            <motion.div 
                                                animate={{ x: prefs.personalization ? 16 : 0 }}
                                                className="w-4 h-4 rounded-full bg-white shadow-sm" 
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={handleSaveSettings}
                                        className="flex-1 bg-foreground text-background px-6 py-3 rounded-2xl text-xs font-bold hover:bg-foreground/90 transition-all active:scale-95"
                                    >
                                        Save Preferences
                                    </button>
                                    <button
                                        onClick={() => setShowSettings(false)}
                                        className="px-4 py-3 rounded-2xl text-xs font-bold text-text-muted hover:text-foreground transition-all"
                                    >
                                        Back
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="pt-2 border-t border-card-border flex items-center justify-between">
                            <Link href="/privacy" className="text-[10px] font-bold text-text-muted hover:text-indigo-400 uppercase tracking-widest transition-colors">Privacy Policy</Link>
                            <Link href="/terms" className="text-[10px] font-bold text-text-muted hover:text-emerald-400 uppercase tracking-widest transition-colors">Terms of Use</Link>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
