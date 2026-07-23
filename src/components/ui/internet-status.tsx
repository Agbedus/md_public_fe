'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import PipMascot from './assistant/pip-mascot';

export default function InternetStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [showRecovery, setShowRecovery] = useState(false);
  const wasOffline = useRef(false);

  useEffect(() => {
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      if (wasOffline.current) {
        setShowRecovery(true);
        setTimeout(() => setShowRecovery(false), 3000);
      }
      wasOffline.current = false;
    };

    const handleOffline = () => {
      setIsOnline(false);
      wasOffline.current = true;
      setShowRecovery(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <>
      {/* Desktop bar — same position/dimensions as AI orb */}
      <AnimatePresence mode="popLayout">
        {!isOnline && (
          <motion.div
            key="offline"
            layout
            initial={{ y: 20, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 20, opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="hidden md:flex fixed bottom-0 left-0 right-0 z-[60] justify-center"
          >
            <div className="w-full max-w-2xl mx-4">
              <div className="relative mx-4 mb-2">
                <div className="rounded-3xl border-2 border-red-500/40 overflow-hidden shadow-lg bg-background">
                  <div className="flex items-center justify-between px-5 py-4">
                    <div className="flex items-center gap-4">
                      <div className="shrink-0 flex items-center justify-center w-12 h-12">
                        <PipMascot variant="sleepy" status="error" size="md" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-red-400">No internet connection</p>
                        <p className="text-xs text-red-400/70 font-medium mt-0.5">Some features may be unavailable</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-red-400/60">Offline</span>
                      <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="popLayout">
        {showRecovery && isOnline && (
          <motion.div
            key="recovery"
            layout
            initial={{ y: 20, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 20, opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="hidden md:flex fixed bottom-0 left-0 right-0 z-[60] justify-center"
          >
            <div className="w-full max-w-2xl mx-4">
              <div className="relative mx-4 mb-2">
                <div className="rounded-3xl border-2 border-emerald-500/40 overflow-hidden shadow-lg bg-background">
                  <div className="flex items-center justify-between px-5 py-4">
                    <div className="flex items-center gap-4">
                      <div className="shrink-0 flex items-center justify-center w-12 h-12">
                        <PipMascot variant="lovely" status="idle" size="md" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-emerald-400">Connection restored</p>
                        <p className="text-xs text-emerald-400/70 font-medium mt-0.5">All features are back online</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400/60">Online</span>
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="w-2.5 h-2.5 rounded-full bg-emerald-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile indicator — same position as floating AI button */}
      <AnimatePresence mode="popLayout">
        {!isOnline && (
          <motion.div
            key="mobile-offline"
            layout
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            className="md:hidden fixed right-5 z-[60]"
            style={{ bottom: 'calc(4rem + 12px)' }}
          >
            <div className="relative">
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute inset-0 rounded-full bg-red-500/20 blur-md"
              />
              <div className="relative w-14 h-14 rounded-full bg-background border-2 border-red-500/50 shadow-lg flex items-center justify-center">
                <PipMascot variant="sleepy" status="error" size="sm" />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="popLayout">
        {showRecovery && isOnline && (
          <motion.div
            key="mobile-recovery"
            layout
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            className="md:hidden fixed right-5 z-[60]"
            style={{ bottom: 'calc(4rem + 12px)' }}
          >
            <div className="relative">
              <motion.div
                initial={{ scale: 1 }}
                animate={{ scale: 1.3 }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute inset-0 rounded-full bg-emerald-500/20 blur-md"
              />
              <div className="relative w-14 h-14 rounded-full bg-background border-2 border-emerald-500/50 shadow-lg flex items-center justify-center">
                <PipMascot variant="lovely" status="idle" size="sm" />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
