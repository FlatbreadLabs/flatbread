---
id: dec-run-the-tide-simulation-in-32-32-fixed-point--c5rjfcnmhne4h05e
effort: eff-kestrel-world-streaming-and-simulation-core--3evfpn88ghjnnfk4
title: Run the tide simulation in 32.32 fixed point
state: accepted
created_at: '2025-11-02T10:00:00Z'
created_by: Rhea Valdés
derives_from:
  - con-tide-state-must-be-bit-identical-on-every-peer--zrpnp8qjyxzkas7t
  - fnd-float-tides-drift-apart-between-machines-within--znd0wy18bfw2prss
  - iss-how-do-we-make-the-tide-simulation-deterministic--48yc2jreapt0n7jf
---
Run the whole tide simulation in 32.32 fixed-point arithmetic: 32 integer bits and 32 fraction bits in a signed 64-bit value. Integer adds and multiplies give the same bits on every CPU and compiler, so the drift that float tides show within 6 minutes cannot happen.

Scope: tide phase, wave height field, and the walkability mask derived from it. Rendering reads the result and converts to float, so Lantern is unaffected. Physics reads the walkability mask only.

Trigonometry uses a 4,096-entry sine table in fixed point with linear interpolation, generated at build time and checked into the repository, so no platform math library is involved.

The tide simulation steps at 10 Hz and the renderer interpolates between steps. Co-op peers exchange only inputs; they never send tide heights.
