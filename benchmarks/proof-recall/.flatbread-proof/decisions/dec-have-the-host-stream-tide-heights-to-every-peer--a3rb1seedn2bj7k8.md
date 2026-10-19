---
id: dec-have-the-host-stream-tide-heights-to-every-peer--a3rb1seedn2bj7k8
effort: eff-kestrel-world-streaming-and-simulation-core--3evfpn88ghjnnfk4
title: Have the host stream tide heights to every peer
state: rejected
created_at: '2025-11-02T12:00:00Z'
created_by: Sofia Marchetti
derives_from:
  - iss-how-do-we-make-the-tide-simulation-deterministic--48yc2jreapt0n7jf
rejected_by: dec-run-the-tide-simulation-in-32-32-fixed-point--c5rjfcnmhne4h05e
---
Only the host simulates tides; peers receive the height field over the network. Determinism stops mattering because there is one source of truth.
