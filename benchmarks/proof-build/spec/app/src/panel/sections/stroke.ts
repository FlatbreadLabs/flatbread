import type { SectionDescriptor } from '../schema.ts';
import { field } from '../schema.ts';
import { command } from '../../commands/types.ts';
import type { Json } from '../../commands/types.ts';
import { firstStroke, withStroke } from '../../model/style.ts';
import type { SceneNode, Stroke } from '../../model/types.ts';
import { isStyled } from '../../model/types.ts';

function setStroke(node: SceneNode, patch: Partial<Stroke>) {
  if (!isStyled(node)) return [];
  return [
    command('set-prop', {
      id: node.id,
      key: 'strokes',
      value: withStroke(node.strokes, patch) as unknown as Json[],
    }),
  ];
}

export const strokeSection: SectionDescriptor = {
  name: 'stroke',
  title: 'Stroke',
  fields: [
    field({
      label: 'Stroke',
      kind: 'color',
      appliesTo: isStyled,
      read: (node) => firstStroke(node)?.color ?? '',
      write: (node, value) => setStroke(node, { color: value as string }),
    }),
    field({
      label: 'Stroke width',
      kind: 'length',
      min: 0,
      appliesTo: isStyled,
      read: (node) => firstStroke(node)?.width ?? 0,
      write: (node, value) => setStroke(node, { width: value as number }),
    }),
  ],
};
