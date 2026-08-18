import Link from 'next/link';

import { getDocs, getPackages, getSections } from '../lib/content';
import { groupPackages } from '../lib/package-groups';
import { Frame } from './components/ascii/Frame';

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
      path: 'apps/docs/content/docs/[id].md',
      note: 'The guides, straight from the repository.',
    },
    {
      name: 'Section',
      count: sections.length,
      path: 'apps/docs/content/nav/[id].yaml',
      note: 'Navigation groups, written as YAML.',
    },
    {
      name: 'Package',
      count: packages.length,
      path: 'apps/docs/content/reference/[id].md',
      note: 'Symlinks to the published package READMEs.',
    },
  ];
  const packageGroups = groupPackages(packages);

  return (
    <div className="fb-home">
      <section className="fb-hero">
        <p className="fb-hero__eyebrow">flatbread // documentation</p>

        <h1 className="fb-hero__title">
          Give coding agents memory you can review in Git
        </h1>

        <p className="fb-hero__lede">
          Proof records agent work, decisions, and evidence as linked Markdown
          in your repository. Flatbread is the typed relational graph
          underneath. GraphQL is one read interface; the same engine also powers
          app content.
        </p>

        <div className="fb-hero__actions">
          <Link href="/reference/proof/" className="fb-cta">
            [start: agent memory]
          </Link>
          <Link
            href="/reference/flatbread/#quickstart-posts-authors-and-tags"
            className="fb-cta fb-cta--quiet"
          >
            [start: content graph]
          </Link>
        </div>
      </section>

      <Frame
        label="this site"
        note={`${docs.length + packages.length + sections.length} records`}
      >
        <p className="fb-note">
          These pages are the repository&rsquo;s own Markdown, loaded through
          the same config any project would write.
        </p>

        <div
          className="fb-table-scroll"
          role="region"
          aria-label="Content collections"
          tabIndex={0}
        >
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
        </div>
      </Frame>

      <div className="fb-cards">
        {sections.map((section) => (
          <Frame key={section.id} label={section.title} className="fb-card">
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
        ))}
      </div>

      <Frame label="packages" note={`${packages.length}`}>
        <p className="fb-note">
          Pick one group. Each page is the package README itself.
        </p>
        <div className="fb-package-groups">
          {packageGroups.map((group) => (
            <section key={group.name}>
              <h3>{group.name}</h3>
              <ul className="fb-chips">
                {group.packages.map((entry) => (
                  <li key={entry.id}>
                    <Link href={`/reference/${entry.id}/`}>{entry.id}</Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </Frame>
    </div>
  );
}
