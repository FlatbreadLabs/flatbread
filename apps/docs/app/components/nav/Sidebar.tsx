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
  number?: number;
  items: Array<{ href: string; label: string; number?: number }>;
}

/** Lists each manual section and page in its published order. */
export function Sidebar({ sections, docs, packages }: SidebarProps) {
  const pathname = usePathname();
  const referenceBranches: Branch[] = groupPackages(packages).map((group) => ({
    id: `reference-${group.name.toLowerCase()}`,
    title: `Package reference / ${group.name}`,
    items: group.packages.map((entry) => ({
      href: `/reference/${entry.id}/`,
      label: entry.id,
    })),
  }));

  const branches: Branch[] = [
    ...[...sections]
      .sort((a, b) => a.order - b.order)
      .map((section) => ({
        id: section.id,
        title: section.title,
        number: section.order,
        items: docs
          .filter((doc) => doc.sectionId === section.id)
          .sort((a, b) => a.order - b.order)
          .map((doc) => ({
            href: `/docs/${doc.id}/`,
            label: doc.title,
            number: doc.order,
          })),
      })),
    ...referenceBranches,
  ].filter((branch) => branch.items.length > 0);

  return (
    <nav className="fb-tree" aria-label="Manual index">
      <ul className="fb-tree__root">
        {branches.map((branch) => {
          const sectionNumber = formatIndex(branch.number);

          return (
            <li key={branch.id} className="fb-tree__branch">
              <p className="fb-tree__title">
                {sectionNumber ? (
                  <span className="fb-tree__index">{sectionNumber} </span>
                ) : null}
                {branch.title}
              </p>

              <ul className="fb-tree__leaves">
                {branch.items.map((item) => {
                  const active = pathname === item.href;
                  const pageNumber = formatIndex(item.number);
                  const coordinate =
                    sectionNumber && pageNumber
                      ? `${sectionNumber}.${pageNumber}`
                      : undefined;

                  return (
                    <li key={item.href} className="fb-tree__leaf">
                      <Link
                        href={item.href}
                        className="fb-tree__link"
                        aria-current={active ? 'page' : undefined}
                        data-active={active ? '' : undefined}
                      >
                        {coordinate ? (
                          <span className="fb-tree__index">{coordinate} </span>
                        ) : null}
                        {active ? (
                          <span className="fb-tree__current">
                            Current page:{' '}
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

function formatIndex(value: number | undefined): string | undefined {
  return value === undefined ? undefined : String(value).padStart(2, '0');
}
