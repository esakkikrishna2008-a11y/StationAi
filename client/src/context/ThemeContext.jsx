import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [themeSetting, setThemeSetting] = useState(() => {
    return localStorage.getItem('stationai-theme') || 'dark';
  });

  const [effectiveTheme, setEffectiveTheme] = useState(() => {
    const saved = localStorage.getItem('stationai-theme') || 'dark';
    if (saved === 'system') {
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return saved;
  });

  // Update effective theme and apply to document root
  const applyTheme = useCallback((themeMode) => {
    let active = themeMode;
    if (themeMode === 'system') {
      active = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    setEffectiveTheme(active);
    document.documentElement.setAttribute('data-theme', active);
    document.documentElement.style.colorScheme = active;
  }, []);

  useEffect(() => {
    applyTheme(themeSetting);
    localStorage.setItem('stationai-theme', themeSetting);

    if (themeSetting === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = (e) => {
        const newTheme = e.matches ? 'dark' : 'light';
        setEffectiveTheme(newTheme);
        document.documentElement.setAttribute('data-theme', newTheme);
        document.documentElement.style.colorScheme = newTheme;
      };
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    }
  }, [themeSetting, applyTheme]);

  const toggleTheme = () => {
    setThemeSetting((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      return next;
    });
  };

  const setTheme = (mode) => {
    if (mode === 'light' || mode === 'dark' || mode === 'system') {
      setThemeSetting(mode);
    }
  };

  return (
    <ThemeContext.Provider value={{ theme: themeSetting, effectiveTheme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
