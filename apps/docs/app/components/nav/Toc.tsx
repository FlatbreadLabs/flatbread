'use client';

import { useEffect, useState } from 'react';

import type { TocEntry } from '../../../lib/toc';

/**
 * The list of headings on the page, with the one you are reading marked.
 *
 * The ids come from the HTML Flatbread rendered, so this never parses Markdown
 * a second time.
 */
export function Toc({ entries }: { entries: TocEntry[] }) {
  const [active, setActive] = useState<string | undefined>(entries[0]?.id);

  useEffect(() => {
    if (entries.length === 0) return;

    const headings = entries
      .map((entry) => document.getElementById(entry.id))
      .filter((element): element is HTMLElement => Boolean(element));

    const observer = new IntersectionObserver(
      (records) => {
        const visible = records
          .filter((record) => record.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

        if (visible[0]?.target.id) setActive(visible[0].target.id);
      },
      { rootMargin: '-10% 0px -70% 0px', threshold: 0 }
    );

    headings.forEach((heading) => observer.observe(heading));
    return () => observer.disconnect();
  }, [entries]);

  if (entries.length === 0) return null;

  return (
    <nav className="fb-toc" aria-label="On this page">
      <p className="fb-toc__title">On this page</p>
      <ul>
        {entries.map((entry) => (
          <li key={entry.id} data-depth={entry.depth}>
            <a
              href={`#${entry.id}`}
              className="fb-toc__link"
              data-active={active === entry.id ? '' : undefined}
            >
              {entry.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
