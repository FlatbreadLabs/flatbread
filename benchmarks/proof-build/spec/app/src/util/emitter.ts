// A small typed event emitter. `Events` maps each event name to its payload.

export type Listener<T> = (payload: T) => void;

export class Emitter<Events extends Record<string, unknown>> {
  private listeners = new Map<keyof Events, Set<Listener<never>>>();

  on<K extends keyof Events>(
    event: K,
    listener: Listener<Events[K]>
  ): () => void {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }
    set.add(listener as Listener<never>);
    return () => this.off(event, listener);
  }

  once<K extends keyof Events>(
    event: K,
    listener: Listener<Events[K]>
  ): () => void {
    const off = this.on(event, (payload) => {
      off();
      listener(payload);
    });
    return off;
  }

  off<K extends keyof Events>(event: K, listener: Listener<Events[K]>): void {
    this.listeners.get(event)?.delete(listener as Listener<never>);
  }

  emit<K extends keyof Events>(event: K, payload: Events[K]): void {
    const set = this.listeners.get(event);
    if (!set) return;
    for (const listener of [...set]) (listener as Listener<Events[K]>)(payload);
  }

  listenerCount(event: keyof Events): number {
    return this.listeners.get(event)?.size ?? 0;
  }

  clear(): void {
    this.listeners.clear();
  }
}
