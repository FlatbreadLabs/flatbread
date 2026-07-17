import { resolve } from 'node:path';
import type { VFile } from 'vfile';
import type {
  ContentGraphSnapshot,
  ContentNode,
  EntryNode,
  IndexedContentNode,
  LoadedFlatbreadConfig,
} from '../types';
import { getNodeIdentifier, normalizeIdentifier } from '../utils/ids';
import { classifyPath, produceRecords, validateRecords } from '../records';

const keyFor = (collection: string, id: string) => `${collection}\u0000${id}`;

export async function buildContentGraph(
  config: LoadedFlatbreadConfig
): Promise<ContentGraphSnapshot> {
  config.source.initialize?.(config);
  const fetched = await config.source.fetch(config.content);
  const produced = produceRecords(fetched, config);
  const nodesByCollection = validateRecords(produced, config);
  return makeSnapshot(config, nodesByCollection);
}

export async function patchContentGraph(
  previous: ContentGraphSnapshot,
  changedPaths: readonly string[]
): Promise<ContentGraphSnapshot> {
  const fetchPaths = previous.config.source.fetchPaths;
  if (!fetchPaths) {
    throw new Error(
      'Flatbread watch mode requires the configured source to implement fetchPaths(paths).'
    );
  }
  const normalized = [...new Set(changedPaths.map((path) => resolve(path)))];
  const directFiles = await fetchPaths(normalized);
  const directNodes = transformFiles(directFiles, previous.config);
  // Reference keys (`collection\u0000id`) affected by this batch; resolved to
  // paths below. Inbound referrers are already paths and are collected as-is.
  const affectedTargets = new Set<string>();
  const neighborPathSet = new Set<string>();
  for (const path of normalized) {
    const old = previous.nodeByPath.get(path);
    if (old) {
      affectedTargets.add(keyFor(old.collection, old.id));
      for (const target of previous.outboundReferences.get(path) ?? []) {
        affectedTargets.add(target);
      }
      for (const referrer of previous.inboundReferences.get(
        keyFor(old.collection, old.id)
      ) ?? []) {
        neighborPathSet.add(referrer);
      }
    }
    const replacement = directNodes.get(path);
    if (replacement) {
      for (const target of referencesFor(
        replacement.collection,
        replacement.node,
        previous.config
      )) {
        affectedTargets.add(target);
      }
    }
  }
  for (const target of affectedTargets) {
    const targetPath = previous.pathByCollectionAndId.get(target);
    if (targetPath !== undefined) neighborPathSet.add(targetPath);
  }
  const neighborPaths = [...neighborPathSet].filter(
    (path) => !normalized.includes(path)
  );
  const neighborFiles = neighborPaths.length
    ? await fetchPaths(neighborPaths)
    : [];
  const files = new Map<string, VFile>();
  for (const file of [...directFiles, ...neighborFiles]) {
    files.set(resolve(file.path), file);
  }
  const replacements = transformFiles([...files.values()], previous.config);
  const nodesByCollection: Record<string, ContentNode[]> = Object.fromEntries(
    Object.entries(previous.nodesByCollection).map(([collection, nodes]) => [
      collection,
      [...nodes],
    ])
  );
  for (const path of [...normalized, ...neighborPaths]) {
    const old = previous.nodeByPath.get(path);
    if (old) {
      nodesByCollection[old.collection] = (
        nodesByCollection[old.collection] ?? []
      ).filter((node) => resolve(String(node._path)) !== path);
    }
  }
  for (const [, indexed] of replacements) {
    (nodesByCollection[indexed.collection] ??= []).push(
      indexed.node as ContentNode
    );
  }
  validateRecords(nodesByCollection, previous.config);
  return makeSnapshot(previous.config, nodesByCollection);
}

function transformFiles(
  files: readonly VFile[],
  config: LoadedFlatbreadConfig
): Map<string, IndexedContentNode> {
  const grouped: Record<string, VFile[]> = {};
  for (const file of files) {
    const classification = classifyPath(resolve(file.path), config);
    if (classification) {
      file.data = { ...file.data, ...classification.captures };
      (grouped[classification.collection] ??= []).push(file);
    }
  }
  const transformed = produceRecords(grouped, config);
  const result = new Map<string, IndexedContentNode>();
  for (const [collection, nodes] of Object.entries(transformed)) {
    for (const node of nodes) {
      const path = resolve(String(node._path));
      result.set(path, {
        collection,
        id: getNodeIdentifier(node, collection),
        path,
        node,
      });
    }
  }
  return result;
}

function makeSnapshot(
  config: LoadedFlatbreadConfig,
  nodesByCollection: Record<string, ContentNode[]>
): ContentGraphSnapshot {
  const nodeByPath = new Map<string, IndexedContentNode>();
  const pathByCollectionAndId = new Map<string, string>();
  const inboundReferences = new Map<string, Set<string>>();
  const outboundReferences = new Map<string, readonly string[]>();
  for (const [collection, nodes] of Object.entries(nodesByCollection)) {
    for (const node of nodes) {
      const path = resolve(String(node._path ?? `${collection}:${node.id}`));
      const id = getNodeIdentifier(node, collection);
      nodeByPath.set(path, { collection, id, path, node });
      pathByCollectionAndId.set(keyFor(collection, id), path);
      const refs = referencesFor(collection, node, config);
      outboundReferences.set(path, refs);
      for (const target of refs) {
        const referrers = inboundReferences.get(target) ?? new Set<string>();
        referrers.add(path);
        inboundReferences.set(target, referrers);
      }
    }
  }
  return {
    config,
    nodesByCollection,
    nodeByPath,
    pathByCollectionAndId,
    inboundReferences,
    outboundReferences,
  };
}

function referencesFor(
  collection: string,
  node: EntryNode,
  config: LoadedFlatbreadConfig
): string[] {
  const refs = config.content.find(
    (entry) => String(entry.collection) === collection
  )?.refs;
  if (!refs) return [];
  const result: string[] = [];
  for (const [field, targetCollection] of Object.entries(refs)) {
    const value = node[field];
    for (const item of Array.isArray(value) ? value : [value]) {
      if (item !== null && item !== undefined) {
        result.push(
          keyFor(String(targetCollection), normalizeIdentifier(item))
        );
      }
    }
  }
  return result;
}
