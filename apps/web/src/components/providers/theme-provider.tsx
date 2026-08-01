'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

export type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('system');

  const applyTheme = (newTheme: Theme) => {
    const root = document.documentElement;
    root.classList.remove('light', 'dark');

    if (newTheme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      root.classList.add(systemTheme);
    } else {
      root.classList.add(newTheme);
    }
  };

  useEffect(() => {
    const savedTheme = (localStorage.getItem('cmhub_theme') as Theme) || 'system';
    setThemeState(savedTheme);
    applyTheme(savedTheme);
  }, []);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('cmhub_theme', newTheme);
    applyTheme(newTheme);
  };

  useEffect(() => {
    if (theme !== 'system') return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      applyTheme('system');
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    // Return fallback if used outside provider during SSR/testing
    return {
      theme: 'system' as Theme,
      setTheme: () => {},
    };
  }
  return context;
}
