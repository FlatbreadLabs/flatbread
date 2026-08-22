import Link from 'next/link';
import { AsciiRule } from './AsciiRule';
import { MotionText } from './MotionText';
import { MotionReveal } from './MotionReveal';

export type DocPageView = {
  id: string;
  slug: string;
  title: string;
  section: string;
  order: number;
  summary: string | null;
  html: string;
  timeToRead: number | null;
};

export type RelatedLink = {
  slug: string;
  title: string;
};

type DocProps = {
  doc: DocPageView;
  related: RelatedLink[];
  prev: RelatedLink | null;
  next: RelatedLink | null;
};

const SECTION_LABELS: Record<string, string> = {
  concepts: 'Concepts',
  guides: 'Guides',
  reference: 'Reference',
};

/**
 * Renders a single doc page: a section rule, an animated title, the summary
 * line, the rendered prose, related links, and prev/next navigation.
 */
export function Doc({ doc, related, prev, next }: DocProps) {
  const sectionLabel = SECTION_LABELS[doc.section] ?? doc.section;
  return (
    <article className="flex flex-col gap-6">
      <MotionReveal>
        <AsciiRule label={sectionLabel} />
      </MotionReveal>

      <MotionText as="h1" text={doc.title} className="text-3xl font-semibold tracking-tight" />

      {doc.summary ? (
        <p className="text-[var(--muted-foreground)] -mt-2">{doc.summary}</p>
      ) : null}

      <div className="flex items-center gap-4 text-xs text-[var(--muted-foreground)] -mt-2">
        {doc.timeToRead ? <span>{doc.timeToRead} min read</span> : null}
        <span>·</span>
        <span>docs/{doc.slug}.md</span>
      </div>

      <MotionReveal delay={0.05}>
        <div
          className="prose"
          dangerouslySetInnerHTML={{ __html: doc.html }}
        />
      </MotionReveal>

      {related.length > 0 ? (
        <section className="mt-8 flex flex-col gap-3">
          <AsciiRule label="Related" />
          <ul className="flex flex-col gap-1">
            {related.map((r) => (
              <li key={r.slug}>
                <Link
                  href={`/docs/${r.slug}`}
                  className="text-sm no-underline hover:text-[var(--accent)] transition-colors"
                >
                  → {r.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <nav className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {prev ? (
          <Link
            href={`/docs/${prev.slug}`}
            className="no-underline border p-4 hover:border-[var(--accent)] transition-colors"
          >
            <div className="text-xs text-[var(--muted-foreground)]">← prev</div>
            <div className="mt-1">{prev.title}</div>
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link
            href={`/docs/${next.slug}`}
            className="no-underline border p-4 hover:border-[var(--accent)] transition-colors sm:text-right"
          >
            <div className="text-xs text-[var(--muted-foreground)]">next →</div>
            <div className="mt-1">{next.title}</div>
          </Link>
        ) : (
          <span />
        )}
      </nav>
    </article>
  );
}
