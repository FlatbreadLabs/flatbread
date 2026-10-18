---
id: blb-gpu-capture-virtual-shadow-map-prototype-dunes-b--cknjqzqy2mqz93mf
effort: eff-lantern-renderer-overhaul--qwgke408pte4k0ar
title: 'GPU capture: virtual shadow map prototype, dunes benchmark'
kind: json
created_at: '2025-09-25T15:00:00Z'
created_by: Tomasz Brandt
---
{
  "build": "lantern-2025.09.24-r4561",
  "platform": "Meridian devkit",
  "scene": "dunes_bench_01",
  "virtual_resolution": 16384,
  "page_size": 128,
  "pool_pages": 4096,
  "page_pool_clear": "every_frame",
  "pages_rendered_per_frame": 3870,
  "passes_ms": {
    "page_mark": 0.3,
    "page_raster": 2.4,
    "page_sample": 0.4
  },
  "total_ms": 3.1,
  "csm_reference_ms": 1.6
}
