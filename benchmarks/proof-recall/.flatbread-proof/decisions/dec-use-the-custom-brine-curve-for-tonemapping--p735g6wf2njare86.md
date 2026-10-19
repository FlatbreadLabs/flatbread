---
id: dec-use-the-custom-brine-curve-for-tonemapping--p735g6wf2njare86
effort: eff-lantern-renderer-overhaul--qwgke408pte4k0ar
title: Use the custom Brine curve for tonemapping
state: superseded
created_at: '2026-01-30T10:00:00Z'
created_by: Yusuf Demir
derives_from:
  - fnd-stock-filmic-curve-clips-38-percent-of-caustic-h--7n6g1tssnkwqqwm6
supersedes:
  - dec-use-the-stock-filmic-tonemapping-curve--wefzd9091kztq0wb
superseded_by:
  - dec-brine-curve-with-a-separate-hdr-shoulder-at-1-00--be68yywg78dysm2e
---
Replace the stock filmic curve with the Brine curve: a custom curve with a long, slow shoulder that keeps caustic detail up to 40 times scene mid-grey. Yusuf Demir tuned it on the dunes at noon and at dusk. The SDR and HDR outputs share the curve below the shoulder.
