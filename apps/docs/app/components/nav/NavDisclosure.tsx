'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

const WIDE = '(min-width: 901px)';

/**
 * Fold the navigation away on a narrow screen.
 *
 * On a wide screen the tree is always open and the toggle is hidden. On a
 * phone the tree would otherwise push the page eighteen links down, so it
 * starts closed.
 *
 * The open state is driven by a media query rather than by CSS alone, because
 * the reliable way to force a `<details>` open across browsers is still the
 * `open` attribute.
 */
export function NavDisclosure({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const previousPath = useRef(pathname);
  const [wide, setWide] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const query = window.matchMedia(WIDE);
    const sync = () => setWide(query.matches);
    sync();
    query.addEventListener('change', sync);
    return () => query.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    if (previousPath.current !== pathname && !wide) {
      setOpen(false);
      requestAnimationFrame(() =>
        document.getElementById('main-content')?.focus({ preventScroll: false })
      );
    }
    previousPath.current = pathname;
  }, [pathname, wide]);

  return (
    <details
      className="fb-nav"
      open={wide || open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary className="fb-nav__summary">{label}</summary>
      {children}
    </details>
  );
}
