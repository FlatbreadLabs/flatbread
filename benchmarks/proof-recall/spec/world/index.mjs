// The `world` Effort: Kestrel world streaming and simulation core.
// Each thread lives in its own module; events merge here in time order.
// The sort is stable, so events that share a time keep their module order.
import compactions from './compactions.mjs';
import cells from './cells.mjs';
import ecs from './ecs.mjs';
import gull from './gull.mjs';
import io from './io.mjs';
import jobs from './jobs.mjs';
import pool from './pool.mjs';
import save from './save.mjs';
import tides from './tides.mjs';

const threads = [ecs, jobs, cells, tides, io, save, gull, pool, compactions];
const events = threads
  .flat()
  .map((event, order) => ({ event, order, time: Date.parse(event.at) }))
  .sort((a, b) => a.time - b.time || a.order - b.order)
  .map(({ event }) => event);

export default {
  key: 'world',
  effort: {
    title: 'Kestrel world streaming and simulation core',
    body: `Kestrel's engine core for Saltglass Reach: entity storage, the job system, world partition and streaming, the tide simulation, asset compression, save games, the Gull scripting VM, and memory budgets. Rhea Valdés leads; Kenji Arakawa owns streaming and Marta Lindqvist owns gameplay systems.`,
    created_at: '2025-09-01T09:00:00Z',
  },
  events,
};
