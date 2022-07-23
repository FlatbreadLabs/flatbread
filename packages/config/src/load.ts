import type { ConfigResult, FlatbreadConfig } from '@flatbread/core';
import {
  validateConfigHasDefaultExport,
  validateConfigStructure,
} from './validate';
import { cosmiconfig } from 'cosmiconfig';

/**
 * Loads an ESModule-style config file.
 */
const esmLoader = async (filePath: string) => {
  const configModule = await import(filePath);

  validateConfigHasDefaultExport(configModule);
  validateConfigStructure(configModule.default);

  return configModule.default;
};

/**
 * Pulls the user config from an optionally specified filepath.
 *
 * By default, this will search the current working directory.
 *
 * @param options options for loading the config file, defaults to `{}`. Can pass in `cwd` as a path `string` to override the current working directory.
 * @returns Promise that resolves to the user config object.
 */
export async function loadConfig({ cwd = process.cwd() } = {}): Promise<
  ConfigResult<FlatbreadConfig>
> {
  const moduleName = 'flatbread';

  const validExtensions = ['.js', '.mjs'];
  const configFileNamingScheme = [`.${moduleName}rc`, `${moduleName}.config`];
  const configFileNamePermutations = configFileNamingScheme.flatMap((scheme) =>
    validExtensions.map((ext) => `${scheme}${ext}`)
  );

  const explorer = cosmiconfig('flatbread', {
    searchPlaces: configFileNamePermutations,
    loaders: {
      '.js': esmLoader,
      '.mjs': esmLoader,
    },
  });

  const config = await explorer.search(cwd);

  return {
    filepath: config?.filepath,
    config: config?.config,
  };
}
