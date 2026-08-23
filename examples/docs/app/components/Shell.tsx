import Link from 'next/link';
import { getAllDocPages } from '../../lib/read';
import { AsciiRule } from './AsciiRule';
import { NavWrapper } from './NavWrapper';
import type { NavPage } from './Nav';

async function getNavPages(): Promise<NavPage[]> {
  try {
    const pages = await getAllDocPages();
    return pages
      .filter((page): page is NonNullable<typeof page> => Boolean(page))
      .map((page) => ({
        id: String(page.id ?? ''),
        slug: String(page._slug ?? ''),
        title: String(page.title ?? ''),
        section: String(page.section ?? 'misc'),
        order: Number(page.order ?? 0),
      }))
      .sort((a, b) => a.order - b.order);
  } catch (error) {
    console.error('Docs nav failed to load:', error);
    return [];
  }
}

/**
 * Site frame: top rule with the product mark, a left rail with section nav, the
 * content column, and a footer rule. The frame never re-animates between
 * routes; only the content column does.
 */
export async function Shell({ children }: { children: React.ReactNode }) {
  const pages = await getNavPages();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b">
        <div className="mx-auto max-w-[1200px] px-6 py-3 flex items-center justify-between text-xs text-[var(--muted-foreground)]">
          <Link
            href="/"
            className="no-underline text-[var(--foreground)] tracking-wide"
          >
            <span className="text-[var(--accent)]">▚</span> flatbread/docs
          </Link>
          <span className="hidden sm:inline">v0 · graphql @ :5057</span>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[1200px] grid grid-cols-1 md:grid-cols-12 flex-1">
        <aside className="md:col-span-3 md:border-r md:border-b-0 border-b px-6 py-8">
          <NavWrapper pages={pages} />
        </aside>
        <main className="md:col-span-9 px-6 py-10">{children}</main>
      </div>

      <footer className="border-t">
        <div className="mx-auto max-w-[1200px] px-6 py-6 flex flex-col gap-3">
          <AsciiRule />
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-[var(--muted-foreground)]">
            <Link href="/" className="hover:text-[var(--accent)] no-underline">
              index
            </Link>
            <a
              href="https://github.com/FlatbreadLabs/flatbread"
              className="hover:text-[var(--accent)] no-underline"
              target="_blank"
              rel="noreferrer"
            >
              github
            </a>
            <a
              href="http://localhost:5057/graphql"
              className="hover:text-[var(--accent)] no-underline"
              target="_blank"
              rel="noreferrer"
            >
              graphql playground
            </a>
            <span className="ml-auto">flat files · typed graph · git-native</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
