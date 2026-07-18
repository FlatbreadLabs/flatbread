import { cloneDeep, get, set } from 'lodash-es';
import type { ContentNode, Override } from '../types';
import createFilterFunction, {
  generateFilterSetManifest,
  type TargetAndComparator,
} from '../utils/sift';
import {
  getNodeIdentifier,
  normalizeIdentifier,
  normalizeOptionalIdentifier,
} from '../utils/ids';

export type QueryArgs = Readonly<{
  filter?: Record<string, unknown>;
  limit?: number;
  order?: 'ASC' | 'DESC';
  skip?: number;
  sortBy?: string;
  [key: string]: unknown;
}>;

export type QueryExecutorCollection = Readonly<{
  name: string;
  refs?: Readonly<Record<string, string>>;
}>;

export type QueryExecutorRelations = Readonly<
  Record<string, Readonly<Record<string, string>>>
>;

export type QueryExecutorOptions = Readonly<{
  collections: Readonly<Record<string, readonly ContentNode[]>>;
  relations: QueryExecutorRelations;
  fieldNameTransform: (field: string) => string;
  preknownSchemaFragments: Record<string, unknown>;
  overridesByCollection: Readonly<
    Record<string, readonly Override[] | undefined>
  >;
}>;

export interface QueryExecutor {
  all(
    collection: QueryExecutorCollection,
    args: QueryArgs
  ): Promise<ContentNode[]>;
  findMany(
    collection: QueryExecutorCollection,
    ids: unknown,
    args: QueryArgs
  ): Promise<ContentNode[]>;
  findById(
    collection: QueryExecutorCollection,
    id: unknown
  ): Promise<ContentNode | undefined>;
}

type DerivedField = {
  kind: 'fragment' | 'override';
  value: unknown;
  override?: Override;
  rawPath?: string[];
};

type FilterView = {
  node: ContentNode;
  existential: Map<string, unknown[]>;
};

export function createQueryExecutor(
  options: QueryExecutorOptions
): QueryExecutor {
  const idMaps = new Map<string, Map<string, ContentNode>>();
  const derived = compileDerivedFields(options);

  const recordsFor = (
    collection: QueryExecutorCollection
  ): readonly ContentNode[] => options.collections[collection.name] ?? [];

  const lookup = (
    collection: string,
    value: unknown
  ): ContentNode | undefined => {
    const id = normalizeIdentifier(value, `${collection} reference value`);
    let map = idMaps.get(collection);
    if (!map) {
      map = new Map(
        (options.collections[collection] ?? []).map((node) => [
          getNodeIdentifier(node, collection),
          node,
        ])
      );
      idMaps.set(collection, map);
    }
    return map.get(id);
  };

  const filterNodes = async (
    collection: QueryExecutorCollection,
    nodes: readonly ContentNode[],
    filter: Record<string, unknown> | undefined
  ): Promise<ContentNode[]> => {
    if (!filter) return [...nodes];
    const manifest = generateFilterSetManifest(filter);
    const matcher = createFilterFunction(filter, manifest);
    const result: ContentNode[] = [];
    for (const canonical of nodes) {
      const view = await materializeFilterView(
        collection.name,
        canonical,
        manifest,
        options,
        derived,
        lookup
      );
      const existentialPaths = [...view.existential.entries()];
      if (existentialPaths.length === 0) {
        if (matcher(view.node)) result.push(canonical);
        continue;
      }
      let candidates: ContentNode[] = [view.node];
      for (const [path, values] of existentialPaths) {
        candidates = values.flatMap((value) =>
          candidates.map((candidate) => {
            const copy = cloneDeep(candidate);
            set(copy, path.split('.'), value);
            return copy;
          })
        );
      }
      if (candidates.some((candidate) => matcher(candidate)))
        result.push(canonical);
    }
    return result;
  };

  const finish = async (
    collection: QueryExecutorCollection,
    selected: readonly ContentNode[],
    args: QueryArgs
  ): Promise<ContentNode[]> => {
    const nodes = await filterNodes(collection, selected, args.filter);
    const privateNodes = [...nodes];
    if (args.sortBy) sortBy(args.sortBy, privateNodes);
    if (args.order === 'DESC') privateNodes.reverse();
    return cloneDeep(
      privateNodes.slice(args.skip ?? 0, args.limit ?? undefined)
    );
  };

  return {
    async all(collection, args) {
      return finish(collection, recordsFor(collection), args);
    },
    async findMany(collection, ids, args) {
      if (ids !== undefined && !Array.isArray(ids)) {
        throw new Error(
          `${collection.name} query argument "ids" must be an array of identifiers.`
        );
      }
      const idsToFind = (ids ?? []).map((id) =>
        normalizeIdentifier(id, `${collection.name} query argument "ids"`)
      );
      const selected = recordsFor(collection).filter((node) =>
        idsToFind.includes(getNodeIdentifier(node, collection.name))
      );
      return finish(collection, selected, { ...args, filter: undefined });
    },
    async findById(collection, id) {
      const idToFind = normalizeOptionalIdentifier(
        id,
        `${collection.name} query argument "id"`
      );
      if (idToFind === undefined) return undefined;
      const node = recordsFor(collection).find(
        (candidate) =>
          getNodeIdentifier(candidate, collection.name) === idToFind
      );
      return node === undefined ? undefined : cloneDeep(node);
    },
  };
}

function sortBy(sortByField: string, nodes: ContentNode[]): void {
  nodes.sort((nodeA, nodeB) => {
    const fieldA = nodeA[sortByField];
    const fieldB = nodeB[sortByField];
    if (isSortable(fieldA) && isSortable(fieldB) && fieldA < fieldB) return -1;
    if (isSortable(fieldA) && isSortable(fieldB) && fieldA > fieldB) return 1;
    return 0;
  });
}

function isSortable(value: unknown): value is string | number | boolean {
  return (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  );
}

function compileDerivedFields(
  options: QueryExecutorOptions
): Map<string, Map<string, DerivedField>> {
  const result = new Map<string, Map<string, DerivedField>>();
  const flatten = (
    collection: string,
    value: unknown,
    path: string[],
    kind: 'fragment' | 'override',
    override?: Override,
    rawPath?: string[]
  ): void => {
    if (kind === 'fragment' && typeof value === 'function') {
      const fields = result.get(collection) ?? new Map();
      fields.set(path.join('.'), { kind, value, rawPath });
      result.set(collection, fields);
      return;
    }
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      return;
    }
    for (const [key, child] of Object.entries(value)) {
      flatten(
        collection,
        child,
        [...path, options.fieldNameTransform(key)],
        kind,
        override,
        rawPath
      );
    }
  };
  for (const [collection, overrides] of Object.entries(
    options.overridesByCollection
  )) {
    for (const override of overrides ?? []) {
      const normalizedPath = override.field.replace(/\[\]/g, '[0]');
      const rawPath = (
        normalizedPath.endsWith('[0]')
          ? normalizedPath.slice(0, -3)
          : normalizedPath
      ).split(/(?:\.|\[0\])/);
      const path = rawPath.map(options.fieldNameTransform);
      const fields = result.get(collection) ?? new Map();
      fields.set(path.join('.'), {
        kind: 'override',
        value: override,
        override,
        rawPath,
      });
      result.set(collection, fields);
    }
  }
  for (const [rootKey, fragment] of Object.entries(
    options.preknownSchemaFragments
  )) {
    for (const collection of Object.keys(options.collections)) {
      flatten(
        collection,
        fragment,
        [options.fieldNameTransform(rootKey)],
        'fragment'
      );
    }
  }
  return result;
}

async function materializeFilterView(
  collection: string,
  canonical: ContentNode,
  manifest: TargetAndComparator,
  options: QueryExecutorOptions,
  derived: Map<string, Map<string, DerivedField>>,
  lookup: (collection: string, value: unknown) => ContentNode | undefined
): Promise<FilterView> {
  const node = cloneDeep(canonical);
  const existential = new Map<string, unknown[]>();
  for (const entry of manifest) {
    const values = await materializePath(
      collection,
      node,
      entry.path,
      options,
      derived,
      lookup,
      node,
      []
    );
    if (values !== undefined) {
      set(node, entry.path, values.value);
      if (values.existential)
        existential.set(entry.path.join('.'), values.values);
    }
  }
  return { node, existential };
}

async function materializePath(
  collection: string,
  parent: Record<string, unknown>,
  path: string[],
  options: QueryExecutorOptions,
  derived: Map<string, Map<string, DerivedField>>,
  lookup: (collection: string, value: unknown) => ContentNode | undefined,
  root: Record<string, unknown>,
  rootPath: string[]
): Promise<
  { value: unknown; existential: boolean; values: unknown[] } | undefined
> {
  if (path.length === 0) return undefined;
  if (!isPlainRecord(parent)) return undefined;
  const visibleField = path[0];
  const refs = options.relations[collection] ?? {};
  const refEntry = Object.entries(refs).find(
    ([rawField]) => options.fieldNameTransform(rawField) === visibleField
  );
  if (refEntry) {
    const [rawField, targetCollection] = refEntry;
    const reference = parent[rawField];
    if (Array.isArray(reference)) {
      const values: unknown[] = [];
      for (const id of reference) {
        const target = lookup(targetCollection, id);
        if (!target) continue;
        const targetCopy = cloneDeep(target);
        const child = path.slice(1);
        if (child.length === 0) values.push(targetCopy);
        else {
          const resolved = await materializePath(
            targetCollection,
            targetCopy,
            child,
            options,
            derived,
            lookup,
            targetCopy,
            []
          );
          values.push(resolved?.value);
        }
      }
      return { value: values, existential: childHasLeaf(path), values };
    }
    const target =
      reference == null ? undefined : lookup(targetCollection, reference);
    if (!target) return { value: undefined, existential: false, values: [] };
    const targetCopy = cloneDeep(target);
    if (path.length === 1)
      return { value: targetCopy, existential: false, values: [] };
    const resolved = await materializePath(
      targetCollection,
      targetCopy,
      path.slice(1),
      options,
      derived,
      lookup,
      targetCopy,
      []
    );
    return resolved ?? { value: undefined, existential: false, values: [] };
  }
  const fullPath = [...rootPath, ...path];
  if (
    visibleField === '_collection' &&
    path.length === 1 &&
    rootPath.length === 0
  ) {
    return { value: collection, existential: false, values: [] };
  }
  const derivedField = derived.get(collection)?.get(fullPath.join('.'));
  if (derivedField) {
    const parentPath = fullPath.slice(0, -1);
    const resolverParent =
      parentPath.length === 0 ? root : get(root, parentPath);
    if (!isPlainRecord(resolverParent)) {
      return { value: undefined, existential: false, values: [] };
    }
    const config =
      derivedField.kind === 'fragment' &&
      typeof derivedField.value === 'function'
        ? (derivedField.value as () => unknown)()
        : undefined;
    const fieldConfig = config as
      | {
          resolve?: (
            parent: unknown,
            args: Record<string, unknown>,
            context?: unknown,
            info?: unknown
          ) => unknown;
          args?: Record<string, { defaultValue?: unknown }>;
        }
      | undefined;
    const declaredArgs =
      derivedField.kind === 'override'
        ? derivedField.override?.args ?? {}
        : fieldConfig?.args ?? {};
    const args = Object.fromEntries(
      Object.entries(declaredArgs).map(([key, value]) => [
        key,
        (value as { defaultValue?: unknown }).defaultValue,
      ])
    );
    let value: unknown;
    if (derivedField.kind === 'override' && derivedField.override) {
      const rawPath = [...(derivedField.rawPath ?? [])];
      const terminal = rawPath.pop();
      const source = cloneDeep(resolverParent);
      const rawSource = resolverParent;
      const rawValue =
        terminal === undefined ? rawSource : get(rawSource, terminal);
      value = await derivedField.override.resolve(rawValue, {
        source,
        context: undefined,
        args,
      });
    } else {
      value = await fieldConfig?.resolve?.(
        resolverParent,
        args,
        undefined,
        undefined
      );
    }
    set(parent, path, value);
    return { value, existential: false, values: [] };
  }
  if (path.length === 1)
    return { value: parent[visibleField], existential: false, values: [] };
  const child = parent[visibleField];
  if (child === null || typeof child !== 'object') return undefined;
  return materializePath(
    collection,
    child as Record<string, unknown>,
    path.slice(1),
    options,
    derived,
    lookup,
    root,
    [...rootPath, visibleField]
  );
}

function childHasLeaf(path: string[]): boolean {
  return path.length > 1;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}
