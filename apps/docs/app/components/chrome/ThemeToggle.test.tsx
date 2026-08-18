// @vitest-environment jsdom

import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { THEME_KEY, ThemeToggle, themeScript } from './ThemeToggle';

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  localStorage.clear();
  delete document.documentElement.dataset.theme;

  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  localStorage.clear();
  delete document.documentElement.dataset.theme;
});

describe('ThemeToggle', () => {
  it('switches light to dark and back while persisting each choice', async () => {
    document.documentElement.dataset.theme = 'light';
    await renderToggle();

    expect(toggleButton().textContent).toBe('[◑ light]');
    expect(toggleButton().getAttribute('aria-label')).toBe(
      'Switch to the dark theme'
    );

    await clickToggle();

    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(localStorage.getItem(THEME_KEY)).toBe('dark');
    expect(toggleButton().textContent).toBe('[◐ dark]');
    expect(toggleButton().getAttribute('aria-label')).toBe(
      'Switch to the light theme'
    );

    await clickToggle();

    expect(document.documentElement.dataset.theme).toBe('light');
    expect(localStorage.getItem(THEME_KEY)).toBe('light');
    expect(toggleButton().textContent).toBe('[◑ light]');
  });

  it('still updates the document and control when storage rejects the write', async () => {
    document.documentElement.dataset.theme = 'light';
    const setItem = vi
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation(() => {
        throw new Error('Storage disabled');
      });
    await renderToggle();

    await clickToggle();

    expect(setItem).toHaveBeenCalledWith(THEME_KEY, 'dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(toggleButton().textContent).toBe('[◐ dark]');
  });
});

describe('themeScript', () => {
  it.each([
    ['dark', true, 'dark'],
    ['light', true, 'light'],
  ] as const)(
    'uses the stored %s choice before the system preference',
    (stored, systemDark, expected) => {
      localStorage.setItem(THEME_KEY, stored);
      const matchMedia = installMatchMedia(systemDark);

      runThemeScript();

      expect(document.documentElement.dataset.theme).toBe(expected);
      expect(matchMedia).not.toHaveBeenCalled();
    }
  );

  it.each([
    [true, 'dark'],
    [false, 'light'],
  ] as const)(
    'uses a %s dark-mode system preference when no choice is stored',
    (systemDark, expected) => {
      const matchMedia = installMatchMedia(systemDark);

      runThemeScript();

      expect(matchMedia).toHaveBeenCalledWith('(prefers-color-scheme: dark)');
      expect(document.documentElement.dataset.theme).toBe(expected);
    }
  );
});

async function renderToggle() {
  await act(async () => {
    root.render(createElement(ThemeToggle));
  });
}

async function clickToggle() {
  await act(async () => {
    toggleButton().dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
}

function toggleButton(): HTMLButtonElement {
  const button = container.querySelector<HTMLButtonElement>('button');
  if (!button) throw new Error('Theme toggle was not rendered.');
  return button;
}

function installMatchMedia(matches: boolean) {
  const matchMedia = vi.fn(() => ({
    matches,
  })) as unknown as typeof window.matchMedia;
  vi.stubGlobal('matchMedia', matchMedia);
  return matchMedia;
}

function runThemeScript() {
  Function(themeScript)();
}
