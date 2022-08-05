import { cloneDeep } from 'lodash-es';
import { FlatbreadConfig, LoadedFlatbreadConfig, Transformer } from '../types';
import { toArray } from './arrayUtils';
import camelCase from './camelCase';

/**
 * Processes a config object and returns a normalized version of it.
 */
export function initializeConfig(
  rawConfig: FlatbreadConfig
): LoadedFlatbreadConfig {
  const config = cloneDeep(rawConfig);
  const transformer = toArray(config.transformer ?? []);

  return {
    fieldNameTransform: camelCase,
    ...config,
    transformer,
    loaded: {
      extensions: transformer
        .map((transformer: Transformer) => transformer.extensions || [])
        .flat(),
    },
  };
}
