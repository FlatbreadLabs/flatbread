import { defaultsDeep } from 'lodash-es';
import { LoadedFlatbreadConfig, Transformer } from '../types';

function camelCase(field: string) {
  return field.replace(/\s(\w)/g, (_, m) => m.toUpperCase());
}

export function initializeConfig(config: any): LoadedFlatbreadConfig {
  config.transformer = Array.isArray(config.transformer)
    ? config.transformer
    : [config.transformer];

  return defaultsDeep(config, {
    loaded: {
      extensions: config.transformer
        .map((transformer: Transformer) => transformer.extensions || [])
        .flat(),
    },
    fieldTransform: camelCase,
  });
}
