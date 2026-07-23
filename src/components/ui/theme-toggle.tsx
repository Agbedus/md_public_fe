'use client';

import React from 'react';
import { FiSun, FiMoon, FiMonitor } from 'react-icons/fi';
import { useTheme } from '@/providers/theme-provider';
import { motion, AnimatePresence } from 'framer-motion';

export function ThemeToggle({ 
  collapsed = false, 
  minimal = false 
}: { 
  collapsed?: boolean;
  minimal?: boolean;
}) {
  const { theme, toggleTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

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
      case 'light': return 'Light Mode';
      case 'dark': return 'Dark Mode';
      default: return 'System Mode';
    }
  };

  if (minimal) {
    return (
      <button
        onClick={toggleTheme}
        className="relative p-2 rounded-xl bg-background/50 border border-card-border hover:bg-white/[0.06] hover:border-foreground/10 transition-all duration-300 group overflow-hidden"
        title={`Switch theme (currently ${getLabel()})`}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={currentTheme}
            initial={{ y: 20, opacity: 0, rotate: -45 }}
            animate={{ y: 0, opacity: 1, rotate: 0 }}
            exit={{ y: -20, opacity: 0, rotate: 45 }}
            transition={{ duration: 0.2, ease: "backOut" }}
            className="text-lg flex items-center justify-center h-5 w-5"
          >
            {getIcon()}
          </motion.div>
        </AnimatePresence>
      </button>
    );
  }

  return (
    <button
      onClick={toggleTheme}
      className={`
        flex items-center gap-3 py-2 px-6 rounded-lg transition-all duration-200 
        hover:bg-white/[0.03] text-(--text-muted) hover:text-foreground group relative
        ${collapsed ? 'justify-center px-0' : 'justify-start'}
      `}
      title={`Switch theme (currently ${getLabel()})`}
    >
      <div className={`flex-shrink-0 text-lg transition-transform duration-300 group-hover:scale-110`}>
        {getIcon()}
      </div>
      {!collapsed && (
        <span className="text-sm font-bold uppercase tracking-tight whitespace-nowrap">
          {getLabel()}
        </span>
      )}
      
      {/* Visual Indicator of resolved theme if in system mode */}
      {currentTheme === 'system' && !collapsed && (
        <div className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-500/50" />
      )}
    </button>
  );
}
