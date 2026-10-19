---
id: blb-gpu-capture-virtual-shadow-maps-with-page-cachin--sf5pzwgx8fv8gbpb
effort: eff-lantern-renderer-overhaul--qwgke408pte4k0ar
title: 'GPU capture: virtual shadow maps with page caching, dunes benchmark'
kind: json
created_at: '2025-11-22T15:00:00Z'
created_by: Tomasz Brandt
---
{
  "build": "lantern-2025.11.21-r5310",
  "platform": "Meridian devkit",
  "scene": "dunes_bench_01",
  "page_pool_clear": "on_invalidation",
  "pages_rendered_per_frame": 212,
  "passes_ms": {
    "page_mark": 0.3,
    "page_raster": 0.7,
    "page_sample": 0.4
  },
  "total_ms": 1.4,
  "csm_reference_ms": 1.6
}
