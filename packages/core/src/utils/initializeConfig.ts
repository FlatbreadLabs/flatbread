import { defaultsDeep } from 'lodash-es';
import { cloneDeep } from 'lodash-es';
import { FlatbreadConfig, LoadedFlatbreadConfig, Transformer } from '../types';
import { toArray } from './arrayUtils';

function camelCase(field: string) {
  return field.replace(/\s(\w)/g, (_, m) => m.toUpperCase());
}

/**
 * Processes a config object and returns a normalized version of it.
 */
export function initializeConfig(
  rawConfig: FlatbreadConfig
): LoadedFlatbreadConfig {
  const config = cloneDeep(rawConfig);
  const transformer = toArray(config.transformer ?? []);

  const newConfig = defaultsDeep(
    {
      ...config,
      transformer,
      loaded: {
        extensions: transformer
          .map((transformer: Transformer) => transformer.extensions || [])
          .flat(),
      },
    },
    {
      fieldTransform: camelCase,
    }
  );

  return newConfig;
}
