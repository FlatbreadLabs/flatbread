---
id: fnd-skiff-pipeline-cache-removes-second-visit-hitche--kzjtp9dpbpbmrb0x
effort: eff-meridian-and-skiff-ports--ns2t7htkafx7v3xx
title: Skiff pipeline cache removes second-visit hitches
kind: measurement
created_at: '2026-04-14T15:00:00Z'
created_by: Priya Natarajan
derives_from:
  - dec-build-an-on-device-pipeline-cache-for-skiff--726r9mtk76qndeh7
---
With the on-device pipeline cache, second visits to the harbor compiled nothing: 99.6 percent of pipeline lookups hit the cache, and the misses were all photo-mode filters. First visits after load-screen warming still hitched 6 times on the harbor route, down from 212. After a full playthrough the cache held 212 MB.
