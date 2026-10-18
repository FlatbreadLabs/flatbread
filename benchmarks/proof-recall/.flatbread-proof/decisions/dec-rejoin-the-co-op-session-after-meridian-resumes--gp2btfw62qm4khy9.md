---
id: dec-rejoin-the-co-op-session-after-meridian-resumes--gp2btfw62qm4khy9
effort: eff-meridian-and-skiff-ports--ns2t7htkafx7v3xx
title: Rejoin the co-op session after Meridian resumes
state: accepted
created_at: '2026-05-27T10:00:00Z'
created_by: Sofia Marchetti
derives_from:
  - fnd-meridian-drops-co-op-sessions-because-the-relay--73hf67080kkyf76j
---
On the Meridian resume event the client drops its socket, reconnects to the relay, and rejoins the session if the host is still there. If not, the player lands in a solo copy of the world with a message.
