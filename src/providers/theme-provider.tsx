'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: 'light' | 'dark';
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const STORAGE_KEY = 'md_platform_theme_preference';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      return (stored === 'light' || stored === 'dark' || stored === 'system') ? (stored as Theme) : 'system';
    }
    return 'system';
  });
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('dark');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

  const updateTheme = React.useCallback((currentTheme: Theme) => {
    const root = window.document.documentElement;
    let activeTheme: 'light' | 'dark' = 'dark';
    
    if (currentTheme === 'system') {
      activeTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } else {
      activeTheme = currentTheme;
    }
    
    root.classList.remove('light', 'dark');
    root.classList.add(activeTheme);
    setResolvedTheme(activeTheme);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    
    const timer = setTimeout(() => {
      updateTheme(theme);
    }, 0);
    
    localStorage.setItem(STORAGE_KEY, theme);

    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const listener = () => updateTheme('system');
      mediaQuery.addEventListener('change', listener);
      return () => {
        clearTimeout(timer);
        mediaQuery.removeEventListener('change', listener);
      };
    }
    
    return () => clearTimeout(timer);
  }, [theme, mounted, updateTheme]);

  const toggleTheme = () => {
    setThemeState((prev) => {
      if (prev === 'system') return 'light';
      if (prev === 'light') return 'dark';
      return 'system';
    });
  };

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
