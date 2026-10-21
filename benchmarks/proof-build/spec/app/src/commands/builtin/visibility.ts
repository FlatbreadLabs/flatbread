import type { CommandHandler, Json } from '../types.ts';
import { command } from '../types.ts';

interface VisibilityItem {
  id: string;
  visible: boolean;
}

export const visibilityHandler: CommandHandler = {
  type: 'set-visibility',
  label: 'Change visibility',
  apply({ doc }, payload) {
    const items = payload.items as unknown as VisibilityItem[];
    const before = items.map((item) => ({
      id: item.id,
      visible: doc.require(item.id).visible,
    }));
    for (const item of items) doc.update(item.id, { visible: item.visible });
    return command('set-visibility', { items: before as unknown as Json[] });
  },
};

export function visibilityItems(
  ids: readonly string[],
  visible: boolean
): Json[] {
  return ids.map((id) => ({ id, visible }));
}
