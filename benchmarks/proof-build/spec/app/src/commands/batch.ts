import type { CommandBus } from './bus.ts';

export function batch(bus: CommandBus, label: string, run: () => void): void {
  bus.beginBatch(label);
  try {
    run();
  } finally {
    bus.endBatch();
  }
}
