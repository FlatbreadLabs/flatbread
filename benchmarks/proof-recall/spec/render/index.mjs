// The render Effort: Lantern, Kestrel's renderer, across the whole project.
// Each thread lives in its own module; events are merged in time order.
import core from './core.mjs';
import vb from './vb.mjs';
import shadows from './shadows.mjs';
import gi from './gi.mjs';
import saltglass from './saltglass.mjs';
import tern from './tern.mjs';
import hdr from './hdr.mjs';
import culling from './culling.mjs';

const threads = [core, vb, shadows, gi, saltglass, tern, hdr, culling];
const events = threads
  .flatMap((thread, t) => thread.map((event, i) => ({ event, t, i })))
  .sort(
    (a, b) => a.event.at.localeCompare(b.event.at) || a.t - b.t || a.i - b.i
  )
  .map(({ event }) => event);

export default {
  key: 'render',
  effort: {
    title: 'Lantern renderer overhaul',
    body:
      "Lantern is Kestrel's renderer. This Effort covers its overhaul for Saltglass Reach: the move to a visibility buffer, sun and local shadows, global illumination, " +
      'saltglass refraction and caustics, the Tern upscaler, HDR and tonemapping, GPU-driven culling, and the Meridian frame budgets including the 120 Hz performance mode. ' +
      'Ines Okafor leads it.',
    created_at: '2025-09-01T09:00:00Z',
  },
  events,
};
