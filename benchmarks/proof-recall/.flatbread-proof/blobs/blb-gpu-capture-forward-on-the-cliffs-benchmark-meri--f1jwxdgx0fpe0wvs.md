---
id: blb-gpu-capture-forward-on-the-cliffs-benchmark-meri--f1jwxdgx0fpe0wvs
effort: eff-lantern-renderer-overhaul--qwgke408pte4k0ar
title: 'GPU capture: forward+ on the cliffs benchmark, Meridian'
kind: json
created_at: '2025-09-09T14:00:00Z'
created_by: Tomasz Brandt
---
{
  "build": "lantern-2025.09.08-r4411",
  "platform": "Meridian devkit",
  "scene": "cliffs_bench_02",
  "resolution": "2560x1440",
  "passes_ms": {
    "depth_prepass": 1.1,
    "light_cull": 0.6,
    "forward_opaque": 7.9,
    "saltglass_forward": 2.3,
    "post": 1.4
  },
  "quad_overdraw": 3.4,
  "triangles_visible": 14200000,
  "worst_tile_lights": 212,
  "notes": "Overdraw measured with the helper-lane counter; cliff face LOD0 dominates."
}
