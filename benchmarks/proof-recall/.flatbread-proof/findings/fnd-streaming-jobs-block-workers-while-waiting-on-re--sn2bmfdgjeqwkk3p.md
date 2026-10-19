---
id: fnd-streaming-jobs-block-workers-while-waiting-on-re--sn2bmfdgjeqwkk3p
effort: eff-kestrel-world-streaming-and-simulation-core--3evfpn88ghjnnfk4
title: Streaming jobs block workers while waiting on reads
kind: measurement
created_at: '2025-10-14T10:00:00Z'
created_by: Kenji Arakawa
derives_from:
  - dec-run-engine-jobs-on-a-work-stealing-thread-pool--1pd72x1pxpgwy21x
---
The no-blocking rule is not holding. Decompression jobs wait for their reads instead of chaining, because the read API has no completion callback yet. On Meridian, workers sit idle for 3.1 ms per frame, and frame-critical jobs queue behind blocked streaming jobs.
