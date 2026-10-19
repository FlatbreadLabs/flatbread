---
id: rsk-the-fixed-point-tide-phase-may-overflow-in-long--wvaysxbvtnehxfka
effort: eff-kestrel-world-streaming-and-simulation-core--3evfpn88ghjnnfk4
title: The fixed-point tide phase may overflow in long sessions
state: mitigated
created_at: '2025-11-10T10:00:00Z'
created_by: Rhea Valdés
derives_from:
  - dec-run-the-tide-simulation-in-32-32-fixed-point--c5rjfcnmhne4h05e
mitigated_by: dec-wrap-the-tide-phase-accumulator-at-each-40-minut--hx88m4hbg27n0xwy
likelihood: low
severity: high
---
The tide phase accumulates every step. With 32 integer bits, a phase counted in milliseconds overflows after about 24 days of play, and a phase counted in microseconds after 36 minutes. A bad unit choice anywhere in the accumulation would wrap mid-session.
