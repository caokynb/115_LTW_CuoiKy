import React, { createContext, useContext, useEffect, useCallback, useMemo } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';

const ThemeContext = createContext(null);

const THEME_STORAGE_KEY = 'cinema_theme';

/**
 * Provider quản lý giao diện sáng / tối và lưu vào localStorage.
 */
export function ThemeProvider({ children }) {
  const [theme, setThemeStorage] = useLocalStorage(THEME_STORAGE_KEY, () => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  });

  const normalizedTheme = theme === 'dark' ? 'dark' : 'light';

  useEffect(() => {
    const root = document.documentElement;
    if (normalizedTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    root.setAttribute('data-theme', normalizedTheme);
  }, [normalizedTheme]);

  const setTheme = useCallback(
    (nextTheme) => {
      setThemeStorage(nextTheme === 'dark' ? 'dark' : 'light');
    },
    [setThemeStorage]
  );

  const toggleTheme = useCallback(() => {
    setThemeStorage((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, [setThemeStorage]);

  const value = useMemo(
    () => ({
      theme: normalizedTheme,
      isDark: normalizedTheme === 'dark',
      toggleTheme,
      setTheme,
    }),
    [normalizedTheme, toggleTheme, setTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/**
 * Hook truy cập ThemeContext.
 */
export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme phải được sử dụng bên trong ThemeProvider');
  }
  return context;
}

export default ThemeContext;
