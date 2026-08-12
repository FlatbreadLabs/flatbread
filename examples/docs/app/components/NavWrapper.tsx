'use client';

import { usePathname } from 'next/navigation';
import { Nav, type NavPage } from './Nav';

/**
 * Reads the current pathname and derives the active doc slug so the Nav can
 * mark the matching entry. Lives on the client because `usePathname` is a
 * client hook; the nav data itself is fetched on the server by the Shell.
 */
export function NavWrapper({ pages }: { pages: NavPage[] }) {
  const pathname = usePathname();
  const match = pathname?.match(/^\/docs\/([^/]+)/);
  const activeSlug = match?.[1];
  return <Nav pages={pages} activeSlug={activeSlug} />;
}
