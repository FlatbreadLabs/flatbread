---
id: dec-exclude-caustic-luminance-from-tern-s-history-cl--xhxjn26ss343v2k4
effort: eff-lantern-renderer-overhaul--qwgke408pte4k0ar
title: Exclude caustic luminance from Tern's history clamp
state: proposed
created_at: '2026-02-12T10:00:00Z'
created_by: Tomasz Brandt
derives_from:
  - iss-caustics-flicker-under-tern-at-low-internal-reso--he94mq6rr7tr5yv5
---
Write caustic light to a separate buffer that Tern accumulates without neighborhood clamping, then add it back after upscaling. Tern then averages the jitter instead of fighting it.
