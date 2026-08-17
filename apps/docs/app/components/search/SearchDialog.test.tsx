// @vitest-environment jsdom

import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { SearchEntry } from '../../../lib/content';
import { SearchDialog } from './SearchDialog';

const router = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock('next/navigation', () => ({ useRouter: () => router }));

const entries: SearchEntry[] = [
  {
    id: 'alpha',
    title: 'Alpha guide',
    href: '/docs/alpha/',
    kind: 'guide',
    group: 'Guides',
    summary: 'Alpha summary',
    body: 'Alpha guide body',
  },
  {
    id: 'beta',
    title: 'Beta guide',
    href: '/docs/beta/',
    kind: 'guide',
    group: 'Guides',
    summary: 'Beta summary',
    body: 'Beta guide body',
  },
];

let container: HTMLDivElement;
let root: Root;
const scrollIntoViewDescriptor = Object.getOwnPropertyDescriptor(
  HTMLElement.prototype,
  'scrollIntoView'
);
const showModalDescriptor = Object.getOwnPropertyDescriptor(
  HTMLDialogElement.prototype,
  'showModal'
);
const closeDescriptor = Object.getOwnPropertyDescriptor(
  HTMLDialogElement.prototype,
  'close'
);

beforeEach(() => {
  router.push.mockReset();
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);

  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    callback(0);
    return 1;
  });
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
    configurable: true,
    value: vi.fn(),
  });
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true,
    value: function showModal(this: HTMLDialogElement) {
      this.setAttribute('open', '');
    },
  });
  Object.defineProperty(HTMLDialogElement.prototype, 'close', {
    configurable: true,
    value: function close(this: HTMLDialogElement) {
      this.removeAttribute('open');
      this.dispatchEvent(new Event('close'));
    },
  });
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  restoreProperty(
    HTMLElement.prototype,
    'scrollIntoView',
    scrollIntoViewDescriptor
  );
  restoreProperty(
    HTMLDialogElement.prototype,
    'showModal',
    showModalDescriptor
  );
  restoreProperty(HTMLDialogElement.prototype, 'close', closeDescriptor);
});

describe('SearchDialog', () => {
  it('shows an actionable error when the search index returns non-OK', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 503 });
    vi.stubGlobal('fetch', fetchMock);

    await renderDialog();
    await click(buttonNamed('search'));

    expect(fetchMock).toHaveBeenCalledWith('/search-index.json', {
      signal: expect.any(AbortSignal),
    });
    expect(status().textContent).toBe(
      'Search index failed to load. Reload the page and try again.'
    );

    await click(buttonNamed('Close search'));
    await click(buttonNamed('search'));

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('shows an error for non-JSON responses and succeeds when reopened', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockRejectedValue(new SyntaxError('Invalid JSON')),
      })
      .mockResolvedValueOnce({ ok: true, json: async () => entries });
    vi.stubGlobal('fetch', fetchMock);

    await renderDialog();
    await click(buttonNamed('search'));

    expect(status().textContent).toBe(
      'Search index failed to load. Reload the page and try again.'
    );

    await click(buttonNamed('Close search'));
    await click(buttonNamed('search'));

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(status().textContent).toContain('2 pages');
    expect(status().textContent).not.toContain('failed to load');
  });

  it('aborts an in-flight index request when search closes', async () => {
    let signal: AbortSignal | undefined;
    const fetchMock = vi.fn(
      (_input: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          signal = init?.signal as AbortSignal;
          signal.addEventListener(
            'abort',
            () => reject(new DOMException('Aborted', 'AbortError')),
            { once: true }
          );
        })
    );
    vi.stubGlobal('fetch', fetchMock);

    await renderDialog();
    await click(buttonNamed('search'));
    expect(signal?.aborted).toBe(false);

    await click(buttonNamed('Close search'));

    expect(signal?.aborted).toBe(true);
    expect(status().textContent).not.toContain('failed to load');

    await click(buttonNamed('search'));

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(signal?.aborted).toBe(false);
  });

  it('loads the search index from the configured base path', async () => {
    vi.stubEnv('NEXT_PUBLIC_BASE_PATH', '/flatbread');
    vi.resetModules();
    const { SearchDialog: SearchDialogWithBasePath } = await import(
      './SearchDialog'
    );
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => entries });
    vi.stubGlobal('fetch', fetchMock);

    await renderDialog(SearchDialogWithBasePath);
    await click(buttonNamed('search'));

    expect(fetchMock).toHaveBeenCalledWith('/flatbread/search-index.json', {
      signal: expect.any(AbortSignal),
    });
  });

  it('moves through hits with arrows and opens the active hit with Enter', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => entries })
    );

    await renderDialog();
    await click(buttonNamed('search'));
    const field =
      container.querySelector<HTMLInputElement>('[role="combobox"]');
    expect(field).not.toBeNull();

    await type(field!, 'guide');
    expect(field?.getAttribute('aria-activedescendant')).toBe(
      'docs-search-hit-0'
    );

    await key(field!, 'ArrowDown');
    expect(field?.getAttribute('aria-activedescendant')).toBe(
      'docs-search-hit-1'
    );
    await key(field!, 'ArrowDown');
    expect(field?.getAttribute('aria-activedescendant')).toBe(
      'docs-search-hit-1'
    );
    await key(field!, 'ArrowUp');
    expect(field?.getAttribute('aria-activedescendant')).toBe(
      'docs-search-hit-0'
    );
    await key(field!, 'ArrowDown');
    await key(field!, 'Enter');

    expect(router.push).toHaveBeenCalledWith('/docs/beta/');
  });
});

async function renderDialog(Dialog: typeof SearchDialog = SearchDialog) {
  await act(async () => {
    root.render(createElement(Dialog));
  });
}

async function click(element: HTMLElement) {
  await act(async () => {
    element.dispatchEvent(
      new MouseEvent('click', { bubbles: true, cancelable: true })
    );
    await settle();
  });
}

async function type(field: HTMLInputElement, value: string) {
  const setValue = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    'value'
  )?.set;
  await act(async () => {
    setValue?.call(field, value);
    field.dispatchEvent(new Event('input', { bubbles: true }));
    await settle();
  });
}

async function key(field: HTMLInputElement, value: string) {
  await act(async () => {
    field.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: value,
        bubbles: true,
        cancelable: true,
      })
    );
  });
}

function buttonNamed(name: string): HTMLButtonElement {
  const button = [...container.querySelectorAll('button')].find(
    (entry) =>
      entry.getAttribute('aria-label')?.toLowerCase() === name.toLowerCase() ||
      entry.textContent?.toLowerCase().includes(name.toLowerCase())
  );
  if (!button) throw new Error(`Button \`${name}\` was not rendered.`);
  return button;
}

function status(): HTMLElement {
  const node = container.querySelector<HTMLElement>('[role="status"]');
  if (!node) throw new Error('Search status was not rendered.');
  return node;
}

async function settle() {
  await Promise.resolve();
  await Promise.resolve();
}

function restoreProperty(
  target: object,
  key: PropertyKey,
  descriptor: PropertyDescriptor | undefined
) {
  if (descriptor) Object.defineProperty(target, key, descriptor);
  else Reflect.deleteProperty(target, key);
}
