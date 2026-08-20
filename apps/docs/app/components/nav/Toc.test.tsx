// @vitest-environment jsdom

import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { TocEntry } from '../../../lib/toc';
import { Toc } from './Toc';

const entries: TocEntry[] = [
  { id: 'first', text: 'First heading', depth: 2 },
  { id: 'second', text: 'Second heading', depth: 2 },
];

let container: HTMLDivElement;
let headings: HTMLElement[];
let root: Root;
let rootMounted: boolean;
let observerCallback: IntersectionObserverCallback;
const observerCreated = vi.fn();
const observe = vi.fn();
const disconnect = vi.fn();

class IntersectionObserverMock {
  constructor(callback: IntersectionObserverCallback) {
    observerCreated();
    observerCallback = callback;
  }

  observe(target: Element) {
    observe(target);
  }

  disconnect() {
    disconnect();
  }
}

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  observerCreated.mockReset();
  observe.mockReset();
  disconnect.mockReset();

  vi.stubGlobal('IntersectionObserver', IntersectionObserverMock);

  container = document.createElement('div');
  headings = entries.map((entry) => {
    const heading = document.createElement('h2');
    heading.id = entry.id;
    return heading;
  });
  document.body.append(container, ...headings);
  root = createRoot(container);
  rootMounted = true;
});

afterEach(async () => {
  if (rootMounted) await act(async () => root.unmount());
  container.remove();
  headings.forEach((heading) => heading.remove());
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('Toc', () => {
  it('marks the top visible heading as the current location', async () => {
    await renderToc();

    expect(container.textContent).toContain('Contents / this plate');
    expect(
      [...container.querySelectorAll('nav')].map((nav) =>
        nav.getAttribute('aria-label')
      )
    ).toEqual(['Contents / this plate', 'Contents / this plate']);
    expect(currentLinks()).toEqual(['#first', '#first']);
    expect(observe).toHaveBeenCalledTimes(2);
    expect(observe).toHaveBeenNthCalledWith(1, headings[0]);
    expect(observe).toHaveBeenNthCalledWith(2, headings[1]);

    await act(async () => {
      observerCallback(
        [intersection(headings[0], 200), intersection(headings[1], 80)],
        {} as IntersectionObserver
      );
    });

    expect(currentLinks()).toEqual(['#second', '#second']);
  });

  it('renders nothing and does not create an observer for empty entries', async () => {
    await renderToc([]);

    expect(container.innerHTML).toBe('');
    expect(observerCreated).not.toHaveBeenCalled();
    expect(observe).not.toHaveBeenCalled();
  });

  it('observes only headings that exist in the document', async () => {
    headings[1].remove();

    await renderToc();

    expect(observe).toHaveBeenCalledOnce();
    expect(observe).toHaveBeenCalledWith(headings[0]);
  });

  it('keeps the current location when no observed heading intersects', async () => {
    await renderToc();
    await act(async () => {
      observerCallback(
        [intersection(headings[1], 80)],
        {} as IntersectionObserver
      );
    });
    expect(currentLinks()).toEqual(['#second', '#second']);

    await act(async () => {
      observerCallback(
        [
          intersection(headings[0], 40, false),
          intersection(headings[1], 80, false),
        ],
        {} as IntersectionObserver
      );
    });

    expect(currentLinks()).toEqual(['#second', '#second']);
  });

  it('disconnects the heading observer on unmount', async () => {
    await renderToc();
    expect(disconnect).not.toHaveBeenCalled();

    await act(async () => root.unmount());
    rootMounted = false;

    expect(disconnect).toHaveBeenCalledOnce();
  });
});

async function renderToc(nextEntries: TocEntry[] = entries) {
  await act(async () => {
    root.render(createElement(Toc, { entries: nextEntries }));
  });
}

function currentLinks() {
  return [...container.querySelectorAll('[aria-current="location"]')].map(
    (link) => link.getAttribute('href')
  );
}

function intersection(
  target: HTMLElement,
  top: number,
  isIntersecting = true
): IntersectionObserverEntry {
  return {
    target,
    isIntersecting,
    boundingClientRect: { top },
  } as unknown as IntersectionObserverEntry;
}
