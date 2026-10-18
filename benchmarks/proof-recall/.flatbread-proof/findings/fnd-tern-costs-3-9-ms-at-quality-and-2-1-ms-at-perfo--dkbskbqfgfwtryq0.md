---
id: fnd-tern-costs-3-9-ms-at-quality-and-2-1-ms-at-perfo--dkbskbqfgfwtryq0
effort: eff-meridian-and-skiff-ports--ns2t7htkafx7v3xx
title: Tern costs 3.9 ms at Quality and 2.1 ms at Performance on Skiff
kind: measurement
created_at: '2025-11-20T13:00:00Z'
created_by: Tomasz Brandt
derives_from:
  - iss-which-upscaler-should-skiff-use--jyp1hqdy0ahwfeej
---
Tomasz Brandt profiled Tern on the Skiff dev kit, 540p in, 720p out, harbor route. Quality preset: 3.9 ms of GPU time. Performance preset: 2.1 ms. Performance shows a little more ghosting on foam but keeps saltglass edges stable. A bilinear upscale with sharpening costs 0.4 ms and crawls on every glass edge.
