---
id: rsk-vsm-page-pool-overflows-when-tides-expose-the-fl--x1r161nrdngra4ty
effort: eff-lantern-renderer-overhaul--qwgke408pte4k0ar
title: VSM page pool overflows when tides expose the flats
state: realized
created_at: '2026-02-18T10:00:00Z'
created_by: Tomasz Brandt
derives_from:
  - dec-use-virtual-shadow-maps-for-the-sun--x8nqkn9q7eaf1ap4
evidence:
  - fnd-vsm-page-pool-overflows-during-spring-tides--m2p8e89hhdmh0z8a
likelihood: medium
severity: high
---
A falling tide exposes kilometres of wet flats at once, all needing fresh shadow pages. If the requests exceed the 4,096-page pool, shadows drop to low resolution or pop. Nobody has measured a spring tide yet.
