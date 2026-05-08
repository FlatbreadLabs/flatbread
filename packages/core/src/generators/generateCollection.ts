import { defaultsDeep, merge } from 'lodash-es';
import { EntryNode, LoadedFlatbreadConfig } from '../types';
import { getFieldOverrides } from '../utils/fieldOverrides';
import transformKeys from '../utils/transformKeys';

interface GenerateCollectionArgs<T> {
  collection: string;
  nodes: T[];
  config: LoadedFlatbreadConfig;
  preknownSchemaFragments: Record<string, unknown>;
}

export function generateCollection<T>({
  collection,
  preknownSchemaFragments,
  config,
  nodes,
}: GenerateCollectionArgs<T>): EntryNode {
  const transformed = transformKeys(
    defaultsDeep(
      {},
      getFieldOverrides(collection, config),
      ...nodes.map((node) => merge({}, node, preknownSchemaFragments))
    ),
    config.fieldNameTransform
  );

  if (!isEntryNode(transformed)) {
    throw new Error(
      `Generated collection "${collection}" did not produce an object schema.`
    );
  }

  return transformed;
}

function isEntryNode(value: unknown): value is EntryNode {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
