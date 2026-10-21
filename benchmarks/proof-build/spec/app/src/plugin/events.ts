// Events a plugin can listen to, and their payloads.

export interface PluginEvents {
  /** Nodes were added, removed or changed. */
  documentchange: { ids: string[] };
  /** A document was loaded from a file. */
  documentload: { name: string };
  /** Undo or redo availability changed. */
  historychange: { canUndo: boolean; canRedo: boolean };
}

export type PluginEventName = keyof PluginEvents;

export const PLUGIN_EVENTS: readonly PluginEventName[] = [
  'documentchange',
  'documentload',
  'historychange',
];

export function isPluginEvent(name: string): name is PluginEventName {
  return (PLUGIN_EVENTS as readonly string[]).includes(name);
}
