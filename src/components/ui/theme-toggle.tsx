'use client';

import React from 'react';
import { FiSun, FiMoon, FiMonitor } from 'react-icons/fi';
import { useTheme } from '@/providers/theme-provider';
import { motion, AnimatePresence } from 'framer-motion';
import { spring, springTap } from '@/lib/motion';
import { useIsClient } from '@/hooks/use-is-client';

export function ThemeToggle({ 
  collapsed = false, 
  minimal = false 
}: { 
  collapsed?: boolean;
  minimal?: boolean;
}) {
  const { theme, toggleTheme, resolvedTheme } = useTheme();
  const mounted = useIsClient();

  const currentTheme = mounted ? theme : 'system';

  const getIcon = () => {
    switch (currentTheme) {
      case 'light': return <FiSun className="text-[var(--pastel-amber)]" />;
      case 'dark': return <FiMoon className="text-[var(--pastel-blue)]" />;
      default: return <FiMonitor className="text-(--text-muted)" />;
    }
  };

  const getLabel = () => {
    switch (currentTheme) {
      case 'light': return 'Light mode';
      case 'dark': return 'Dark mode';
      default: return 'System mode';
    }
  };

  if (minimal) {
    return (
      <motion.button
        onClick={toggleTheme}
        whileHover={{ scale: 1.07, transition: spring }}
        whileTap={{ scale: 0.88, rotate: -12, transition: springTap }}
        className="relative grid h-9 w-9 place-items-center rounded-full bg-foreground/[0.05] hover:bg-foreground/[0.09] transition-colors duration-200 group overflow-hidden"
        data-tooltip={`Switch theme (currently ${getLabel()})`} aria-label={`Switch theme (currently ${getLabel()})`}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={currentTheme}
            initial={{ y: 20, opacity: 0, rotate: -45 }}
            animate={{ y: 0, opacity: 1, rotate: 0 }}
            exit={{ y: -20, opacity: 0, rotate: 45 }}
            transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
            className="text-[15px] flex items-center justify-center h-4 w-4"
          >
            {getIcon()}
          </motion.div>
        </AnimatePresence>
      </motion.button>
    );
  }

  return (
    <motion.button
      onClick={toggleTheme}
      whileHover={{ transition: spring }}
      whileTap={{ scale: 0.97, transition: springTap }}
      className={`
        flex items-center gap-3 py-2 px-6 rounded-full transition-colors duration-200
        hover:bg-foreground/[0.03] text-(--text-muted) hover:text-foreground group relative
        ${collapsed ? 'justify-center px-0' : 'justify-start'}
      `}
      data-tooltip={`Switch theme (currently ${getLabel()})`} aria-label={`Switch theme (currently ${getLabel()})`}
    >
      <div className={`flex-shrink-0 text-lg transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12`}>
        {getIcon()}
      </div>
      {!collapsed && (
        <span className="text-sm font-medium whitespace-nowrap">
          {getLabel()}
        </span>
      )}

      {/* Visual Indicator of resolved theme if in system mode */}
      {currentTheme === 'system' && !collapsed && (
        <div className="ml-auto w-1.5 h-1.5 rounded-full bg-accent/50" />
      )}
    </motion.button>
  );
}

