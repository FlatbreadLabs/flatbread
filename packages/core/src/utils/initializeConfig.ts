import { cloneDeep, defaultsDeep } from 'lodash-es';
import { CollectionEntry } from '../types';
import { FlatbreadConfig, LoadedFlatbreadConfig, Transformer } from '../types';
import { toArray } from './arrayUtils';
import { createHash } from 'crypto';
import { anyToString } from './stringUtils';

/**
 * Processes a config object and returns a normalized version of it.
 */
export function initializeConfig(
  rawConfig: FlatbreadConfig
): LoadedFlatbreadConfig {
  const config = cloneDeep(rawConfig);
  const transformer = toArray(config.transformer ?? []).map((t) => {
    t.id = t.id ?? createHash('sha256').update(anyToString(t)).digest('hex');
    return t;
  });

  return {
    ...config,
    content: config.content?.map((content: Partial<CollectionEntry>) =>
      defaultsDeep(content, { referenceField: 'id' })
    ),
    transformer,
    loaded: {
      extensions: transformer
        .map((transformer: Transformer) => transformer.extensions || [])
        .flat(),
    },
  };
}
