import type { SectionDescriptor } from '../schema.ts';
import { field } from '../schema.ts';
import { command } from '../../commands/types.ts';
import type { TextNode } from '../../model/types.ts';
import { isText } from '../../model/types.ts';
import { autoHeight } from '../../model/text.ts';

function setText(
  node: TextNode,
  key: 'text' | 'fontSize' | 'lineHeight',
  value: string | number
) {
  const next = { ...node, [key]: value };
  return [
    command('set-prop', { id: node.id, key, value }),
    command('set-prop', {
      id: node.id,
      key: 'height',
      value: autoHeight(next),
    }),
  ];
}

export const textSection: SectionDescriptor = {
  name: 'text',
  title: 'Text',
  fields: [
    field({
      label: 'Text',
      kind: 'text',
      appliesTo: isText,
      read: (node) => (node as TextNode).text,
      write: (node, value) => setText(node as TextNode, 'text', String(value)),
    }),
    field({
      label: 'Font size',
      kind: 'number',
      min: 1,
      max: 1000,
      appliesTo: isText,
      read: (node) => (node as TextNode).fontSize,
      write: (node, value) =>
        setText(node as TextNode, 'fontSize', value as number),
    }),
    field({
      label: 'Line height',
      kind: 'number',
      min: 0.5,
      max: 5,
      appliesTo: isText,
      read: (node) => (node as TextNode).lineHeight,
      write: (node, value) =>
        setText(node as TextNode, 'lineHeight', value as number),
    }),
  ],
};
