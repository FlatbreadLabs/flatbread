import colors from 'kleur';
import { FLATBREAD_CONFIG_FILE_NAMES } from './filenames';

const VALID_CONFIG_NAMES_MESSAGE = `Valid config filenames are:\n\t${colors.green(
  FLATBREAD_CONFIG_FILE_NAMES.join('\n\t')
)}
`;

/**
 * If no config file is found, throw an error.
 */
export class NoConfigFoundError extends Error {
  constructor() {
    super();
    this.message =
      colors.red(
        `No config file found. Please declare one! 😅\n
      `
      ) + VALID_CONFIG_NAMES_MESSAGE;
  }
}

/**
 * If multiple config files are found, throw an error.
 */
export class TooManyConfigsFoundError extends Error {
  constructor(matchingFiles: string[]) {
    super();
    this.message =
      colors.red(`Multiple config files found (${colors.gray(
        matchingFiles.join(', ')
      )}).
      
      Please declare ${colors.bold('only')} one! 😅\n
      `) + VALID_CONFIG_NAMES_MESSAGE;
  }
}
