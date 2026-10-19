---
id: fnd-meridian-drops-co-op-sessions-because-the-relay--73hf67080kkyf76j
effort: eff-meridian-and-skiff-ports--ns2t7htkafx7v3xx
title: Meridian drops co-op sessions because the relay socket times out
kind: measurement
created_at: '2026-05-26T14:00:00Z'
created_by: Sofia Marchetti
derives_from:
  - iss-meridian-cert-resume-from-suspend-drops-the-co-o--jbqz6wqm1w747bbx
---
Sofia Marchetti traced the suspend defect: the co-op relay closes an idle socket after 30 seconds, and Meridian suspends the network stack with the game. On resume the client still thinks the socket is open and waits forever.
