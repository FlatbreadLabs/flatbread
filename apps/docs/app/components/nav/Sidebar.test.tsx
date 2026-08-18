// @vitest-environment jsdom

import { act, createElement } from 'react';
import type { AnchorHTMLAttributes, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { DocSummary, Section } from '../../../lib/content';
import { Sidebar } from './Sidebar';

const navigation = vi.hoisted(() => ({ pathname: '/' }));

vi.mock('next/navigation', () => ({
  usePathname: () => navigation.pathname,
}));

vi.mock('next/link', async () => {
  const { createElement } = await import('react');
  return {
    default: ({
      href,
      children,
      ...props
    }: Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & {
      href: string;
      children: ReactNode;
    }) => createElement('a', { ...props, href }, children),
  };
});

const sections: Section[] = [
  { id: 'start', title: 'Start', order: 1, blurb: 'Start here' },
  { id: 'empty', title: 'Empty section', order: 2, blurb: 'No pages' },
];

const docs: DocSummary[] = [
  {
    id: 'alpha',
    title: 'Alpha guide',
    summary: 'Read alpha',
    order: 1,
    sectionId: 'start',
  },
];

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  navigation.pathname = '/';
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('Sidebar', () => {
  it('marks only the exact trailing-slash pathname as the current page', async () => {
    navigation.pathname = '/docs/alpha/';
    await renderSidebar();

    expect(alphaLink().getAttribute('aria-current')).toBe('page');

    navigation.pathname = '/docs/alpha';
    await renderSidebar();

    expect(alphaLink().hasAttribute('aria-current')).toBe(false);
    expect(alphaLink().hasAttribute('data-active')).toBe(false);
  });

  it('omits empty documentation sections and package groups', async () => {
    await renderSidebar([{ id: 'core' }]);

    expect(container.textContent).toContain('Start');
    expect(container.textContent).toContain('Reference · Build');
    expect(container.textContent).not.toContain('Empty section');
    expect(container.textContent).not.toContain('Reference · Content');
    expect(container.textContent).not.toContain('Reference · Tools');
    expect(container.textContent).not.toContain('Reference · Other');
  });
});

async function renderSidebar(packages: Array<{ id: string }> = []) {
  await act(async () => {
    root.render(createElement(Sidebar, { sections, docs, packages }));
  });
}

function alphaLink(): HTMLAnchorElement {
  const link = container.querySelector<HTMLAnchorElement>(
    'a[href="/docs/alpha/"]'
  );
  if (!link) throw new Error('Alpha guide link was not rendered.');
  return link;
}
