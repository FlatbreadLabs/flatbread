import { cloneDeep, defaultsDeep } from 'lodash-es';
import { LoadedCollectionEntry } from '../types';
import { FlatbreadConfig, LoadedFlatbreadConfig, Transformer } from '../types';
import { toArray } from './arrayUtils';
import createShaHash from './createShaHash';
import { anyToString } from './stringUtils';
import camelCase from './camelCase';

/**
 * Processes a config object and returns a normalized version of it.
 */
export function initializeConfig(
  rawConfig: FlatbreadConfig
): LoadedFlatbreadConfig {
  const config = cloneDeep(rawConfig);
  const transformer = toArray(config.transformer ?? []).map((t) => {
    t.id = t.id ?? createShaHash(t);
    return t;
  });

  config.source.id = config.source.id ?? createShaHash(config.source);

  return {
    fieldNameTransform: camelCase,
    ...config,
    content: config.content?.map((content: Partial<LoadedCollectionEntry>) =>
      defaultsDeep(content, {
        referenceField: 'id',
        creationRequiredFields: [],
      })
    ),
    transformer,
    loaded: {
      extensions: transformer
        .map((transformer: Transformer) => transformer.extensions || [])
        .flat(),
    },
  };
}
