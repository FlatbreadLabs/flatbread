import { defaultsDeep, merge } from 'lodash-es';
import { LoadedFlatbreadConfig } from '../types';
import { getFieldOverrides } from '../utils/fieldOverrides';
import transformKeys from '../utils/transformKeys';

interface GenerateCollectionArgs<T> {
  collection: string;
  nodes: T[];
  config: LoadedFlatbreadConfig;
  preknownSchemaFragments: Record<string, any[]>;
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
