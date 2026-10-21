import type { CommandHandler } from '../types.ts';
import { command } from '../types.ts';
import { translate } from './move.ts';

export const NUDGE_STEP = 1;
export const NUDGE_STEP_LARGE = 10;

export type Direction = 'left' | 'right' | 'up' | 'down';

export function nudgeDelta(
  direction: Direction,
  large = false
): { dx: number; dy: number } {
  const step = large ? NUDGE_STEP_LARGE : NUDGE_STEP;
  switch (direction) {
    case 'left':
      return { dx: -step, dy: 0 };
    case 'right':
      return { dx: step, dy: 0 };
    case 'up':
      return { dx: 0, dy: -step };
    case 'down':
      return { dx: 0, dy: step };
  }
}

export const nudgeHandler: CommandHandler = {
  type: 'nudge',
  label: 'Nudge',
  apply({ doc }, payload) {
    const ids = payload.ids as string[];
    const dx = payload.dx as number;
    const dy = payload.dy as number;
    translate(doc, ids, dx, dy);
    return command('nudge', { ids, dx: -dx, dy: -dy });
  },
};
