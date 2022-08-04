import {
  ConfigResult,
  FlatbreadConfig,
  initializeConfig,
} from '@flatbread/core';
import { build } from 'esbuild';
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { NoConfigFoundError, TooManyConfigsFoundError } from './errors';
import {
  validateConfigHasDefaultExport,
  validateConfigStructure,
} from './validate';
import { ConfigFileName, FLATBREAD_CONFIG_FILE_REGEX } from './filenames';
import { existsSync, readFileSync, statSync } from 'node:fs';

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
    throw new TooManyConfigsFoundError(matchingFiles);
  } else if (matchingFiles.length === 1) {
    // Grab the config file name declared in the user's project root
    configFileName = matchingFiles[0];
  } else {
    throw new NoConfigFoundError();
  }

  const configFilePath = path.join(cwd, configFileName);
  const { code } = await bundleConfigFile(cwd, configFileName);
  const rawConfig = await esmLoader(configFileName, code);
  const config = initializeConfig(rawConfig);

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
    watch: true,
    plugins: [
      {
        //
        // This prevents esbuild from bundling node-modules particularly to avoid an issue when bundling dependencies that puke when loaded in an ESM scope, even if shimmed.
        // Thank u for the solution to this, Vite :)
        //
        name: 'externalize-deps',
        setup(build) {
          build.onResolve({ filter: /.*/ }, ({ path: id, importer }) => {
            //
            // Externalize bare imports (ex. `import { createSvImgField } from '@flatbread/resolver-svimg'`)
            //
            if (id[0] !== '.' && !path.isAbsolute(id)) {
              return {
                external: true,
              };
            }
            //
            // Bundle the rest and make sure that we can also access
            // its third-party dependencies.
            //
            // Externalize if not.
            //
            // monorepo/
            //  ├─ package.json
            //  ├─ utils.js -----------> bundle (share same node_modules)
            //  ├─ flatbread-project/
            //  │   ├─ flatbread.config.js --> entry
            //  │   ├─ package.json
            //  ├─ anotha-project/
            //  │   ├─ utils.js --------> external (has own node_modules)
            //  │   ├─ package.json
            //
            const idFsPath = path.resolve(path.dirname(importer), id);
            const idPkgPath = lookupFile(idFsPath, [`package.json`], {
              pathOnly: true,
            });
            if (idPkgPath) {
              const idPkgDir = path.dirname(idPkgPath);
              // if this file needs to go up one or more directory to reach the flatbread config,
              // that means it has it's own node_modules (e.g. `anotha-project` in the above graph)
              if (path.relative(idPkgDir, fileName).startsWith('..')) {
                return {
                  // normalize actual import after bundled as a single flatbread config
                  path: pathToFileURL(idFsPath).href,
                  external: true,
                };
              }
            }
          });
        },
      },
    ],
  });

  const { text } = configBuild?.outputFiles[0];

  return {
    code: text,
  };
}

interface LookupFileOptions {
  pathOnly?: boolean;
  rootDir?: string;
}

/**
 * Lookup a file in a directory, diving into subdirectories until it is found.
 */
function lookupFile(
  dir: string,
  formats: string[],
  options?: LookupFileOptions
): string | undefined {
  for (const format of formats) {
    const fullPath = path.join(dir, format);
    if (existsSync(fullPath) && statSync(fullPath).isFile()) {
      return options?.pathOnly ? fullPath : readFileSync(fullPath, 'utf-8');
    }
  }
  const parentDir = path.dirname(dir);
  if (
    parentDir !== dir &&
    (!options?.rootDir || parentDir.startsWith(options?.rootDir))
  ) {
    return lookupFile(parentDir, formats, options);
  }
}
