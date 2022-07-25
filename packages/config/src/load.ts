import type { ConfigResult, FlatbreadConfig } from '@flatbread/core';
import { build } from 'esbuild';
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  validateConfigHasDefaultExport,
  validateConfigStructure,
} from './validate';

type ConfigFileExtension = 'js' | 'ts' | 'mjs' | 'mts';
type ConfigFileName = `flatbread.config.${ConfigFileExtension}`;

export const FLATBREAD_CONFIG_FILE_NAMES: ConfigFileName[] = [
  'flatbread.config.js',
  'flatbread.config.ts',
  'flatbread.config.mjs',
];

const FLATBREAD_CONFIG_FILE_REGEX = /flatbread\.config\.m?[jt]s$/;

const VALID_CONFIG_NAMES_MESSAGE = `Valid config filenames are:
  ${FLATBREAD_CONFIG_FILE_NAMES.join('\n')}
`;

/**
 * Loads an ESModule-style config file.
 */
const esmLoader = async (
  filename: string,
  code: string
): Promise<FlatbreadConfig> => {
  const configModule = await loadConfigFromBundledFile(filename, code);

  validateConfigStructure(configModule);

  return configModule;
};

async function loadConfigFromBundledFile(
  fileName: string,
  bundledCode: string
): Promise<FlatbreadConfig> {
  // swiped a bit from https://github.com/vitejs/vite/blob/main/packages/vite/src/node/config.ts
  //
  // for esm, before we can register loaders without requiring users to run node
  // with --experimental-loader themselves, we have to do a hack here:
  // write it to disk, load it with native Node ESM, then delete the file.
  const fileBase = `${fileName}.timestamp-${Date.now()}`;
  const fileNameTmp = `${fileBase}.mjs`;
  const fileUrl = `${pathToFileURL(fileBase)}.mjs`;
  await fs.writeFile(fileNameTmp, bundledCode);

  try {
    const configModule = await import(fileUrl);
    validateConfigHasDefaultExport(configModule);
    
    return configModule.default;
  } finally {
    await fs.unlink(fileNameTmp);
  }
}

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
  let configFileName: ConfigFileName;
  const files = await fs.readdir(cwd);

  const matchingFiles = files.filter((file) =>
    FLATBREAD_CONFIG_FILE_REGEX.test(file)
  ) as ConfigFileName[];

  if (matchingFiles.length > 1) {
    throw new Error(
      `Multiple config files found. Please declare only one! 😅
        
        (found ${matchingFiles.join(', ')}).
        
        ${VALID_CONFIG_NAMES_MESSAGE}
      `
    );
  } else if (matchingFiles.length === 1) {
    // Grab the config file name declared in the user's project root
    configFileName = matchingFiles[0];
  } else {
    throw new Error(`No config file found. Please declare one! 😅`);
  }

  const configFilePath = path.join(cwd, configFileName);
  const { code } = await bundleConfigFile(cwd, configFileName);
  const config = await esmLoader(configFileName, code);

  return {
    filepath: configFilePath,
    config: config,
  };
}

/**
 * Bundle the config file with esbuild and return the code.
 * @param fileName config file name
 * @returns
 */
async function bundleConfigFile(
  cwd: string,
  fileName: string
): Promise<{ code: string }> {
  const configBuild = await build({
    absWorkingDir: cwd,
    entryPoints: [fileName],
    write: false,
    platform: 'node',
    bundle: true,
    format: 'esm',
    sourcemap: 'inline',
    sourcesContent: false,
    metafile: true,
    banner: {
      // Workaround for "Dynamic require of "os" is not supported" issue https://github.com/evanw/esbuild/issues/1921
      js: "import { createRequire } from 'module';const require = createRequire(import.meta.url);",
    },
    outExtension: {
      '.js': '.mjs',
    },
  });

  const { text } = configBuild?.outputFiles[0];

  return {
    code: text,
  };
}
