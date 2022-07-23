import { FlatbreadConfig } from '@flatbread/core';

export { loadConfig } from './load';

/**
 * Type-assisted config builder
 *
 * @param config flatbread instance options
 * @returns flatbread config
 */
export const defineConfig = (config: FlatbreadConfig): FlatbreadConfig =>
  config;

export default defineConfig;
