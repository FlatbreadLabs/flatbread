---
id: dec-force-strict-ieee-float-mode-for-the-tide-simula--ecwmqt7ncjngysqw
effort: eff-kestrel-world-streaming-and-simulation-core--3evfpn88ghjnnfk4
title: Force strict IEEE float mode for the tide simulation
state: rejected
created_at: '2025-11-02T11:00:00Z'
created_by: Marta Lindqvist
derives_from:
  - iss-how-do-we-make-the-tide-simulation-deterministic--48yc2jreapt0n7jf
rejected_by: dec-run-the-tide-simulation-in-32-32-fixed-point--c5rjfcnmhne4h05e
---
Compile the tide simulation with strict floating point: no fused multiply-add contraction and no reassociation. This keeps the float code and needs only compiler flags.
