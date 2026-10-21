// The default shortcut table as plugin API v1 reports it through
// `api.shortcuts()`. It is frozen together with the v1 API.

export type KeymapScope = 'global' | 'canvas' | 'layers' | 'panel';

export type Keymap = Readonly<
  Record<KeymapScope, Readonly<Record<string, string>>>
>;

function deepFreeze<T extends object>(value: T): T {
  for (const inner of Object.values(value))
    if (inner && typeof inner === 'object') deepFreeze(inner);
  return Object.freeze(value);
}

export const DEFAULT_KEYMAP: Keymap = deepFreeze({
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
});

/** The action name a chord had in the v1 table, if any. */
export function legacyAction(
  scope: KeymapScope,
  chord: string
): string | undefined {
  return DEFAULT_KEYMAP[scope][chord];
}
