import type { SectionDescriptor } from '../schema.ts';
import { field } from '../schema.ts';
import { command } from '../../commands/types.ts';
import type { Json } from '../../commands/types.ts';
import { scaledSubtree } from '../../commands/builtin/resize.ts';
import { rectOf } from '../../model/geometry.ts';
import type { SceneNode } from '../../model/types.ts';
import { normalizeAngle } from '../../model/transform.ts';

const any = () => true;

function moveTo(node: SceneNode, axis: 'x' | 'y', value: number) {
  const delta = value - node[axis];
  if (delta === 0) return [];
  return [
    command('move', {
      ids: [node.id],
      dx: axis === 'x' ? delta : 0,
      dy: axis === 'y' ? delta : 0,
    }),
  ];
}

export const layoutSection: SectionDescriptor = {
  name: 'layout',
  title: 'Layout',
  fields: [
    field({
      label: 'X',
      kind: 'length',
      appliesTo: any,
      read: (node) => node.x,
      write: (node, value) => moveTo(node, 'x', value as number),
    }),
    field({
      label: 'Y',
      kind: 'length',
      appliesTo: any,
      read: (node) => node.y,
      write: (node, value) => moveTo(node, 'y', value as number),
    }),
    field({
      label: 'W',
      kind: 'length',
      min: 1,
      appliesTo: any,
      read: (node) => node.width,
      write: (node, value, doc) => [
        command('resize', {
          items: scaledSubtree(doc, node.id, {
            ...rectOf(node),
            width: value as number,
          }) as unknown as Json[],
        }),
      ],
    }),
    field({
      label: 'H',
      kind: 'length',
      min: 1,
      appliesTo: (node) => node.type !== 'line',
      read: (node) => node.height,
      write: (node, value, doc) => [
        command('resize', {
          items: scaledSubtree(doc, node.id, {
            ...rectOf(node),
            height: value as number,
          }) as unknown as Json[],
        }),
      ],
    }),
    field({
      label: 'Rotation',
      kind: 'angle',
      appliesTo: (node) => node.type !== 'group',
      read: (node) => node.rotation,
      write: (node, value) => [
        command('set-prop', {
          id: node.id,
          key: 'rotation',
          value: normalizeAngle(value as number),
        }),
      ],
    }),
  ],
};
