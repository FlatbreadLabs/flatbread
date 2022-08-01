import { cloneDeep } from 'lodash-es';
import { FlatbreadConfig, LoadedFlatbreadConfig, Transformer } from '../types';
import { arrayify } from './arrayify';

/**
 * Processes a config object and returns a normalized version of it.
 */
export function initializeConfig(
  rawConfig: FlatbreadConfig
): LoadedFlatbreadConfig {
  const config = cloneDeep(rawConfig);
  const transformer = arrayify(config.transformer ?? []);

  const newConfig = {
    ...config,
    transformer,
    loaded: {
      extensions: transformer
        .map((transformer: Transformer) => transformer.extensions || [])
        .flat(),
    },
  };

  return newConfig;
}
