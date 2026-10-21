import { fail } from '../util/assert.ts';

/** `export`: read the whole document as a saved file string. */
export type Capability = 'export';

export const CAPABILITIES: readonly Capability[] = ['export'];

export function checkCapabilities(
  requested: readonly string[] = []
): Capability[] {
  for (const name of requested)
    if (!(CAPABILITIES as readonly string[]).includes(name))
      fail('unknown-capability', `unknown plugin capability "${name}"`);
  return [...new Set(requested)] as Capability[];
}
