import { defaultsDeep } from 'lodash-es';
import { CollectionEntry } from '../../dist';
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

  config.content = config.content?.map((content: CollectionEntry) =>
    defaultsDeep(content, { referenceField: 'id' })
  );

  return config;
}
