import { relative } from 'node:path';
import {
  ConfigResult,
  ContentEntry,
  EntryNode,
  LoadedFlatbreadConfig,
} from '../types';
import { normalizeIdentifier } from '../utils/ids';
import { produceRecords, validateRecords } from '../records';

export interface JsonExportOptions {
  collections?: readonly string[];
  pathRoot?: string;
}

export type JsonExportResult = Record<string, EntryNode[]>;

/**
 * Export selected Flatbread collections as deterministic JSON-ready objects.
 *
 * Stability contract:
 * - collection names, record IDs, and object keys are sorted by Unicode
 *   codepoint order;
 * - record IDs and configured relation fields are normalized with the same ID
 *   semantics used by query resolvers;
 * - `_path` is emitted relative to `pathRoot` (default: `process.cwd()`);
 * - invalid IDs/refs fail through the same record validation seam as schema
 *   generation before export output is returned.
 */
export async function exportCollectionsAsJson(
  configResult: ConfigResult<LoadedFlatbreadConfig>,
  options: JsonExportOptions = {}
): Promise<JsonExportResult> {
  const { config } = configResult;
  if (!config) {
    throw new Error('Config is not defined');
  }

  config.source.initialize?.(config);
  const rawNodes = await config.source.fetch(config.content);
  const produced = produceRecords(rawNodes, config);
  validateRecords(produced, config);
  const selected = new Set(
    options.collections ?? config.content.map((entry) => entry.collection)
  );
  const contentByCollection = new Map(
    config.content.map((entry) => [entry.collection, entry])
  );
  const unknownCollections = [...selected].filter(
    (collection) => !contentByCollection.has(collection)
  );
  if (unknownCollections.length > 0) {
    throw new Error(
      `Cannot export unknown collection${
        unknownCollections.length === 1 ? '' : 's'
      }: ${unknownCollections.join(', ')}`
    );
  }
  const result: JsonExportResult = {};

  for (const [collection, nodes] of Object.entries(produced)) {
    if (!selected.has(collection)) continue;

    const contentEntry = contentByCollection.get(collection);
    const records = nodes
      .map((entry) =>
        normalizeRecord(entry, contentEntry, options.pathRoot ?? process.cwd())
      )
      .sort((a, b) =>
        compareCodepoint(
          normalizeIdentifier(a.id, `${collection} export id`),
          normalizeIdentifier(b.id, `${collection} export id`)
        )
      );

    result[collection] = records.map(sortObjectKeys) as EntryNode[];
  }

  return Object.fromEntries(
    Object.entries(result).sort(([collectionA], [collectionB]) =>
      compareCodepoint(collectionA, collectionB)
    )
  );
}

function normalizeRecord(
  entry: EntryNode,
  contentEntry: ContentEntry | undefined,
  pathRoot: string
): EntryNode {
  const normalized: EntryNode = {
    ...entry,
    id: normalizeIdentifier(entry.id, 'export record id'),
  };

  if (typeof normalized._path === 'string') {
    normalized._path = relative(pathRoot, normalized._path);
  }

  for (const refField of Object.keys(contentEntry?.refs ?? {})) {
    const value = normalized[refField];
    if (Array.isArray(value)) {
      normalized[refField] = value.map((item) =>
        normalizeIdentifier(item, `export relation "${refField}"`)
      );
    } else if (value !== null && value !== undefined) {
      normalized[refField] = normalizeIdentifier(
        value,
        `export relation "${refField}"`
      );
    }
  }

  return normalized;
}

function sortObjectKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortObjectKeys);
  }

  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([keyA], [keyB]) => compareCodepoint(keyA, keyB))
        .map(([key, nestedValue]) => [key, sortObjectKeys(nestedValue)])
    );
  }

  return value;
}

function compareCodepoint(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}
