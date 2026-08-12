import type { Metadata } from 'next';
import { Geist_Mono } from 'next/font/google';
import Link from 'next/link';

import {
  getDocs,
  getPackages,
  getSearchEntries,
  getSections,
} from '../lib/content';
import { Rule } from './components/ascii/Rule';
import { ThemeToggle, themeScript } from './components/chrome/ThemeToggle';
import { PageTransition } from './components/motion/PageTransition';
import { Sidebar } from './components/nav/Sidebar';
import { SearchDialog } from './components/search/SearchDialog';
import './globals.css';

const mono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Flatbread docs',
    template: '%s · Flatbread docs',
  },
  description:
    'Flatbread turns files in Git into a typed relational graph. These pages are the repository’s own Markdown, read through Flatbread.',
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [sections, docs, packages, searchEntries] = await Promise.all([
    getSections(),
    getDocs(),
    getPackages(),
    getSearchEntries(),
  ]);

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={mono.variable}>
        <a href="#content" className="fb-skip">
          Skip to content
        </a>

        <header className="fb-header">
          <div className="fb-header__inner">
            <Link href="/" className="fb-brand">
              <span className="fb-brand__name">flatbread</span>
              <span aria-hidden className="fb-brand__slash">
                /
              </span>
              <span className="fb-brand__section">docs</span>
            </Link>

            <div className="fb-header__actions">
              <SearchDialog entries={searchEntries} />
              <ThemeToggle />
              <a
                className="fb-button"
                href="https://github.com/FlatbreadLabs/flatbread"
                target="_blank"
                rel="noreferrer"
              >
                [github ↗]
              </a>
            </div>
          </div>
          <Rule />
        </header>

        <div className="fb-shell">
          <aside className="fb-sidebar">
            <Sidebar sections={sections} docs={docs} packages={packages} />
          </aside>

          <main id="content" className="fb-main">
            <PageTransition>{children}</PageTransition>
          </main>
        </div>

        <footer className="fb-footer">
          <Rule />
          <p>
            Every page here is a Markdown file in the repository, read through
            Flatbread at build time. Edit the file, and the page changes.
          </p>
        </footer>
      </body>
    </html>
  );
}
