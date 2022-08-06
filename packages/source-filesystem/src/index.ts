import slugify from '@sindresorhus/slugify';
import { defaultsDeep, merge } from 'lodash-es';
import { read, write } from 'to-vfile';
import ownPackage from '../package.json' assert { type: 'json' };
import type {
  CollectionContext,
  CollectionEntry,
  FlatbreadArgs,
  LoadedFlatbreadConfig,
  SourcePlugin,
} from '@flatbread/core';
import { relative, resolve } from 'path';
import type { VFile } from 'vfile';
import type {
  FileNode,
  InitializedSourceFilesystemConfig,
  sourceFilesystemConfig,
} from './types';
import gatherFileNodes from './utils/gatherFileNodes';

interface Context {
  filename?: string;
  path: string;
  slug: string;
}

/**
 * Get nodes (files) from the directory
 *
 * @param path The directory to read from
 * @param config 'InitializedSourceFileSystemConfig
 * @returns An array of content nodes
 */
async function getNodesFromDirectory(
  collectionEntry: CollectionEntry,
  { addRecord }: FlatbreadArgs<Context>,
  config: InitializedSourceFilesystemConfig
): Promise<void> {
  const { extensions } = config;
  const nodes: FileNode[] = await gatherFileNodes(collectionEntry.path, {
    extensions,
  });

  await Promise.all(
    nodes.map(async (node: FileNode): Promise<void> => {
      const doc = await read(node.path);
      doc.data = node.data;
      addRecord(collectionEntry, doc, {
        filename: doc.basename,
        path: relative(process.cwd(), doc.path),
        slug: slugify(doc.stem ?? ''),
      });
    })
  );
}

/**
 * Returns all nodes from the directory
 *
 * @param paths array of directories to read from
 * @returns
 */
async function getAllNodes(
  allCollectionEntries: CollectionEntry[],
  flatbread: FlatbreadArgs<Context>,
  config: InitializedSourceFilesystemConfig
): Promise<void> {
  const nodeEntries = await Promise.all(
    allCollectionEntries.map(
      async (contentType): Promise<Record<string, any>> =>
        new Promise(async (res) =>
          res([
            contentType.collection,
            await getNodesFromDirectory(contentType, flatbread, config),
          ])
        )
    )
  );

  const nodes = Object.fromEntries(
    nodeEntries as Iterable<readonly [PropertyKey, any]>
  );
}

// TODO: _flatbread data should be extracted from plugins
// plugin should return a context object and be given the same context object back when saving,
// this context object will be saved internally under _flatbread[collectionId]

async function put(doc: VFile, context: Context) {
  doc.basename = context.filename;
  doc.path = resolve(process.cwd(), context.path);

  await write(doc);

  return { doc, context };
}

/**
 * Source filesystem plugin for fetching flat-file content nodes from directories on disk.
 *
 * @param sourceConfig content types config
 * @returns A function that returns functions which fetch lists of nodes
 */

export function source(sourceConfig?: sourceFilesystemConfig) {
  let config: InitializedSourceFilesystemConfig;

  return {
    initialize: (flatbreadConfig: LoadedFlatbreadConfig) => {
      const { extensions } = flatbreadConfig.loaded;
      config = defaultsDeep(sourceConfig ?? {}, { extensions });
    },
    fetch: (content: CollectionEntry[], flatbread: FlatbreadArgs<Context>) =>
      getAllNodes(content, flatbread, config),
    put,
  };
}

export default source;
