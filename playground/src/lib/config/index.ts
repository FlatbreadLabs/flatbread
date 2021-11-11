import defaultConfig from './defaults.js';
import fs from 'fs';

import type { OyuConfig } from './types';

export const constructConfig = async (): Promise<OyuConfig> => {
  return merge(await load());
};

const load = async (): Promise<OyuConfig | Record<string, never>> => {
  const configPath =
    process.env.OYU_CONFIG_PATH || process.env.PWD + '/oyu.config.js';
  const config = fs.existsSync(configPath)
    ? await import(configPath)
    : { default: {} };
  return config.default;
};

const merge = (config: OyuConfig | Record<string, never>): OyuConfig => {
  return { ...defaultConfig, ...config };
};

export default constructConfig;
