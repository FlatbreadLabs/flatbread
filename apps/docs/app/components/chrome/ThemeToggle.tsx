'use client';

import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

export const THEME_KEY = 'flatbread-docs-theme';

/**
 * Runs before the first paint so the page never flashes the wrong colours.
 * Kept as a string because it has to be inlined in the document head.
 */
export const themeScript = `
(function () {
  try {
    var stored = localStorage.getItem('${THEME_KEY}');
    var dark = stored ? stored === 'dark'
      : window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  } catch (error) {}
})();
`;

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('light');

  useEffect(() => {
    const current = document.documentElement.dataset.theme;
    setTheme(current === 'dark' ? 'dark' : 'light');
  }, []);

  const flip = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      // A browser that refuses storage still gets the change for this visit.
    }
    setTheme(next);
  };

  return (
    <button
      type="button"
      onClick={flip}
      className="fb-button"
      aria-label={`Switch to the ${theme === 'dark' ? 'light' : 'dark'} theme`}
    >
      Theme: {theme}
    </button>
  );
}
