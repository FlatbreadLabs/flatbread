import colors from 'kleur';
import type { ConfigResult, FlatbreadConfig } from 'flatbread';

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
      colors.red('\nFlatbread could not find a valid') +
        colors.bold(' flatbread.config.js') +
        colors.red(
          ' file. Make sure you have one with the correct schema in your project root to use this!\n'
        )
    );
    console.error(err);
    process.exit(1);
  }
}
