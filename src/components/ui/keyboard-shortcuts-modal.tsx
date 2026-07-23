'use client';

import { FiX as IconX, FiCommand as IconCmd, FiInfo as IconInfo } from 'react-icons/fi';
import { Portal } from '@/components/ui/portal';
import { useEffect, useState } from 'react';

interface KeyboardShortcutsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function KeyboardShortcutsModal({ isOpen, onClose }: KeyboardShortcutsModalProps) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Prevent scrolling when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    if (!mounted || !isOpen) return null;

    const shortcuts = [
        { key: '?', description: 'Show keyboard shortcuts' },
        { key: 't', description: 'Toggle Theme (Light/Dark)' },
        { key: 'n', description: 'Create a new note' },
        { key: 'c', description: 'Open Command Palette' },
        { key: 'a', description: 'Go to Attendance / Clock In' },
        { key: '⌘ + K', description: 'Global Search / Actions', isCmd: true },
        { key: 'g h', description: 'Navigate to Dashboard' },
        { key: 'g p', description: 'Navigate to Projects' },
        { key: 'g t', description: 'Navigate to Tasks' },
        { key: 'g n', description: 'Navigate to Notes' },
        { key: 'g l', description: 'Navigate to Clients' },
        { key: 'Esc', description: 'Close any open modal or command palette' },
    ];

    return (
        <Portal>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
                <div 
                    className="absolute inset-0 bg-white/60 dark:bg-black/60 backdrop-blur-md transition-opacity"
                    onClick={onClose}
                />
                <div 
                    className="relative w-full max-w-md bg-background border border-card-border rounded-3xl shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] overflow-hidden animate-in fade-in zoom-in-95 duration-200"
                    role="dialog"
                    aria-modal="true"
                >
                    <div className="flex items-center justify-between p-5 border-b border-card-border bg-foreground/[0.03]">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-[var(--pastel-purple)]/10 rounded-lg">
                                <IconCmd className="text-[var(--pastel-purple)] text-lg" />
                            </div>
                            <h2 className="text-lg font-black text-foreground tracking-tight uppercase">Shortcuts</h2>
                        </div>
                        <button 
                            onClick={onClose}
                            className="p-2 rounded-xl text-text-secondary hover:text-foreground hover:bg-foreground/[0.05] transition-all hover-scale"
                            aria-label="Close modal"
                        >
                            <IconX />
                        </button>
                    </div>

                    <div className="p-5 space-y-4">
                        <div className="flex items-start gap-3 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-400">
                            <IconInfo className="shrink-0 mt-0.5" />
                            <p className="text-[10px] font-black uppercase tracking-widest leading-relaxed">
                                Shortcuts only work when you are not typing in a text field. Press <kbd className="px-1.5 py-0.5 mx-0.5 rounded-md bg-background border border-card-border font-mono text-[10px] text-foreground">Esc</kbd> to exit any text field.
                            </p>
                        </div>

                        <div className="space-y-1">
                            {shortcuts.map((shortcut, idx) => (
                                <div key={idx} className="flex items-center justify-between p-3 rounded-xl hover:bg-foreground/[0.03] transition-colors border border-transparent hover:border-card-border group">
                                    <span className="text-xs text-text-secondary font-black uppercase tracking-wider group-hover:text-foreground transition-colors">{shortcut.description}</span>
                                    <kbd className="px-2.5 py-1 rounded-lg bg-background border border-card-border font-mono text-[10px] font-black text-foreground shadow-sm flex items-center gap-1 group-hover:border-foreground/20 transition-colors">
                                        {shortcut.key}
                                    </kbd>
                                </div>
                            ))}
                        </div>
                    </div>
                    
                    <div className="p-4 border-t border-card-border bg-foreground/[0.03] flex justify-end">
                        <button
                            onClick={onClose}
                            className="px-5 py-2.5 bg-foreground text-background rounded-xl text-sm font-bold tracking-tight hover:opacity-90 transition-opacity active:scale-95"
                        >
                            Got it
                        </button>
                    </div>
                </div>
            </div>
        </Portal>
    );
}
