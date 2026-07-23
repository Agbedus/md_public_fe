'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { FiAlertTriangle, FiTrash2, FiX } from 'react-icons/fi';
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

    const confirm = useCallback((confirmOptions: ConfirmationOptions) => {
        return new Promise<boolean>((resolve) => {
            setOptions(confirmOptions);
            setResolveRef(() => resolve);
        });
    }, []);

    useEffect(() => {
        if (options && getSoundEffectsEnabled()) {
            playNotificationSound('error');
        }
    }, [options]);

    const handleConfirm = () => {
        if (resolveRef) resolveRef(true);
        setOptions(null);
    };

    const handleCancel = () => {
        if (resolveRef) resolveRef(false);
        setOptions(null);
    };

    return (
        <ConfirmationContext.Provider value={{ confirm }}>
            {children}
            
            <AnimatePresence>
                {options && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6 pointer-events-none">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={handleCancel}
                            className="absolute inset-0 bg-white/60 dark:bg-black/60 backdrop-blur-md pointer-events-auto"
                        />
                        <motion.div
                            initial={{ opacity: 0, y: 50, scale: 0.9, x: 20 }}
                            animate={{ opacity: 1, y: 0, scale: 1, x: 0 }}
                            exit={{ opacity: 0, y: 20, scale: 0.95, x: 10 }}
                            className="relative w-full max-w-sm bg-background border border-card-border rounded-[2.5rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] overflow-hidden pointer-events-auto"
                        >
                            <div className="p-8 space-y-6">
                                <div className="flex items-start gap-4">
                                    <div className={`p-4 rounded-3xl ${
                                        options.type === 'danger' ? 'bg-rose-500/10 text-rose-600 dark:text-rose-500 border-rose-500/20' : 
                                        'bg-amber-500/10 text-amber-600 dark:text-amber-500 border-amber-500/20'
                                    } border flex items-center justify-center shrink-0 shadow-sm`}>
                                        <FiAlertTriangle size={24} />
                                    </div>
                                    <div className="space-y-2">
                                        <h3 className="text-lg font-black text-foreground tracking-tight leading-tight uppercase">
                                            {options.title}
                                        </h3>
                                        <p className="text-sm text-text-secondary font-bold leading-relaxed uppercase tracking-tight">
                                            {options.message}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={handleCancel}
                                        className="flex-1 px-6 py-3.5 rounded-2xl bg-foreground/[0.05] hover:bg-foreground/[0.08] border border-card-border text-xs font-bold text-text-muted uppercase tracking-widest transition-all flex items-center justify-center gap-2 whitespace-nowrap"
                                    >
                                        <FiX size={14} />
                                        {options.cancelText?.split(' ')[0] || 'Cancel'}
                                    </button>
                                    <button
                                        onClick={handleConfirm}
                                        className={`flex-1 px-6 py-3.5 rounded-2xl ${
                                            options.type === 'danger' ? 'bg-rose-500 hover:bg-rose-600' : 
                                            'bg-amber-500 hover:bg-amber-600'
                                        } text-white text-xs font-bold uppercase tracking-widest transition-all shadow-md flex items-center justify-center gap-2 whitespace-nowrap`}
                                    >
                                        <FiTrash2 size={14} />
                                        {options.confirmText?.split(' ')[0] || (options.type === 'danger' ? 'Delete' : 'Confirm')}
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
