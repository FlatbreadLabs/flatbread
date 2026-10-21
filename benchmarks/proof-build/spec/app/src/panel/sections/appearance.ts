import type { SectionDescriptor } from '../schema.ts';
import { field } from '../schema.ts';
import { command } from '../../commands/types.ts';
import { clampOpacity } from '../../model/style.ts';

export const appearanceSection: SectionDescriptor = {
  name: 'appearance',
  title: 'Appearance',
  fields: [
    field({
      label: 'Opacity',
      kind: 'percent',
      min: 0,
      max: 1,
      appliesTo: () => true,
      read: (node) => node.opacity,
      write: (node, value) => [
        command('set-prop', {
          id: node.id,
          key: 'opacity',
          value: clampOpacity(value as number),
        }),
      ],
    }),
  ],
};
