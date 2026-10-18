---
id: dec-wrap-the-tide-phase-accumulator-at-each-40-minut--hx88m4hbg27n0xwy
effort: eff-kestrel-world-streaming-and-simulation-core--3evfpn88ghjnnfk4
title: Wrap the tide phase accumulator at each 40-minute cycle
state: accepted
created_at: '2025-11-12T10:00:00Z'
created_by: Rhea Valdés
derives_from:
  - dec-run-the-tide-simulation-in-32-32-fixed-point--c5rjfcnmhne4h05e
  - rsk-the-fixed-point-tide-phase-may-overflow-in-long--wvaysxbvtnehxfka
---
Store the tide phase as a fraction of the 40-minute cycle and wrap it to zero at each cycle boundary. The accumulator then never holds more than one cycle and cannot overflow.
