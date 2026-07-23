import { useEffect, useState } from 'react';

type ShortcutMap = {
    [key: string]: (e: KeyboardEvent) => void;
};

export function useGlobalShortcuts(shortcuts: ShortcutMap) {
    const [lastChar, setLastChar] = useState<string | null>(null);
    const [timer, setTimer] = useState<NodeJS.Timeout | null>(null);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore if we're typing in an input, textarea, or contentEditable
            const activeTag = document.activeElement?.tagName.toLowerCase();
            const isContentEditable = document.activeElement?.getAttribute('contenteditable') === 'true';
            
            if (activeTag === 'input' || activeTag === 'textarea' || isContentEditable) {
                if (e.key !== 'Escape') return;
            }

            // Handle sequences (like 'g' then 'h')
            if (e.key === 'g' && !e.metaKey && !e.ctrlKey) {
                setLastChar('g');
                if (timer) clearTimeout(timer);
                setTimer(setTimeout(() => setLastChar(null), 1000)); // 1s window for sequence
                return;
            }

            let shortcutKey = e.key;
            if (lastChar === 'g') {
                shortcutKey = `g ${e.key}`;
                setLastChar(null);
                if (timer) clearTimeout(timer);
            } else if (e.metaKey || e.ctrlKey) {
                shortcutKey = `${e.metaKey ? '⌘' : 'Ctrl'}+${e.key.toUpperCase()}`;
            }

            const handler = shortcuts[shortcutKey] || shortcuts[e.key];
            if (handler) {
                // Prevent default for single character shortcuts or sequences to avoid typing them
                if ((e.key.length === 1 || shortcutKey.includes(' ')) && !e.metaKey && !e.ctrlKey) {
                    e.preventDefault();
                }
                handler(e);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [shortcuts, lastChar, timer]);
}
