---
id: iss-banding-in-the-dusk-sky-with-the-brine-curve-on--qyfqbggg14ckxvc9
effort: eff-lantern-renderer-overhaul--qwgke408pte4k0ar
title: Banding in the dusk sky with the Brine curve on 10-bit output
kind: defect
status: resolved
created_at: '2026-03-18T10:00:00Z'
created_by: Yusuf Demir
derives_from:
  - dec-use-the-custom-brine-curve-for-tonemapping--p735g6wf2njare86
resolved_by:
  - dec-brine-curve-with-a-separate-hdr-shoulder-at-1-00--be68yywg78dysm2e
---
In HDR on 10-bit output, the dusk sky shows visible bands where the Brine curve's shoulder is steepest. SDR is fine. Dithering hides some of it.
