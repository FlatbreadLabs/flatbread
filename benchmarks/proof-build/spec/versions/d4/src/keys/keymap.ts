// The shortcut table. Every shortcut is registered here, by scope, as the
// name of an action the dispatcher runs. Plugins read the same table through
// `api.shortcuts()`.

export type KeymapScope = 'global' | 'canvas' | 'layers' | 'panel';

export type Keymap = Record<KeymapScope, Record<string, string>>;

export const DEFAULT_KEYMAP: Keymap = {
  global: {
    'Mod+Z': 'undo',
    'Mod+Shift+Z': 'redo',
  },
  canvas: {
    Delete: 'delete',
    Backspace: 'delete',
    Escape: 'deselect-all',
    'Mod+A': 'select-all',
    'Mod+G': 'group',
    'Mod+]': 'bring-forward',
    'Mod+[': 'send-backward',
    'Mod+Shift+]': 'bring-to-front',
    'Mod+Shift+[': 'send-to-back',
    'Mod+Shift+L': 'toggle-lock',
    ArrowLeft: 'nudge-left',
    ArrowRight: 'nudge-right',
    ArrowUp: 'nudge-up',
    ArrowDown: 'nudge-down',
    'Shift+ArrowLeft': 'nudge-left-large',
    'Shift+ArrowRight': 'nudge-right-large',
    'Shift+ArrowUp': 'nudge-up-large',
    'Shift+ArrowDown': 'nudge-down-large',
  },
  layers: {
    ArrowUp: 'select-previous',
    ArrowDown: 'select-next',
    ArrowRight: 'expand',
    ArrowLeft: 'collapse',
    Delete: 'delete',
    'Mod+G': 'group',
  },
  panel: {
    Escape: 'focus-canvas',
  },
};

/** Adds or replaces a shortcut. The dispatcher sees it on the next press. */
export function registerBinding(
  keymap: Keymap,
  scope: KeymapScope,
  chord: string,
  action: string
): void {
  keymap[scope][chord] = action;
}

/** The action a chord runs in a scope, if any. */
export function lookup(
  keymap: Keymap,
  scope: KeymapScope,
  chord: string
): string | undefined {
  return keymap[scope][chord];
}
