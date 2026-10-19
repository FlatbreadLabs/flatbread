---
id: fnd-128-m-cells-cost-216-mb-of-per-cell-overhead-on--05dnx4k8a0wjtzdw
effort: eff-kestrel-world-streaming-and-simulation-core--3evfpn88ghjnnfk4
title: 128 m cells cost 216 MB of per-cell overhead on Skiff
kind: measurement
created_at: '2026-03-20T10:00:00Z'
created_by: Kenji Arakawa
derives_from:
  - dec-partition-the-world-into-128-m-cells--372b6czbjf29ymaw
  - fnd-128-m-cells-should-add-only-40-mb-of-per-cell-ov--ape0tgv597x77p6z
invalidates:
  - fnd-128-m-cells-should-add-only-40-mb-of-per-cell-ov--ape0tgv597x77p6z
---
Kenji Arakawa measured per-cell overhead on the alpha build instead of estimating it from headers. The November estimate counted only the 0.25 MB cell header. Each resident cell also owns a physics broadphase grid of about 0.5 MB and navigation tile metadata of about 0.35 MB, so the real overhead is 1.1 MB per cell.

The alpha build keeps 196 cells resident on Skiff, because the streaming radius grew to cover tide pools. At 1.1 MB each that is 216 MB of overhead, more than five times the estimate and over a tenth of the streaming pool.

File handling is the second cost. Small cells mean many small files. Skiff's storage queue holds 32 requests, and a falling tide now issues so many small reads that the queue stays full and the scheduler cannot slip in urgent reads.

Over one tide turn the 128 m layout performs 4,100 file opens, against 600 for the old 256 m layout.
