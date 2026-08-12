import Link from 'next/link';

import { getDocs, getPackages, getSections } from '../lib/content';
import { Cursor } from './components/ascii/Cursor';
import { Frame } from './components/ascii/Frame';
import { Decode } from './components/motion/Decode';
import { Reveal } from './components/motion/Reveal';
import { SplitText } from './components/motion/SplitText';

export default async function Home() {
  const [sections, docs, packages] = await Promise.all([
    getSections(),
    getDocs(),
    getPackages(),
  ]);

  const collections = [
    {
      name: 'Doc',
      count: docs.length,
      path: 'content/docs/[id].md',
      note: 'The guides, straight from the repository.',
    },
    {
      name: 'Section',
      count: sections.length,
      path: 'content/nav/[id].yaml',
      note: 'Navigation groups, written as YAML.',
    },
    {
      name: 'Package',
      count: packages.length,
      path: 'content/reference/[id].md',
      note: 'Symlinks to the published package READMEs.',
    },
  ];

  return (
    <div className="fb-home">
      <section className="fb-hero">
        <p className="fb-hero__eyebrow">flatbread // documentation</p>

        <h1 className="fb-hero__title">
          <Decode text="Relational content" />
          <br />
          <span className="fb-hero__title-soft">
            <Decode text="from files in Git" duration={1.1} />
          </span>
          <Cursor />
        </h1>

        <p className="fb-hero__lede">
          <SplitText
            by="word"
            stagger={0.02}
            delay={0.5}
            text="Flatbread reads flat files and hands your app a typed graph. Collections hold records, refs link them, and GraphQL is one way to read the result — not the whole product."
          />
        </p>

        <div className="fb-hero__actions">
          <Link href="/docs/positioning/" className="fb-cta">
            [read: what Flatbread is]
          </Link>
          <Link href="/reference/flatbread/" className="fb-cta fb-cta--quiet">
            [reference: flatbread]
          </Link>
        </div>
      </section>

      <Reveal>
        <Frame
          label="this site, read by flatbread"
          note={`${docs.length + packages.length + sections.length} records`}
        >
          <p className="fb-note">
            Nothing here is a copy. The pages are the repository&rsquo;s own
            Markdown, loaded through the same config any project would write.
          </p>

          <table className="fb-table">
            <thead>
              <tr>
                <th>collection</th>
                <th>records</th>
                <th>path</th>
              </tr>
            </thead>
            <tbody>
              {collections.map((collection) => (
                <tr key={collection.name}>
                  <td>{collection.name}</td>
                  <td>{collection.count}</td>
                  <td>
                    <code>{collection.path}</code>
                    <span className="fb-table__note">{collection.note}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Frame>
      </Reveal>

      <div className="fb-cards">
        {sections.map((section, index) => (
          <Reveal key={section.id} delay={index * 0.05}>
            <Frame label={section.title} className="fb-card">
              <p className="fb-note">{section.blurb}</p>
              <ul className="fb-card__links">
                {docs
                  .filter((doc) => doc.sectionId === section.id)
                  .map((doc) => (
                    <li key={doc.id}>
                      <Link href={`/docs/${doc.id}/`}>
                        <span aria-hidden>→ </span>
                        {doc.title}
                      </Link>
                      <p>{doc.summary}</p>
                    </li>
                  ))}
              </ul>
            </Frame>
          </Reveal>
        ))}
      </div>

      <Reveal>
        <Frame label="packages" note={`${packages.length}`}>
          <p className="fb-note">
            Each page below is a package README. Publish a change to the README
            and the page changes with it.
          </p>
          <ul className="fb-chips">
            {packages.map((entry) => (
              <li key={entry.id}>
                <Link href={`/reference/${entry.id}/`}>{entry.id}</Link>
              </li>
            ))}
          </ul>
        </Frame>
      </Reveal>
    </div>
  );
}
