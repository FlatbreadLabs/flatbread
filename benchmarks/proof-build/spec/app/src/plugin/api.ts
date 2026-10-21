// Plugin API v1. FROZEN: plugins in the wild depend on this exact surface.
// Do not add, remove or rename members of PluginApiV1 or change what they
// return; test/plugin.test.ts checks the surface. New abilities go in a v2.

import type { Keymap } from '../keys/keymap.ts';
import type { PluginEventName, PluginEvents } from './events.ts';

export interface ExportCapability {
  /** The document as `files.save()` writes it. */
  document(): string;
}

export interface PluginApiV1 {
  readonly version: 1;
  readonly name: string;
  on<K extends PluginEventName>(
    event: K,
    listener: (payload: PluginEvents[K]) => void
  ): void;
  off<K extends PluginEventName>(
    event: K,
    listener: (payload: PluginEvents[K]) => void
  ): void;
  /** Ids of the selected layers. */
  getSelection(): string[];
  /** Runs a palette command by title. Returns false when it is disabled. */
  runCommand(title: string): boolean;
  listCommands(): string[];
  shortcuts(): Keymap;
  /** Present only with the `export` capability. */
  readonly export?: ExportCapability;
}

export const PLUGIN_API_V1_SURFACE: readonly string[] = [
  'export',
  'getSelection',
  'listCommands',
  'name',
  'off',
  'on',
  'runCommand',
  'shortcuts',
  'version',
];

export interface PluginManifest {
  name: string;
  capabilities?: string[];
  main(api: PluginApiV1): void;
}
