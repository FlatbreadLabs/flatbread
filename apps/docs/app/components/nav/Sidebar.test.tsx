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
  { id: 'start', title: 'Start', order: 2, blurb: 'Start here' },
  { id: 'empty', title: 'Empty section', order: 2, blurb: 'No pages' },
];

const docs: DocSummary[] = [
  {
    id: 'alpha',
    title: 'Alpha guide',
    summary: 'Read alpha',
    order: 3,
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
    expect(alphaLink().textContent).toBe('02.03 Current page: Alpha guide');

    navigation.pathname = '/docs/alpha';
    await renderSidebar();

    expect(alphaLink().hasAttribute('aria-current')).toBe(false);
    expect(alphaLink().hasAttribute('data-active')).toBe(false);
  });

  it('omits empty documentation sections and package groups', async () => {
    await renderSidebar([{ id: 'core' }]);

    expect(container.querySelector('nav')?.getAttribute('aria-label')).toBe(
      'Manual index'
    );
    expect(container.textContent).toContain('Start');
    expect(container.textContent).toContain('02 Start');
    expect(container.textContent).toContain('02.03 Alpha guide');
    expect(container.textContent).toContain('Package reference / Build');
    expect(container.textContent).not.toContain('Empty section');
    expect(container.textContent).not.toContain('Package reference / Content');
    expect(container.textContent).not.toContain('Package reference / Tools');
    expect(container.textContent).not.toContain('Package reference / Other');
  });

  it('sorts manual sections and pages by their published order', async () => {
    const laterSection: Section = {
      id: 'later',
      title: 'Later',
      order: 4,
      blurb: 'Later section',
    };
    const earlierDoc: DocSummary = {
      id: 'before-alpha',
      title: 'Before alpha',
      summary: 'Read this first',
      order: 1,
      sectionId: 'start',
    };
    const laterDoc: DocSummary = {
      id: 'later-page',
      title: 'Later page',
      summary: 'Read this later',
      order: 1,
      sectionId: 'later',
    };

    await act(async () => {
      root.render(
        createElement(Sidebar, {
          sections: [laterSection, ...sections],
          docs: [laterDoc, docs[0], earlierDoc],
          packages: [],
        })
      );
    });

    const text = container.textContent ?? '';
    expect(text.indexOf('02 Start')).toBeLessThan(text.indexOf('04 Later'));
    expect(text.indexOf('02.01 Before alpha')).toBeLessThan(
      text.indexOf('02.03 Alpha guide')
    );
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
