---
id: blb-page-pool-trace-virtual-shadow-maps-across-a-spr--6qdd5aahwkcmhyg8
effort: eff-lantern-renderer-overhaul--qwgke408pte4k0ar
title: 'Page-pool trace: virtual shadow maps across a spring tide'
kind: json
created_at: '2026-06-12T15:00:00Z'
created_by: Tomasz Brandt
---
{
  "build": "lantern-2026.06.11-r7020",
  "platform": "Meridian devkit",
  "scene": "flats_spring_tide",
  "pool_pages": 4096,
  "samples": [
    {
      "tide_phase": "spring high",
      "pages_requested": 1880
    },
    {
      "tide_phase": "mid ebb",
      "pages_requested": 3410
    },
    {
      "tide_phase": "spring low",
      "pages_requested": 5912
    },
    {
      "tide_phase": "mid flood",
      "pages_requested": 3120
    }
  ],
  "peak_pages_requested": 5912,
  "frames_over_pool": 1430,
  "worst_tide_phase": "spring low, 31 minutes into the 40-minute cycle"
}
