---
id: fnd-vsm-page-pool-overflows-during-spring-tides--m2p8e89hhdmh0z8a
effort: eff-lantern-renderer-overhaul--qwgke408pte4k0ar
title: VSM page pool overflows during spring tides
kind: measurement
created_at: '2026-06-15T10:00:00Z'
created_by: Tomasz Brandt
derives_from:
  - rsk-vsm-page-pool-overflows-when-tides-expose-the-fl--x1r161nrdngra4ty
cites:
  - cit-trace-vsm-page-pool-across-a-spring-tide--mhwdj0xh0k2wrnpq
---
A full spring-tide cycle on the flats asks for far more shadow pages at low water than the pool holds. Shadows on the far flats drop to the fallback resolution and visibly pop as pages come back. The trace is attached. Neap tides stay inside the pool; only the two spring tides of each in-game month overflow.

Tomasz Brandt checked three cheaper ideas before writing this up. Dropping the page size to 64 texels makes the overflow worse, because the page table grows. Skipping pages for wet sand that is darker than a threshold saves about 600 pages, not enough. Freezing pages on the far flats for a whole tide step hides the popping but leaves shadows pointing the wrong way at sunset.

Raising the pool from 4,096 to 6,144 pages would end the overflow and cost another 128 MB, which the render-target memory budget does not have.
