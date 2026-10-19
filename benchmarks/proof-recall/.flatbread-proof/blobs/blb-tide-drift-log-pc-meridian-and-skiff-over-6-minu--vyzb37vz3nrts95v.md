---
id: blb-tide-drift-log-pc-meridian-and-skiff-over-6-minu--vyzb37vz3nrts95v
effort: eff-kestrel-world-streaming-and-simulation-core--3evfpn88ghjnnfk4
title: 'Tide drift log: PC, Meridian, and Skiff over 6 minutes'
kind: json
created_at: '2025-10-28T15:00:00Z'
created_by: Marta Lindqvist
---
{
  "capture": "tide-drift-1028",
  "threshold_cm": 1,
  "pairs": [
    {
      "pair": "PC vs Meridian",
      "first_over_threshold_min": 8.7,
      "max_delta_cm_at_6_min": 0.4
    },
    {
      "pair": "PC vs Skiff",
      "first_over_threshold_min": 5.6,
      "max_delta_cm_at_6_min": 3.8
    },
    {
      "pair": "Meridian vs Skiff",
      "first_over_threshold_min": 5.9,
      "max_delta_cm_at_6_min": 2.9
    }
  ],
  "first_walkable_flip": {
    "pair": "PC vs Skiff",
    "tile": [
      212,
      87
    ],
    "minute": 5.8
  },
  "suspected_causes": [
    "fused multiply-add contraction",
    "sin() differs by 1 ulp on Skiff"
  ]
}
