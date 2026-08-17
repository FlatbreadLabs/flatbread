'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import type { DocSummary, Section } from '../../../lib/content';
import { groupPackages } from '../../../lib/package-groups';

interface SidebarProps {
  sections: Section[];
  docs: DocSummary[];
  packages: Array<{ id: string }>;
}

interface Branch {
  id: string;
  title: string;
  items: Array<{ href: string; label: string }>;
}

/**
 * The navigation, drawn as a directory tree.
 *
 * A vertical list is the one place where box-drawing characters are completely
 * safe: `├─` and `└─` never have to stretch, so they line up whatever the
 * window is doing. The caret marking the current page is a single element that
 * Motion slides from row to row.
 */
export function Sidebar({ sections, docs, packages }: SidebarProps) {
  const pathname = usePathname();
  const referenceBranches: Branch[] = groupPackages(packages).map((group) => ({
    id: `reference-${group.name.toLowerCase()}`,
    title: `Reference · ${group.name}`,
    items: group.packages.map((entry) => ({
      href: `/reference/${entry.id}/`,
      label: entry.id,
    })),
  }));

  const branches: Branch[] = [
    ...sections.map((section) => ({
      id: section.id,
      title: section.title,
      items: docs
        .filter((doc) => doc.sectionId === section.id)
        .map((doc) => ({ href: `/docs/${doc.id}/`, label: doc.title })),
    })),
    ...referenceBranches,
  ].filter((branch) => branch.items.length > 0);

  return (
    <nav className="fb-tree" aria-label="Documentation">
      <ul className="fb-tree__root">
        {branches.map((branch, branchIndex) => {
          const lastBranch = branchIndex === branches.length - 1;

          return (
            <li key={branch.id} className="fb-tree__branch">
              <p className="fb-tree__title">
                <span aria-hidden className="fb-tree__connector">
                  {lastBranch ? '└─' : '├─'}
                </span>
                {branch.title}
              </p>

              <ul className="fb-tree__leaves">
                {branch.items.map((item, itemIndex) => {
                  const active = pathname === item.href;
                  const lastItem = itemIndex === branch.items.length - 1;

                  return (
                    <li key={item.href} className="fb-tree__leaf">
                      <span aria-hidden className="fb-tree__connector">
                        {lastBranch ? '  ' : '│ '}
                        {lastItem ? '└─' : '├─'}
                      </span>

                      <Link
                        href={item.href}
                        className="fb-tree__link"
                        aria-current={active ? 'page' : undefined}
                        data-active={active ? '' : undefined}
                      >
                        {active ? (
                          <span aria-hidden className="fb-tree__marker">
                            ›
                          </span>
                        ) : null}
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
