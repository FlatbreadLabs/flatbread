'use client';

import { useEffect, useRef, useState } from 'react';

import type { TocEntry } from '../../../lib/toc';

/**
 * The list of headings on the page, with the one you are reading marked.
 *
 * The ids come from the HTML Flatbread rendered, so this never parses Markdown
 * a second time.
 */
export function Toc({ entries }: { entries: TocEntry[] }) {
  const [active, setActive] = useState<string | undefined>(entries[0]?.id);
  const [mobileOpen, setMobileOpen] = useState(false);
  const mobileNav = useRef<HTMLElement>(null);
  const desktopNav = useRef<HTMLElement>(null);

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

  useEffect(() => {
    for (const nav of [mobileNav.current, desktopNav.current]) {
      if (!nav || nav.getClientRects().length === 0) continue;
      nav
        .querySelector<HTMLAnchorElement>('[aria-current="location"]')
        ?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
  }, [active, mobileOpen]);

  if (entries.length === 0) return null;

  const label = 'Contents / this plate';

  const links = (
    <ul>
      {entries.map((entry) => (
        <li key={entry.id} data-depth={entry.depth}>
          <a
            href={`#${entry.id}`}
            className="fb-toc__link"
            data-active={active === entry.id ? '' : undefined}
            aria-current={active === entry.id ? 'location' : undefined}
          >
            {entry.text}
          </a>
        </li>
      ))}
    </ul>
  );

  return (
    <>
      <details
        className="fb-toc-disclosure"
        onToggle={(event) => setMobileOpen(event.currentTarget.open)}
      >
        <summary>
          {label} · {entries.length}
        </summary>
        <nav ref={mobileNav} className="fb-toc" aria-label={label}>
          {links}
        </nav>
      </details>
      <nav
        ref={desktopNav}
        className="fb-toc fb-toc--desktop"
        aria-label={label}
      >
        <p className="fb-toc__title">{label}</p>
        {links}
      </nav>
    </>
  );
}
