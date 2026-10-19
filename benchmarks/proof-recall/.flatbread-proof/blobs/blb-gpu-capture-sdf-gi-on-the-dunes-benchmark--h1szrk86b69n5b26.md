---
id: blb-gpu-capture-sdf-gi-on-the-dunes-benchmark--h1szrk86b69n5b26
effort: eff-lantern-renderer-overhaul--qwgke408pte4k0ar
title: 'GPU capture: SDF GI on the dunes benchmark'
kind: json
created_at: '2025-10-13T15:00:00Z'
created_by: Tomasz Brandt
---
{
  "build": "lantern-2025.10.10-r4630",
  "device": "PC workstation (Meridian clock profile)",
  "scene": "dunes_bench_01",
  "resolution": "2560x1440",
  "clipmap_cascades": 4,
  "clipmap_size": "64^3",
  "passes_ms": {
    "sdf_update": 0.4,
    "trace": 1.3,
    "filter": 0.3,
    "apply": 0.2
  },
  "total_ms": 2.2,
  "l2_hit_rate": 0.81
}
