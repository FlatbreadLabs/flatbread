import Link from 'next/link';
import { getAllDocPages } from '../lib/read';
import { AsciiRule } from './components/AsciiRule';
import { MotionText } from './components/MotionText';
import { MotionReveal } from './components/MotionReveal';

const SECTION_LABELS: Record<string, string> = {
  concepts: 'Concepts',
  guides: 'Guides',
  reference: 'Reference',
};

async function getPages() {
  try {
    const pages = await getAllDocPages();
    return pages
      .filter((p): p is NonNullable<typeof p> => Boolean(p))
      .map((p) => ({
        id: String(p.id ?? ''),
        slug: String(p._slug ?? ''),
        title: String(p.title ?? ''),
        section: String(p.section ?? 'misc'),
        order: Number(p.order ?? 0),
        summary: String(p.summary ?? ''),
      }))
      .sort((a, b) => a.order - b.order);
  } catch (error) {
    console.error('Docs index failed to load:', error);
    return [];
  }
}

export default async function Home() {
  const pages = await getPages();
  const sections = new Map<string, typeof pages>();
  for (const page of pages) {
    const bucket = sections.get(page.section) ?? [];
    bucket.push(page);
    sections.set(page.section, bucket);
  }

  return (
    <div className="flex flex-col gap-10 max-w-[70ch]">
      <section className="flex flex-col gap-4">
        <MotionText
          as="h1"
          text="Relational content for TypeScript apps."
          className="text-4xl sm:text-5xl font-semibold tracking-tight leading-[1.1]"
        />
        <MotionReveal delay={0.15}>
          <p className="text-[var(--muted-foreground)]">
            Flatbread turns flat files in Git into a typed graph. GraphQL is one
            read surface, not the whole product. This site dogfoods that engine:
            every page you read here is a markdown file loaded through the
            generated read API.
          </p>
        </MotionReveal>
      </section>

      <MotionReveal delay={0.25}>
        <AsciiRule label="Contents" />
      </MotionReveal>

      {Array.from(sections.entries()).map(([section, items], i) => (
        <MotionReveal key={section} delay={0.3 + i * 0.05}>
          <section className="flex flex-col gap-2">
            <h2 className="text-sm uppercase tracking-widest text-[var(--muted-foreground)]">
              {SECTION_LABELS[section] ?? section}
            </h2>
            <ul className="flex flex-col gap-3 mt-2">
              {items.map((page) => (
                <li key={page.id} className="border p-4 hover:border-[var(--accent)] transition-colors">
                  <Link
                    href={`/docs/${page.slug}`}
                    className="no-underline"
                  >
                    <div className="flex items-baseline justify-between gap-4">
                      <span className="font-semibold">{page.title}</span>
                      <span className="text-xs text-[var(--muted-foreground)]">
                        docs/{page.slug}.md
                      </span>
                    </div>
                    {page.summary ? (
                      <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                        {page.summary}
                      </p>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </MotionReveal>
      ))}
    </div>
  );
}
