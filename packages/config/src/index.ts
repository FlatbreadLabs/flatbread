import {
  ConfigResult,
  FlatbreadConfig,
  LoadedFlatbreadConfig,
  Transformer,
} from '@flatbread/core';
import path from 'path';
import url from 'url';

/**
 * Type-assisted config builder
 *
 * @param config flatbread instance options
 * @returns flatbread config
 */
export const defineConfig = (
  config: LoadedFlatbreadConfig
): LoadedFlatbreadConfig => config;

/**
 * Pulls the user config from an optionally specified filepath.
 *
 * By default, this will search the current working directory.
 *
 * @param options options for loading the config file, defaults to `{}`. Can pass in `cwd` as a path `string` to override the current working directory.
 * @returns Promise that resolves to the user config object.
 */
export async function loadConfig({ cwd = process.cwd() } = {}): Promise<
  ConfigResult<LoadedFlatbreadConfig>
> {
  const configFilePath = path.join(cwd, 'flatbread.config.js');

  const configModule = validateConfigHasExports(
    await import(url.pathToFileURL(configFilePath).href)
  );
  const rawConfig = validateConfigStructure(configModule.default);

  const config = initializeConfig(rawConfig);

  return {
    filepath: configFilePath,
    config: config,
  };
}

/**
 * Validate that the user config has a default export that is an object.
 *
 * @param config user config
 * @returns user config
 */
export function validateConfigHasExports<
  C extends { default: LoadedFlatbreadConfig }
>(config: unknown | any): C {
  const type = typeof config;

  if (type === 'undefined') {
    throw new Error(
      'Your flatbread config is missing default exports. Make sure to include "export default config;"'
    );
  }

  if (config.default && typeof config.default !== 'object') {
    throw new Error(
      `Unexpected default export type "${typeof config.default}" in your flatbread config, make sure your default export is an object.`
    );
  }

  return config as C;
}

/**
 * Validate that the user config has `source` and `content` properties.
 *
 * @todo More thoroughly validate that the config is valid with joi and throw errors if not
 * @param config user config object
 * @returns user config object
 */
export function validateConfigStructure<C extends FlatbreadConfig>(
  config: C
): FlatbreadConfig {
  if (typeof config.source !== 'object') {
    throw new Error(
      'Your Flatbread config is missing a valid "source" property. Make sure to include an Flatbread-compatible source plugin, such as @flatbread/source-filesystem'
    );
  }

  if (!config.transformer) {
    throw new Error(
      `Your Flatbread config is missing a valid "transformer" property. Make sure to include a Flatbread-compatible transformer, such as @flatbread/transformer-markdown`
    );
  }

  if (!Array.isArray(config.content)) {
    throw new Error(
      'Your Flatbread config is missing a valid "content" property. Make sure to include an Flatbread-compatible source plugin, such as @flatbread/source-filesystem'
    );
  }

  return config;
}

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

export default defineConfig;
