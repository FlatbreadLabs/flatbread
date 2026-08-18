// @vitest-environment jsdom

import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { NavDisclosure } from './NavDisclosure';

const navigation = vi.hoisted(() => ({ pathname: '/docs/first/' }));

vi.mock('next/navigation', () => ({
  usePathname: () => navigation.pathname,
}));

let container: HTMLDivElement;
let main: HTMLElement;
let root: Root;
let mediaMatches: boolean;
let mediaListeners: Set<() => void>;

beforeEach(() => {
  navigation.pathname = '/docs/first/';
  mediaMatches = false;
  mediaListeners = new Set();

  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.stubGlobal(
    'matchMedia',
    vi.fn(
      () =>
        ({
          get matches() {
            return mediaMatches;
          },
          media: '(min-width: 901px)',
          onchange: null,
          addEventListener: vi.fn(
            (type: string, listener: EventListenerOrEventListenerObject) => {
              if (type === 'change') mediaListeners.add(listener as () => void);
            }
          ),
          removeEventListener: vi.fn(
            (type: string, listener: EventListenerOrEventListenerObject) => {
              if (type === 'change')
                mediaListeners.delete(listener as () => void);
            }
          ),
        } as unknown as MediaQueryList)
    )
  );
  vi.stubGlobal(
    'requestAnimationFrame',
    vi.fn((callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    })
  );

  container = document.createElement('div');
  main = document.createElement('main');
  main.id = 'main-content';
  main.tabIndex = -1;
  document.body.append(container, main);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  main.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('NavDisclosure', () => {
  it('starts closed on a narrow screen', async () => {
    await renderDisclosure();

    expect(disclosure().open).toBe(false);
  });

  it('forces the navigation open when the screen becomes wide', async () => {
    await renderDisclosure();

    await act(async () => {
      mediaMatches = true;
      mediaListeners.forEach((listener) => listener());
    });

    expect(disclosure().open).toBe(true);
  });

  it('closes an open narrow-screen navigation after the pathname changes', async () => {
    await renderDisclosure();
    await openDisclosure();

    navigation.pathname = '/docs/second/';
    await renderDisclosure();

    expect(disclosure().open).toBe(false);
  });

  it('focuses main content after a narrow-screen pathname change', async () => {
    const focus = vi.spyOn(main, 'focus');
    await renderDisclosure();

    navigation.pathname = '/docs/second/';
    await renderDisclosure();

    expect(focus).toHaveBeenCalledOnce();
    expect(focus).toHaveBeenCalledWith({ preventScroll: false });
    expect(document.activeElement).toBe(main);
  });

  it('stays open without focusing main content after a wide-screen pathname change', async () => {
    mediaMatches = true;
    const focus = vi.spyOn(main, 'focus');
    await renderDisclosure();

    navigation.pathname = '/docs/second/';
    await renderDisclosure();

    expect(disclosure().open).toBe(true);
    expect(focus).not.toHaveBeenCalled();
  });

  it('does not throw when main content is missing after a narrow-screen pathname change', async () => {
    await renderDisclosure();
    main.remove();

    navigation.pathname = '/docs/second/';

    await expect(renderDisclosure()).resolves.toBeUndefined();
  });
});

async function renderDisclosure() {
  await act(async () => {
    root.render(
      createElement(NavDisclosure, {
        label: 'pages',
        children: createElement('nav', null, 'Page links'),
      })
    );
  });
}

async function openDisclosure() {
  await act(async () => {
    const element = disclosure();
    element.open = true;
    element.dispatchEvent(new Event('toggle', { bubbles: true }));
  });

  expect(disclosure().open).toBe(true);
}

function disclosure(): HTMLDetailsElement {
  const element = container.querySelector<HTMLDetailsElement>('details');
  if (!element) throw new Error('Navigation disclosure was not rendered.');
  return element;
}
