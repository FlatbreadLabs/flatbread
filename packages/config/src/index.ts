import path from 'path';
import url from 'url';

import type { OyuConfig, ConfigResult } from './types';

// Config handlers will go here
export * from './types';

/**
 * Type-assisted config builder
 *
 * @param config oyu instance options
 * @returns oyu config
 */
const defineConfig = (config: OyuConfig): OyuConfig => config;

/**
 * Pulls the user config from an optionally specified filepath.
 *
 * By default, this will search the current working directory.
 *
 * @param options options for loading the config file, defaults to `{}`. Can pass in `cwd` as a path `string` to override the current working directory.
 * @returns Promise that resolves to the user config object.
 */
export async function loadConfig({ cwd = process.cwd() } = {}): Promise<
  ConfigResult<OyuConfig>
> {
  const configFilePath = path.join(cwd, 'oyu.config.js');

  const configModule = validateConfigHasExports(
    await import(url.pathToFileURL(configFilePath).href)
  );
  const config = validateConfigStructure(configModule.default);

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
export function validateConfigHasExports<C extends { default: OyuConfig }>(
  config: unknown
): C {
  const type = typeof config;

  if (type === 'undefined') {
    throw new Error(
      'Your config is missing default exports. Make sure to include "export default config;"'
    );
  }

  if (type !== 'object') {
    throw new Error(
      `Unexpected config type "${type}", make sure your default export is an object.`
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
export function validateConfigStructure<C extends OyuConfig>(
  config: C
): OyuConfig {
  if (typeof config.source !== 'object') {
    throw new Error(
      'Your Oyu config is missing a valid "source" property. Make sure to include an Oyu-compatible source plugin, such as @oyu/source-filesystem'
    );
  }

  if (!Array.isArray(config.content)) {
    throw new Error(
      'Your Oyu config is missing a valid "content" property. Make sure to include an Oyu-compatible source plugin, such as @oyu/source-filesystem'
    );
  }

  return config;
}

export default defineConfig;
