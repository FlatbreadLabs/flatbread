import type { SceneNode } from '../../model/types.ts';
import { fail } from '../../util/assert.ts';
import type { CommandHandler, Json } from '../types.ts';
import { command } from '../types.ts';

const STRUCTURAL = new Set(['id', 'type', 'parent', 'children']);

/** Sets one property on one node. The property must already exist on it. */
export const setPropHandler: CommandHandler = {
  type: 'set-prop',
  label: 'Set property',
  apply({ doc }, payload) {
    const id = payload.id as string;
    const key = payload.key as string;
    const node = doc.require(id) as unknown as Record<string, Json>;
    if (STRUCTURAL.has(key))
      fail('bad-prop', `${key} cannot be set with set-prop`);
    if (!(key in node)) fail('bad-prop', `${id} has no property ${key}`);
    const previous = structuredClone(node[key]);
    doc.update(id, {
      [key]: structuredClone(payload.value),
    } as Partial<SceneNode>);
    return command('set-prop', { id, key, value: previous });
  },
};
