import Link from 'next/link';

import type { DocSummary, PackageSummary, Section } from '../../../lib/content';
import { CONTENT_PARTS } from './content-system';
import type { ContentPartKey } from './content-system';

interface ManualContentDiagramProps {
  sections: Section[];
  docs: DocSummary[];
  packages: PackageSummary[];
}

interface AssemblyPart {
  ref: string;
  name: string;
  count: number;
  source: string;
  purpose: string;
  items: Array<{ id: string; label: string; href?: string }>;
}

/**
 * A semantic, CSS-drawn exploded view of the content that builds this site.
 *
 * The native details element deliberately supplies the one interaction: it is
 * keyboard and touch accessible without JavaScript, and CSS may animate its
 * `[open]` state only when reduced motion is not requested.
 */
export function ManualContentDiagram({
  sections,
  docs,
  packages,
}: ManualContentDiagramProps) {
  const counts: Record<ContentPartKey, number> = {
    sections: sections.length,
    docs: docs.length,
    packages: packages.length,
  };
  const items: Record<ContentPartKey, AssemblyPart['items']> = {
    sections: sections.map((section) => ({
      id: section.id,
      label: `${number(section.order)} ${section.title}`,
    })),
    docs: docs.map((doc) => ({
      id: doc.id,
      label: doc.title,
      href: `/docs/${doc.id}/`,
    })),
    packages: packages.map((entry) => ({
      id: entry.id,
      label: entry.id,
      href: `/reference/${entry.id}/`,
    })),
  };
  const parts: AssemblyPart[] = CONTENT_PARTS.map((part) => ({
    ref: part.ref,
    name: part.name,
    count: counts[part.key],
    source: part.sourcePattern,
    purpose: part.purpose,
    items: items[part.key],
  }));
  const total = parts.reduce((sum, part) => sum + part.count, 0);

  return (
    <section
      className="fb-manual-assembly"
      aria-labelledby="content-system-title"
    >
      <div className="fb-manual-section-heading">
        <p className="fb-manual-section-heading__ref">FIG. 00–1</p>
        <h2 id="content-system-title">Content system, exploded</h2>
        <p className="fb-manual-section-heading__note">
          {total} source records assembled into this documentation site.
        </p>
      </div>

      <figure className="fb-manual-diagram">
        <div className="fb-manual-diagram__stage">
          <div className="fb-manual-diagram__assembly">
            <span className="fb-manual-diagram__assembly-label">
              Rendered documentation
            </span>
            <strong>flatbread docs</strong>
            <span className="fb-manual-diagram__assembly-count">
              {total} source records
            </span>
          </div>

          <ol
            className="fb-manual-diagram__parts"
            aria-label="Content-system parts"
          >
            {parts.map((part) => (
              <li
                key={part.ref}
                className="fb-manual-diagram__part"
                data-ref={part.ref}
              >
                <span className="fb-manual-diagram__part-ref">{part.ref}</span>
                <span className="fb-manual-diagram__part-name">
                  {part.name}
                </span>
                <span className="fb-manual-diagram__part-count">
                  {part.count} records
                </span>
                <span
                  aria-hidden="true"
                  className="fb-manual-diagram__leader"
                />
              </li>
            ))}
          </ol>

          <ol
            className="fb-manual-diagram__relations"
            aria-label="Content-system relations"
          >
            <li
              className="fb-manual-diagram__relation"
              data-from="01"
              data-to="02"
            >
              <span className="fb-manual-diagram__relation-ref">01 → 02</span>
              Navigation sections group guide records.
            </li>
            <li
              className="fb-manual-diagram__relation"
              data-from="02"
              data-to="00"
            >
              <span className="fb-manual-diagram__relation-ref">02 → 00</span>
              Guide records render as documentation pages.
            </li>
            <li
              className="fb-manual-diagram__relation"
              data-from="03"
              data-to="00"
            >
              <span className="fb-manual-diagram__relation-ref">03 → 00</span>
              Package references render alongside guides.
            </li>
          </ol>
        </div>

        <figcaption className="fb-manual-diagram__caption">
          <span>CONTENT ASSEMBLY</span>
          <span>
            Direct labels identify the source collection and its role.
          </span>
        </figcaption>
      </figure>

      <details className="fb-manual-inspection" data-motion="inspection">
        <summary className="fb-manual-inspection__summary">
          <span>Inspect assembled records</span>
          <span className="fb-manual-inspection__summary-meta">
            {total} records
          </span>
        </summary>

        <div className="fb-manual-inspection__panel">
          <p className="fb-manual-inspection__intro">
            Each part remains a repository file or README; the site reads it at
            build time.
          </p>

          <ol className="fb-manual-inspection__parts">
            {parts.map((part) => (
              <li key={part.ref} className="fb-manual-inspection__part">
                <div className="fb-manual-inspection__part-heading">
                  <span className="fb-manual-inspection__ref">
                    REF. {part.ref}
                  </span>
                  <h3>{part.name}</h3>
                  <span>{part.count} records</span>
                </div>
                <p>{part.purpose}</p>
                <code>{part.source}</code>
                <ul>
                  {part.items.map((item) => (
                    <li key={item.id}>
                      {item.href ? (
                        <Link href={item.href}>{item.label}</Link>
                      ) : (
                        item.label
                      )}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        </div>
      </details>
    </section>
  );
}

function number(value: number): string {
  return String(value).padStart(2, '0');
}
