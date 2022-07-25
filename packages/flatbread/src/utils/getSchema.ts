import colors from 'kleur';
import type { ConfigResult, FlatbreadConfig } from '../';

/**
 * Wrapper around grabbing the user config and killing
 * the process if the config file is invalid.
 *
 * @returns user config promise
 */
export async function getConfig(): Promise<ConfigResult<FlatbreadConfig>> {
  const { loadConfig } = await import('@flatbread/config');

  try {
    return await loadConfig();
  } catch (err) {
    // Provide a helpful error message if the config file is not found
    console.error(
      colors.red('\nFlatbread was not supplied a valid') +
        colors.bold(' config') +
        colors.red(' file.\n')
    );
    console.error(err);
    process.exit(1);
  }
}
