// @vitest-environment jsdom

import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CodeCopy } from './CodeCopy';

const clipboardDescriptor = Object.getOwnPropertyDescriptor(
  navigator,
  'clipboard'
);

let mount: HTMLDivElement;
let prose: HTMLDivElement;
let root: Root;

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);

  mount = document.createElement('div');
  prose = document.createElement('div');
  prose.id = 'code-copy-fixture';
  document.body.append(mount, prose);
  root = createRoot(mount);
});

afterEach(async () => {
  await act(async () => root.unmount());
  mount.remove();
  prose.remove();
  restoreProperty(navigator, 'clipboard', clipboardDescriptor);
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('CodeCopy', () => {
  it('copies code and resets its success state after 1.6 seconds', async () => {
    const writeText = installClipboard(vi.fn().mockResolvedValue(undefined));
    await renderCode('const answer = 42;');

    const button = copyButton();
    await click(button);

    expect(writeText).toHaveBeenCalledWith('const answer = 42;');
    expect(button.textContent).toBe('[copied]');
    expect(button.dataset.done).toBe('');

    await act(async () => vi.advanceTimersByTime(1599));
    expect(button.textContent).toBe('[copied]');

    await act(async () => vi.advanceTimersByTime(1));
    expect(button.textContent).toBe('[copy]');
    expect(button.dataset.done).toBeUndefined();
  });

  it('shows the keyboard fallback when clipboard access is rejected', async () => {
    installClipboard(vi.fn().mockRejectedValue(new Error('Not allowed')));
    await renderCode('pnpm test');

    const button = copyButton();
    await click(button);

    expect(button.textContent).toBe('[press ⌘C]');
    expect(button.dataset.done).toBeUndefined();

    await act(async () => vi.advanceTimersByTime(1600));
    expect(button.textContent).toBe('[copy]');
  });

  it('shows the keyboard fallback when the clipboard API is unavailable', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: undefined,
    });
    await renderCode('pnpm test');

    await click(copyButton());

    expect(copyButton().textContent).toBe('[press ⌘C]');
    expect(copyButton().dataset.done).toBeUndefined();
  });

  it('copies an empty string from an empty code element', async () => {
    const writeText = installClipboard(vi.fn().mockResolvedValue(undefined));
    await renderCode('');

    await click(copyButton());

    expect(writeText).toHaveBeenCalledWith('');
    expect(copyButton().textContent).toBe('[copied]');
  });

  it('keeps one copy button across rerender and remount', async () => {
    await renderCode('pnpm test');
    const firstButton = copyButton();

    await renderCopy();

    expect(prose.querySelectorAll('.fb-copy')).toHaveLength(1);
    expect(copyButton()).toBe(firstButton);

    await act(async () => root.unmount());
    expect(prose.querySelectorAll('.fb-copy')).toHaveLength(0);

    root = createRoot(mount);
    await renderCopy();

    expect(prose.querySelectorAll('.fb-copy')).toHaveLength(1);
    expect(copyButton()).not.toBe(firstButton);
  });

  it('adds one independent copy button to each code block', async () => {
    const writeText = installClipboard(vi.fn().mockResolvedValue(undefined));
    const first = appendCode('pnpm build');
    const second = appendCode('pnpm test');

    await renderCopy();

    expect(first.querySelectorAll('.fb-copy')).toHaveLength(1);
    expect(second.querySelectorAll('.fb-copy')).toHaveLength(1);

    const firstButton = first.querySelector<HTMLButtonElement>('.fb-copy')!;
    const secondButton = second.querySelector<HTMLButtonElement>('.fb-copy')!;
    await click(secondButton);

    expect(writeText).toHaveBeenCalledOnce();
    expect(writeText).toHaveBeenCalledWith('pnpm test');
    expect(firstButton.textContent).toBe('[copy]');
    expect(secondButton.textContent).toBe('[copied]');
  });

  it('keeps overlapping reset timers independent across code blocks', async () => {
    const writeText = installClipboard(vi.fn().mockResolvedValue(undefined));
    const first = appendCode('pnpm build');
    const second = appendCode('pnpm test');
    await renderCopy();
    const firstButton = first.querySelector<HTMLButtonElement>('.fb-copy')!;
    const secondButton = second.querySelector<HTMLButtonElement>('.fb-copy')!;

    await click(firstButton);
    await act(async () => vi.advanceTimersByTime(800));
    await click(secondButton);
    await act(async () => vi.advanceTimersByTime(400));
    await click(firstButton);

    await act(async () => vi.advanceTimersByTime(400));
    expect(firstButton.textContent).toBe('[copied]');
    expect(secondButton.textContent).toBe('[copied]');

    await act(async () => vi.advanceTimersByTime(800));
    expect(firstButton.textContent).toBe('[copied]');
    expect(secondButton.textContent).toBe('[copy]');

    await act(async () => vi.advanceTimersByTime(400));
    expect(firstButton.textContent).toBe('[copy]');
    expect(writeText.mock.calls).toEqual([
      ['pnpm build'],
      ['pnpm test'],
      ['pnpm build'],
    ]);
  });
});

async function renderCode(code: string) {
  appendCode(code);
  await renderCopy();
}

function appendCode(code: string) {
  const block = document.createElement('pre');
  const content = document.createElement('code');
  content.textContent = code;
  block.append(content);
  prose.append(block);
  return block;
}

async function renderCopy() {
  await act(async () => {
    root.render(createElement(CodeCopy, { scope: '#code-copy-fixture' }));
  });
}

async function click(button: HTMLButtonElement) {
  await act(async () => {
    button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await Promise.resolve();
  });
}

function copyButton(): HTMLButtonElement {
  const button = prose.querySelector<HTMLButtonElement>('.fb-copy');
  if (!button) throw new Error('Copy button was not rendered.');
  return button;
}

function installClipboard(writeText: ReturnType<typeof vi.fn>) {
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText },
  });
  return writeText;
}

function restoreProperty(
  target: object,
  key: PropertyKey,
  descriptor: PropertyDescriptor | undefined
) {
  if (descriptor) Object.defineProperty(target, key, descriptor);
  else Reflect.deleteProperty(target, key);
}
