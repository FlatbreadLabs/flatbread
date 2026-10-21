import { Emitter } from '../util/emitter.ts';

export interface SelectionEvents extends Record<string, unknown> {
  change: { ids: string[]; previous: string[] };
}

/** The ordered set of selected node ids. Order is the order of selecting. */
export class Selection {
  readonly events = new Emitter<SelectionEvents>();
  private current: string[] = [];

  ids(): string[] {
    return [...this.current];
  }

  has(id: string): boolean {
    return this.current.includes(id);
  }

  get size(): number {
    return this.current.length;
  }

  isEmpty(): boolean {
    return this.current.length === 0;
  }

  set(ids: Iterable<string>): void {
    const next = [...new Set(ids)];
    if (
      next.length === this.current.length &&
      next.every((id, i) => id === this.current[i])
    )
      return;
    const previous = this.current;
    this.current = next;
    this.events.emit('change', { ids: this.ids(), previous });
  }

  add(id: string): void {
    if (!this.has(id)) this.set([...this.current, id]);
  }

  remove(id: string): void {
    if (this.has(id)) this.set(this.current.filter((other) => other !== id));
  }

  toggle(id: string): void {
    if (this.has(id)) this.remove(id);
    else this.add(id);
  }

  clear(): void {
    this.set([]);
  }

  /** Drops ids that `keep` rejects, such as ones no longer in the document. */
  prune(keep: (id: string) => boolean): void {
    const next = this.current.filter(keep);
    if (next.length !== this.current.length) this.set(next);
  }
}
