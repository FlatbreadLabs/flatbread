import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import Link from 'next/link';

import { getDocs, getPackages, getSections } from '../lib/content';
import { Rule } from './components/ascii/Rule';
import { ThemeToggle, themeScript } from './components/chrome/ThemeToggle';
import { NavDisclosure } from './components/nav/NavDisclosure';
import { Sidebar } from './components/nav/Sidebar';
import { SearchDialog } from './components/search/SearchDialog';
import './globals.css';

const sans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
  display: 'swap',
});

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
  const [sections, docs, packages] = await Promise.all([
    getSections(),
    getDocs(),
    getPackages(),
  ]);

  return (
    <html
      lang="en"
      className={`${sans.variable} ${mono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <a href="#main-content" className="fb-skip">
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
              <SearchDialog />
              <ThemeToggle />
              <a
                className="fb-button"
                href="https://github.com/FlatbreadLabs/flatbread"
                target="_blank"
                rel="noreferrer"
              >
                GitHub
              </a>
            </div>
          </div>
          <Rule />
        </header>

        <div className="fb-shell">
          <aside className="fb-sidebar">
            <NavDisclosure label="Manual index">
              <Sidebar sections={sections} docs={docs} packages={packages} />
            </NavDisclosure>
          </aside>

          <main id="main-content" className="fb-main" tabIndex={-1}>
            {children}
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
