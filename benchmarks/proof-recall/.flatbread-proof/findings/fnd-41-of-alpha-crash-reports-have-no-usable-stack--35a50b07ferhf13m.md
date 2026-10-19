---
id: fnd-41-of-alpha-crash-reports-have-no-usable-stack--35a50b07ferhf13m
effort: eff-kestrel-world-streaming-and-simulation-core--3evfpn88ghjnnfk4
title: 41% of alpha crash reports have no usable stack
kind: measurement
created_at: '2026-03-16T10:00:00Z'
created_by: Liam O'Connell
derives_from:
  - rsk-fiber-stacks-may-make-crash-dumps-unreadable--b7c1mkn9ygvmsy57
---
Liam O'Connell sampled 600 crash reports from the alpha build. In 246 of them (41%) the crashing thread was a fiber worker and the dump shows only scheduler frames. The vendor fiber plug-in recovers stacks on Meridian but still crashes the dump tool on Skiff.
