'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type ColorMode = 'light' | 'dark';

const STORAGE_KEY = 'effort-viz-theme';

interface ThemeContextValue {
  mode: ColorMode;
  toggle: () => void;
  setMode: (mode: ColorMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function resolveInitialMode(): ColorMode {
  if (typeof document === 'undefined') return 'light';
  const attr = document.documentElement.dataset.theme;
  if (attr === 'light' || attr === 'dark') return attr;
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  }
  return 'light';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ColorMode>('light');
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setModeState(resolveInitialMode());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    document.documentElement.dataset.theme = mode;
    try {
      window.localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      // storage may be unavailable (e.g. private mode) — non-fatal
    }
  }, [mode, hydrated]);

  const setMode = useCallback((next: ColorMode) => {
    setModeState(next);
  }, []);

  const toggle = useCallback(() => {
    setModeState((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ mode, setMode, toggle }),
    [mode, setMode, toggle]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return ctx;
}

export const THEME_BOOT_SCRIPT = `(function(){try{var k='${STORAGE_KEY}';var s=localStorage.getItem(k);var m=(s==='light'||s==='dark')?s:(window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.dataset.theme=m;}catch(e){}})();`;
