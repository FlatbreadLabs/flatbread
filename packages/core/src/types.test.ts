import test from 'ava';
import { readFileSync } from 'node:fs';
import type {
  Content,
  ContentEntry,
  ContentNode,
  EntryNode,
  IdentifierField,
  Override,
  Source,
} from './types';
import type { VFile } from 'vfile';

type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B
  ? 1
  : 2
  ? true
  : false;

type Assert<T extends true> = T;

type ContentEntryRefsAreTyped = Assert<
  Equal<NonNullable<ContentEntry['refs']>, Record<string, string>>
>;

type ContentNodeKeepsUnknownFields = Assert<
  Equal<ContentNode['customField'], unknown>
>;
type SourceFetchUsesContent = Assert<
  Equal<Parameters<Source['fetch']>[0], Content>
>;
type SourceFetchByTypeReturnsVFiles = Assert<
  Equal<ReturnType<NonNullable<Source['fetchByType']>>, Promise<VFile[]>>
>;
type ContentNodeIdUsesIdentifierField = Assert<
  Equal<ContentNode['id'], IdentifierField>
>;
type OverrideResolveReturnsUnknown = Assert<
  Equal<ReturnType<Override['resolve']>, unknown>
>;
type OverrideDescriptionMatchesGraphQL = Assert<
  Equal<Override['description'], string | null | undefined>
>;

test('core public content types expose narrowed relation surfaces', (t) => {
  const entry: ContentEntry = {
    collection: 'Post',
    refs: {
      author: 'Author',
    },
  };

  const node: ContentNode = {
    id: 'post-one',
    customField: 'value',
  };

  const untypedEntry: EntryNode = {
    customField: 'value',
  };

  // @ts-expect-error EntryNode values are unknown until narrowed.
  const unsafeString: string = untypedEntry.customField;

  t.is(entry.refs?.author, 'Author');
  t.is(node.customField, 'value');
  t.is(unsafeString, 'value');
});

test('core declarations use only the public GraphQL type surface', (t) => {
  const declarations = readFileSync(
    new URL('../dist/index.d.ts', import.meta.url),
    'utf8'
  );

  t.false(declarations.includes('graphql/jsutils/'));
});

test('core publishes dependencies used by its declarations', (t) => {
  const manifest = JSON.parse(
    readFileSync(new URL('../package.json', import.meta.url), 'utf8')
  ) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };

  t.is(manifest.dependencies?.vfile, '5.3.4');
  t.false('vfile' in (manifest.devDependencies ?? {}));
});

void (0 as unknown as ContentEntryRefsAreTyped);
void (0 as unknown as ContentNodeKeepsUnknownFields);
void (0 as unknown as SourceFetchUsesContent);
void (0 as unknown as SourceFetchByTypeReturnsVFiles);
void (0 as unknown as ContentNodeIdUsesIdentifierField);
void (0 as unknown as OverrideResolveReturnsUnknown);
void (0 as unknown as OverrideDescriptionMatchesGraphQL);
