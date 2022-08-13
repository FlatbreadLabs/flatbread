import { FlatbreadConfig } from '@flatbread/core';

export { loadConfig } from './load';

/**
 * Type-assisted config builder
 *
 * @param config flatbread instance options
 * @returns flatbread config
 */
export function defineConfig(config: FlatbreadConfig): FlatbreadConfig {
  return config;
}

export default defineConfig;
