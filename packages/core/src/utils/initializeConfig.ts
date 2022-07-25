import { LoadedFlatbreadConfig, Transformer } from '../types';

export function initializeConfig(config: any): LoadedFlatbreadConfig {
  config.transformer = Array.isArray(config.transformer)
    ? config.transformer
    : [config.transformer];

  config.loaded = {
    extensions: config.transformer
      .map((transformer: Transformer) => transformer.extensions || [])
      .flat(),
  };
  return config;
}
