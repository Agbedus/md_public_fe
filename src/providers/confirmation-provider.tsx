'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect, useRef } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { FiAlertTriangle, FiInfo, FiTrash2 } from 'react-icons/fi';
import { playNotificationSound, getSoundEffectsEnabled } from '@/lib/notification-sounds';

interface ConfirmationOptions {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type?: 'danger' | 'warning' | 'info';
}

interface ConfirmationContextType {
    confirm: (options: ConfirmationOptions) => Promise<boolean>;
}

const ConfirmationContext = createContext<ConfirmationContextType | undefined>(undefined);

export const useConfirm = () => {
    const context = useContext(ConfirmationContext);
    if (!context) {
        throw new Error('useConfirm must be used within a ConfirmationProvider');
    }
    return context.confirm;
};

export const ConfirmationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [options, setOptions] = useState<ConfirmationOptions | null>(null);
    const [resolveRef, setResolveRef] = useState<((value: boolean) => void) | null>(null);
    const cancelButtonRef = useRef<HTMLButtonElement>(null);
    const shouldReduceMotion = useReducedMotion();

    const confirm = useCallback((confirmOptions: ConfirmationOptions) => {
        return new Promise<boolean>((resolve) => {
            setOptions(confirmOptions);
            setResolveRef(() => resolve);
        });
    }, []);

    useEffect(() => {
        if (options && getSoundEffectsEnabled()) {
            playNotificationSound(options.type === 'danger' ? 'error' : options.type || 'info');
        }
    }, [options]);

    const handleConfirm = useCallback(() => {
        if (resolveRef) resolveRef(true);
        setOptions(null);
    }, [resolveRef]);

    const handleCancel = useCallback(() => {
        if (resolveRef) resolveRef(false);
        setOptions(null);
    }, [resolveRef]);

    useEffect(() => {
        if (!options) return;
        cancelButtonRef.current?.focus();
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') handleCancel();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleCancel, options]);

    return (
        <ConfirmationContext.Provider value={{ confirm }}>
            {children}
            
            <AnimatePresence>
                {options && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 pointer-events-none">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={handleCancel}
                            className="absolute inset-0 bg-white/60 dark:bg-black/60 backdrop-blur-md pointer-events-auto"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: shouldReduceMotion ? 1 : 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: shouldReduceMotion ? 1 : 0.985 }}
                            transition={{ duration: shouldReduceMotion ? 0 : 0.16, ease: [0.23, 1, 0.32, 1] }}
                            role="alertdialog"
                            aria-modal="true"
                            aria-labelledby="confirmation-title"
                            aria-describedby="confirmation-message"
                            className="relative w-full max-w-[360px] bg-background border border-card-border rounded-[28px] overflow-hidden pointer-events-auto"
                        >
                            <div className="p-6">
                                <div className="flex items-start gap-3">
                                    <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${
                                        options.type === 'danger' ? 'bg-danger/12 text-danger-text' :
                                        options.type === 'info' ? 'bg-accent/12 text-accent-text' :
                                        'bg-warning/15 text-warning-text'
                                    }`}>
                                        {options.type === 'info' ? <FiInfo size={16} /> : <FiAlertTriangle size={16} />}
                                    </div>
                                    <div className="min-w-0 pt-0.5">
                                        <h3 id="confirmation-title" className="text-[15px] font-semibold text-foreground leading-snug">
                                            {options.title}
                                        </h3>
                                        <p id="confirmation-message" className="text-sm text-text-muted leading-relaxed mt-1">
                                            {options.message}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 mt-6">
                                    <button
                                        ref={cancelButtonRef}
                                        onClick={handleCancel}
                                        className="md-btn md-btn-secondary flex-1"
                                    >
                                        {options.cancelText || 'Cancel'}
                                    </button>
                                    <button
                                        onClick={handleConfirm}
                                        className={`md-btn flex-1 ${options.type === 'danger' ? 'md-btn-danger' : 'md-btn-primary'}`}
                                    >
                                        {options.type === 'danger' && <FiTrash2 className="h-3.5 w-3.5 shrink-0" />}
                                        {options.confirmText || (options.type === 'danger' ? 'Delete' : 'Confirm')}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </ConfirmationContext.Provider>
    );
};
