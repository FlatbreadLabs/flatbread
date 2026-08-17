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
let observerCallback: IntersectionObserverCallback;
const observe = vi.fn();
const disconnect = vi.fn();

class IntersectionObserverMock {
  constructor(callback: IntersectionObserverCallback) {
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
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  headings.forEach((heading) => heading.remove());
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('Toc', () => {
  it('marks the top visible heading as the current location', async () => {
    await act(async () => {
      root.render(createElement(Toc, { entries }));
    });

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
});

function currentLinks() {
  return [...container.querySelectorAll('[aria-current="location"]')].map(
    (link) => link.getAttribute('href')
  );
}

function intersection(
  target: HTMLElement,
  top: number
): IntersectionObserverEntry {
  return {
    target,
    isIntersecting: true,
    boundingClientRect: { top },
  } as unknown as IntersectionObserverEntry;
}
