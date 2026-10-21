// Focus scopes. Key presses go to the scope that has focus, then to the
// global bindings.

export type Scope = 'canvas' | 'layers' | 'panel';

export const SCOPES: readonly Scope[] = ['canvas', 'layers', 'panel'];

export function isScope(value: string): value is Scope {
  return (SCOPES as readonly string[]).includes(value);
}

export class FocusTracker {
  private scope: Scope = 'canvas';
  private listeners = new Set<(scope: Scope) => void>();

  get current(): Scope {
    return this.scope;
  }

  focus(scope: Scope): void {
    if (!isScope(scope)) throw new Error(`unknown scope ${scope}`);
    if (scope === this.scope) return;
    this.scope = scope;
    for (const listener of this.listeners) listener(scope);
  }

  onChange(listener: (scope: Scope) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}
