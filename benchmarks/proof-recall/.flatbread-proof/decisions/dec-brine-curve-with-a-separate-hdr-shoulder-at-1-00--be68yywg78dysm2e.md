---
id: dec-brine-curve-with-a-separate-hdr-shoulder-at-1-00--be68yywg78dysm2e
effort: eff-lantern-renderer-overhaul--qwgke408pte4k0ar
title: 'Brine curve with a separate HDR shoulder at 1,000 nits'
state: superseded
created_at: '2026-05-06T10:00:00Z'
created_by: Yusuf Demir
derives_from:
  - iss-banding-in-the-dusk-sky-with-the-brine-curve-on--qyfqbggg14ckxvc9
supersedes:
  - dec-use-the-custom-brine-curve-for-tonemapping--p735g6wf2njare86
superseded_by:
  - dec-brine-curve-with-an-hdr-shoulder-at-800-nits--fpznx0cnj4avsxk1
---
Split the Brine curve: SDR keeps the original shoulder, HDR gets its own gentler shoulder starting at 1,000 nits. The gentler slope removes the dusk banding on 10-bit output without dithering.
