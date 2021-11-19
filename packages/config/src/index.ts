import type { OyuConfig } from './types';

// Config handlers will go here
export * from './types';

/**
 * Type-assisted config builder
 *
 * @todo Verify that the config is valid with joi and throw errors if not
 * @param config oyu instance options
 * @returns oyu config
 */
const defineConfig = (config: OyuConfig): OyuConfig => config;

export default defineConfig;
