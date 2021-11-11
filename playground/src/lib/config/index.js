import defaultConfig from './defaults.js';
import fs from 'fs';
export const constructConfig = async () => {
  return merge(await load());
};
const load = async () => {
  const configPath =
    process.env.OYU_CONFIG_PATH || process.env.PWD + '/oyu.config.js';
  const config = fs.existsSync(configPath)
    ? await import(configPath)
    : { default: {} };
  return config.default;
};
const merge = (config) => {
  return { ...defaultConfig, ...config };
};
export default constructConfig;
//# sourceMappingURL=index.js.map
