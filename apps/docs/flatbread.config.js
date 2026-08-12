import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import {
  defineConfig,
  sourceFilesystem,
  transformerMarkdown,
  transformerYaml,
} from 'flatbread';

import { remarkStripFirstHeading } from './plugins/remark-strip-first-heading.mjs';
import { remarkRepoLinks } from './plugins/remark-repo-links.mjs';
import { remarkCodeMeta } from './plugins/remark-code-meta.mjs';
import { rehypeHeadingAnchors } from './plugins/rehype-heading-anchors.mjs';
import { rehypeShiki } from './plugins/rehype-shiki.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '../..');

/**
 * The docs site reads the repository's own Markdown. Nothing is copied: the
 * guides under `content/docs` and the package READMEs under `../../packages`
 * are the files a contributor edits, and the same files GitHub renders.
 */
export default defineConfig({
  source: sourceFilesystem(),
  transformer: [
    transformerMarkdown({
      markdown: {
        gfm: true,
        externalLinks: true,
        remarkPlugins: [
          remarkStripFirstHeading,
          remarkCodeMeta,
          [remarkRepoLinks, { repoRoot }],
        ],
        rehypePlugins: [rehypeHeadingAnchors, rehypeShiki],
      },
    }),
    transformerYaml(),
  ],
  content: [
    {
      // `[id]` is a capture: the filename becomes the record's id.
      path: 'content/docs/[id].md',
      collection: 'Doc',
      refs: {
        section: 'Section',
        related: 'Doc',
      },
    },
    {
      path: 'content/nav/[id].yaml',
      collection: 'Section',
    },
    {
      // Each file in `content/reference` is a symlink to a package README, so
      // the site renders the published README rather than a copy of it. The
      // link's own name supplies the id: `core.md` becomes `/reference/core`.
      //
      // Two limits force this shape. A content path may not climb above the
      // project directory, and a capture may not name a directory that is
      // followed by a fixed filename, so `../../packages/[id]/README.md`
      // matches nothing.
      path: 'content/reference/[id].md',
      collection: 'Package',
    },
  ],
  codegen: {
    enabled: true,
    outputDir: './generated',
    outputFile: 'graphql.ts',
    plugins: ['typescript', 'typescript-operations', 'typed-document-node'],
    documents: ['./queries/**/*.graphql'],
    pluginConfig: {
      typescript: {
        enumsAsTypes: true,
        scalars: { JSON: 'Record<string, unknown>' },
      },
    },
  },
});
