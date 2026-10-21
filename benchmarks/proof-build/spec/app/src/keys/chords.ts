// Key chords as strings: modifiers in a fixed order, then the key, joined by
// `+`. `Mod` is the platform command key (Cmd on macOS, Ctrl elsewhere).

const MODIFIERS = ['Mod', 'Alt', 'Shift'] as const;
type Modifier = typeof MODIFIERS[number];

const ALIASES: Record<string, string> = {
  cmd: 'Mod',
  command: 'Mod',
  ctrl: 'Mod',
  control: 'Mod',
  meta: 'Mod',
  mod: 'Mod',
  option: 'Alt',
  alt: 'Alt',
  shift: 'Shift',
  esc: 'Escape',
  del: 'Delete',
  left: 'ArrowLeft',
  right: 'ArrowRight',
  up: 'ArrowUp',
  down: 'ArrowDown',
};

export interface Chord {
  key: string;
  mod: boolean;
  alt: boolean;
  shift: boolean;
}

function canonicalKey(key: string): string {
  const alias = ALIASES[key.toLowerCase()];
  if (alias) return alias;
  if (key.length === 1) return key.toUpperCase();
  return key[0].toUpperCase() + key.slice(1);
}

export function parseChord(text: string): Chord {
  const parts = text.split('+').map((p) => p.trim());
  // `Mod++` names the plus key.
  if (text.endsWith('++')) parts.splice(parts.length - 2, 2, '+');
  const chord: Chord = { key: '', mod: false, alt: false, shift: false };
  for (const part of parts) {
    const name = canonicalKey(part);
    if ((MODIFIERS as readonly string[]).includes(name)) {
      const m = name as Modifier;
      if (m === 'Mod') chord.mod = true;
      if (m === 'Alt') chord.alt = true;
      if (m === 'Shift') chord.shift = true;
    } else chord.key = name;
  }
  if (!chord.key) throw new Error(`chord "${text}" names no key`);
  return chord;
}

export function formatChord(chord: Chord): string {
  return [
    chord.mod && 'Mod',
    chord.alt && 'Alt',
    chord.shift && 'Shift',
    chord.key,
  ]
    .filter(Boolean)
    .join('+');
}

/** The one spelling of a chord: `shift+cmd+h` → `Mod+Shift+H`. */
export function normalizeChord(text: string): string {
  return formatChord(parseChord(text));
}

export function withoutShift(chord: string): string {
  const parsed = parseChord(chord);
  return formatChord({ ...parsed, shift: false });
}
