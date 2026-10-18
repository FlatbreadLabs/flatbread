---
id: fnd-hot-reload-drops-suspended-gull-coroutines--va0fn0svryzwbzws
effort: eff-kestrel-world-streaming-and-simulation-core--3evfpn88ghjnnfk4
title: Hot reload drops suspended Gull coroutines
kind: measurement
created_at: '2026-05-18T10:00:00Z'
created_by: Marta Lindqvist
derives_from:
  - dec-hot-reload-gull-functions-by-swapping-bytecode-a--8dxnkg6h8vmcsr42
  - fnd-bytecode-swap-at-frame-boundaries-reloads-94-of--rqrk03vvef5jgv2x
invalidates:
  - fnd-bytecode-swap-at-frame-boundaries-reloads-94-of--rqrk03vvef5jgv2x
  - fnd-world-core-state-at-alpha--tkbsm4867h65jqq8
---
The 94% figure replayed edits on idle scripts. In real sessions most creature scripts are suspended coroutines waiting on a timer or a tide event. A suspended coroutine holds a return address into the old bytecode; after a swap it resumes into the new bytecode at a wrong offset, so the runtime kills it. Logged over two weeks of design sessions, only 71% of reloads kept every script running.
