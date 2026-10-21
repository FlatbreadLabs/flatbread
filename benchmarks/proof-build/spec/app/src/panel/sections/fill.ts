import type { SectionDescriptor } from '../schema.ts';
import { field } from '../schema.ts';
import { command } from '../../commands/types.ts';
import type { Json } from '../../commands/types.ts';
import { firstFill, withFillColor } from '../../model/style.ts';
import { isStyled } from '../../model/types.ts';

export const fillSection: SectionDescriptor = {
  name: 'fill',
  title: 'Fill',
  fields: [
    field({
      label: 'Fill',
      kind: 'color',
      appliesTo: (node) => isStyled(node) && node.type !== 'line',
      read: (node) => firstFill(node)?.color ?? '',
      write: (node, value) => {
        if (!isStyled(node)) return [];
        return [
          command('set-prop', {
            id: node.id,
            key: 'fills',
            value: withFillColor(
              node.fills,
              value as string
            ) as unknown as Json[],
          }),
        ];
      },
    }),
  ],
};
