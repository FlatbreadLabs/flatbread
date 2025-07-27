import { defaultsDeep, merge } from 'lodash-es';
import { LoadedFlatbreadConfig, SchemaFragment } from '../types';
import { getFieldOverrides } from '../utils/fieldOverrides';
import transformKeys from '../utils/transformKeys';

interface GenerateCollectionArgs<T> {
  collection: string;
  nodes: T[];
  config: LoadedFlatbreadConfig;
  preknownSchemaFragments: Record<string, SchemaFragment>;
}

export function generateCollection<T>({
  collection,
  preknownSchemaFragments,
  config,
  nodes,
}: GenerateCollectionArgs<T>) {
  return transformKeys(
    defaultsDeep(
      {},
      getFieldOverrides(collection, config),
      ...nodes.map((node) => merge({}, node, preknownSchemaFragments))
    ),
    config.fieldNameTransform
  );
}
