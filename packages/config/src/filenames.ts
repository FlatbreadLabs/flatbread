export type ConfigFileExtension = 'js' | 'mjs' | 'cjs' | 'ts' | 'mts' | 'cts';
export type ConfigFileName = `flatbread.config.${ConfigFileExtension}`;

export const FLATBREAD_CONFIG_FILE_NAMES: ConfigFileName[] = [
  'flatbread.config.js',
  'flatbread.config.mjs',
  'flatbread.config.cjs',

  'flatbread.config.ts',
  'flatbread.config.mts',
  'flatbread.config.cts',
];

export const FLATBREAD_CONFIG_FILE_REGEX = /^flatbread\.config\.[mc]?[jt]s$/;
