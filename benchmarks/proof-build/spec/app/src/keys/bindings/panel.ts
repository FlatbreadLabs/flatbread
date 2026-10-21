import type { Binding } from '../dispatcher.ts';

export const panelBindings: readonly Binding[] = [
  { chord: 'Escape', run: (ctx) => ctx.focus('canvas') },
];
