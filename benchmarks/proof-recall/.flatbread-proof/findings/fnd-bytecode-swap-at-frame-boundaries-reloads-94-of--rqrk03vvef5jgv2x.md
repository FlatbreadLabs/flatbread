---
id: fnd-bytecode-swap-at-frame-boundaries-reloads-94-of--rqrk03vvef5jgv2x
effort: eff-kestrel-world-streaming-and-simulation-core--3evfpn88ghjnnfk4
title: Bytecode swap at frame boundaries reloads 94% of edits
kind: measurement
created_at: '2026-02-20T10:00:00Z'
created_by: Marta Lindqvist
derives_from:
  - dec-compile-gull-to-bytecode-for-a-register-vm--jrqje646fpevp5f3
  - iss-gull-hot-reload-rejects-struct-layout-changes--3v2w2f9hg2gwy6aj
invalidated_by:
  - fnd-hot-reload-drops-suspended-gull-coroutines--va0fn0svryzwbzws
---
Marta Lindqvist replayed 500 script edits from the design team's history against a reload prototype that swaps function bytecode between frames. 94% applied cleanly; the rest changed struct layouts.
