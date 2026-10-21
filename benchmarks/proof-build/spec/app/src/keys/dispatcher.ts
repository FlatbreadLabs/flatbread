import type { EditorContext } from '../commands/types.ts';
import type { Palette } from '../commands/palette.ts';
import type { LayersPanel } from '../layers/layers.ts';
import { normalizeChord } from './chords.ts';
import type { Scope } from './scopes.ts';
import { FocusTracker } from './scopes.ts';
import { canvasBindings } from './bindings/canvas.ts';
import { layersBindings } from './bindings/layers.ts';
import { panelBindings } from './bindings/panel.ts';

export interface KeyEvent {
  chord: string;
  /** True for the auto-repeat presses while a key is held. */
  repeat: boolean;
}

export interface KeyContext extends EditorContext {
  palette: Palette;
  layers: LayersPanel;
  focus(scope: Scope): void;
}

export interface Binding {
  chord: string;
  run(ctx: KeyContext, event: KeyEvent): void;
  /** Called when the chord's key goes up, if the binding cares. */
  release?(ctx: KeyContext, event: KeyEvent): void;
}

export type BindingScope = Scope | 'global';

export const GLOBAL_BINDINGS: readonly Binding[] = [
  { chord: 'Mod+Z', run: (ctx) => void ctx.undo() },
  { chord: 'Mod+Shift+Z', run: (ctx) => void ctx.redo() },
];

export class KeyDispatcher {
  readonly focus = new FocusTracker();
  private bindings = new Map<BindingScope, Map<string, Binding>>();
  private held = new Map<string, Binding>();
  private ctx: KeyContext;

  constructor(ctx: Omit<KeyContext, 'focus'>) {
    this.ctx = {
      ...ctx,
      focus: (scope: Scope) => this.focus.focus(scope),
    } as KeyContext;
  }

  register(scope: BindingScope, binding: Binding): void {
    let scoped = this.bindings.get(scope);
    if (!scoped) {
      scoped = new Map();
      this.bindings.set(scope, scoped);
    }
    const chord = normalizeChord(binding.chord);
    scoped.set(chord, { ...binding, chord });
  }

  bindingFor(scope: BindingScope, chord: string): Binding | undefined {
    return this.bindings.get(scope)?.get(normalizeChord(chord));
  }

  /** The binding a chord reaches from the focused scope. */
  resolve(chord: string): Binding | undefined {
    return (
      this.bindingFor(this.focus.current, chord) ??
      this.bindingFor('global', chord)
    );
  }

  down(chord: string, options: { repeat?: boolean } = {}): boolean {
    const normal = normalizeChord(chord);
    const binding = this.resolve(normal);
    if (!binding) return false;
    this.held.set(normal, binding);
    binding.run(this.ctx, { chord: normal, repeat: !!options.repeat });
    return true;
  }

  up(chord: string): void {
    const normal = normalizeChord(chord);
    const binding = this.held.get(normal);
    this.held.delete(normal);
    binding?.release?.(this.ctx, { chord: normal, repeat: false });
  }

  /** A full press: down, then up. Returns whether a binding ran. */
  press(chord: string): boolean {
    const ran = this.down(chord);
    this.up(chord);
    return ran;
  }
}

/** Adds a binding to a scope. A later binding for the same chord replaces the earlier one. */
export function registerBinding(
  dispatcher: KeyDispatcher,
  scope: BindingScope,
  binding: Binding
): void {
  dispatcher.register(scope, binding);
}

export function createDispatcher(
  ctx: Omit<KeyContext, 'focus'>
): KeyDispatcher {
  const dispatcher = new KeyDispatcher(ctx);
  for (const binding of GLOBAL_BINDINGS)
    registerBinding(dispatcher, 'global', binding);
  for (const binding of canvasBindings)
    registerBinding(dispatcher, 'canvas', binding);
  for (const binding of layersBindings)
    registerBinding(dispatcher, 'layers', binding);
  for (const binding of panelBindings)
    registerBinding(dispatcher, 'panel', binding);
  return dispatcher;
}
