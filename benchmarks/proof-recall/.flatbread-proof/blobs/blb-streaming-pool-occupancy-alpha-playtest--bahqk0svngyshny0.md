---
id: blb-streaming-pool-occupancy-alpha-playtest--bahqk0svngyshny0
effort: eff-kestrel-world-streaming-and-simulation-core--3evfpn88ghjnnfk4
title: 'Streaming pool occupancy, alpha playtest'
kind: json
created_at: '2026-03-03T15:00:00Z'
created_by: Kenji Arakawa
---
{
  "capture": "pool-occupancy-0303",
  "sessions": 12,
  "hours": 19.5,
  "pool_gb": 2,
  "mean_occupancy_gb": 1.71,
  "peak_occupancy_gb": 1.98,
  "reloads": {
    "lru_replay": 4120,
    "forecast": 3214,
    "reduction": 0.22
  },
  "player_reversals_per_min": 3.4,
  "evicted_then_reloaded_within_60s": 0.19
}
