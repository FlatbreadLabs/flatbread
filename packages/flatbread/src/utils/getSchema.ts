import colors from 'kleur';
import type { ConfigResult, LoadedFlatbreadConfig } from '../';

/**
 * Wrapper around grabbing the user config and killing
 * the process if the config file is invalid.
 *
 * @returns user config promise
 */
export async function getConfig(): Promise<
  ConfigResult<LoadedFlatbreadConfig>
> {
  try {
    return await loadFlatbreadConfig();
  } catch (err) {
    console.error(
      colors.red('\nFlatbread was not supplied a valid') +
        colors.bold(' config') +
        colors.red(' file.\n')
    );
    console.error(err);
    process.exit(1);
  }
}

export async function loadFlatbreadConfig(
  cwd = process.cwd()
): Promise<ConfigResult<LoadedFlatbreadConfig>> {
  const { loadConfig } = await import('@flatbread/config');
  const result = await loadConfig({ cwd });
  if (!result.config) throw new Error('Flatbread configuration was not found');
  const { initializeConfig } = await import('@flatbread/core');
  return { ...result, config: initializeConfig(result.config) };
}
