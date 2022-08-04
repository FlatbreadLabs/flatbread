import { FlatbreadConfig } from '@flatbread/core';

type ESModule = Record<string, unknown> & { default: Record<string, unknown> };

/**
 * Validate that the user config has a default export that is an object.
 *
 * @param config user config
 * @returns user config
 */
export function isConfigAnESM(config: unknown): config is ESModule {
  return typeof config === 'object' && config !== null && 'default' in config;
}

export function validateConfigHasDefaultExport(config: unknown): ESModule {
  if (isConfigAnESM(config)) {
    return config;
  }

  throw new Error(
    'The Flatbread config file must be an ESModule that exports the config object as its default property.'
  );
}

/**
 * Validate that the user config has `source` and `content` properties.
 *
 * @todo More thoroughly validate that the config is valid with joi and throw errors if not
 * @param config user config object
 * @returns user config object
 */
export function validateConfigStructure(
  config: Record<string, any>
): config is FlatbreadConfig {
  if (!('source' in config) || typeof config.source !== 'object') {
    throw new Error(
      'Your Flatbread config is missing a valid "source" property. Make sure to include a Flatbread-compatible source plugin, such as @flatbread/source-filesystem'
    );
  }

  if (!('transformer' in config)) {
    throw new Error(
      `Your Flatbread config is missing a valid "transformer" property. Make sure to include a Flatbread-compatible transformer, such as @flatbread/transformer-markdown`
    );
  }

  if (!('content' in config) || !Array.isArray(config.content)) {
    throw new Error(
      'Your Flatbread config is missing a valid "content" property.'
    );
  }

  return true;
}
