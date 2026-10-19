---
id: con-render-target-memory-on-meridian--q4szajxse9c1csdv
effort: eff-lantern-renderer-overhaul--qwgke408pte4k0ar
title: Render-target memory on Meridian
kind: hard
created_at: '2025-09-02T10:00:00Z'
created_by: Ines Okafor
---
Lantern's render targets, transient attachments, shadow pages and GI volumes must fit in 1.8 GB of the 13.5 GB Meridian gives the game. Streaming owns the rest. An allocation over 1.8 GB fails the nightly memory check and blocks the build.
