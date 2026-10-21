import type { CommandHandler, Json } from '../types.ts';
import { command } from '../types.ts';

interface LockItem {
  id: string;
  locked: boolean;
}

export const lockHandler: CommandHandler = {
  type: 'set-lock',
  label: 'Change lock',
  apply({ doc }, payload) {
    const items = payload.items as unknown as LockItem[];
    const before = items.map((item) => ({
      id: item.id,
      locked: doc.require(item.id).locked,
    }));
    for (const item of items) doc.update(item.id, { locked: item.locked });
    return command('set-lock', { items: before as unknown as Json[] });
  },
};

export function lockItems(ids: readonly string[], locked: boolean): Json[] {
  return ids.map((id) => ({ id, locked }));
}
