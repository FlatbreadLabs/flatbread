'use client';

import { motion } from 'motion/react';
import Link from 'next/link';
import { AsciiRule } from './AsciiRule';

export type NavPage = {
  id: string;
  slug: string;
  title: string;
  section: string;
  order: number;
};

type NavProps = {
  pages: NavPage[];
  activeSlug?: string;
};

const SECTION_LABELS: Record<string, string> = {
  concepts: 'Concepts',
  guides: 'Guides',
  reference: 'Reference',
};

function sectionLabel(section: string): string {
  return SECTION_LABELS[section] ?? section;
}

/**
 * Left rail navigation. Pages are grouped by `section` and sorted by `order`.
 * The active page is marked with an accented `▸` that travels between items
 * using a shared `layoutId`.
 */
export function Nav({ pages, activeSlug }: NavProps) {
  const sections = new Map<string, NavPage[]>();
  for (const page of pages) {
    const bucket = sections.get(page.section) ?? [];
    bucket.push(page);
    sections.set(page.section, bucket);
  }

  return (
    <nav className="flex flex-col gap-8">
      {Array.from(sections.entries()).map(([section, items]) => (
        <div key={section} className="flex flex-col gap-1">
          <AsciiRule label={sectionLabel(section)} />
          <ul className="flex flex-col gap-0.5 mt-2">
            {items.map((page) => {
              const isActive = page.slug === activeSlug;
              return (
                <li key={page.id}>
                  <Link
                    href={`/docs/${page.slug}`}
                    className="flex items-center gap-2 py-1 text-sm no-underline hover:text-[var(--accent)] transition-colors"
                  >
                    <span className="w-3 inline-flex justify-center text-[var(--accent)]">
                      {isActive ? (
                        <motion.span
                          layoutId="nav-active"
                          transition={{
                            type: 'spring',
                            stiffness: 380,
                            damping: 30,
                          }}
                        >
                          ▸
                        </motion.span>
                      ) : (
                        <span className="text-[var(--rule)]">·</span>
                      )}
                    </span>
                    <span
                      className={
                        isActive
                          ? 'text-[var(--foreground)]'
                          : 'text-[var(--muted-foreground)]'
                      }
                    >
                      {page.title}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
