---
id: dec-hot-reload-gull-functions-by-swapping-bytecode-a--8dxnkg6h8vmcsr42
effort: eff-kestrel-world-streaming-and-simulation-core--3evfpn88ghjnnfk4
title: Hot-reload Gull functions by swapping bytecode at frame boundaries
state: accepted
created_at: '2026-02-24T10:00:00Z'
created_by: Marta Lindqvist
derives_from:
  - fnd-bytecode-swap-at-frame-boundaries-reloads-94-of--rqrk03vvef5jgv2x
  - iss-gull-hot-reload-rejects-struct-layout-changes--3v2w2f9hg2gwy6aj
---
Between frames, replace the bytecode of every edited function. Running code picks up the new version on its next call. Struct layout changes still need a restart of the level.
