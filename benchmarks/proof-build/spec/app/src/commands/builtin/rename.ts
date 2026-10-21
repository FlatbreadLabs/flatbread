import type { CommandHandler } from '../types.ts';
import { command } from '../types.ts';

export const renameHandler: CommandHandler = {
  type: 'rename',
  label: 'Rename',
  apply({ doc }, payload) {
    const id = payload.id as string;
    const name = payload.name as string;
    const previous = doc.require(id).name;
    doc.update(id, { name });
    return command('rename', { id, name: previous });
  },
};
