import defaultConfig from './defaults.js';
import fs from 'fs';

import type { FlatbreadConfig } from './types';

export const constructConfig = async (): Promise<FlatbreadConfig> => {
  return merge(await load());
};

const load = async (): Promise<FlatbreadConfig | Record<string, never>> => {
  const configPath =
    process.env.OYU_CONFIG_PATH || process.env.PWD + '/flatbread.config.js';
  const config = fs.existsSync(configPath)
    ? await import(configPath)
    : { default: {} };
  return config.default;
};

const merge = (
  config: FlatbreadConfig | Record<string, never>
): FlatbreadConfig => {
  return { ...defaultConfig, ...config };
};

export default constructConfig;
