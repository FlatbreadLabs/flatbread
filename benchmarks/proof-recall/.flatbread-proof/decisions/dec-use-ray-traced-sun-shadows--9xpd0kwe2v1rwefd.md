---
id: dec-use-ray-traced-sun-shadows--9xpd0kwe2v1rwefd
effort: eff-lantern-renderer-overhaul--qwgke408pte4k0ar
title: Use ray-traced sun shadows
state: proposed
created_at: '2025-09-30T12:00:00Z'
created_by: Yusuf Demir
derives_from:
  - iss-which-shadow-technique-should-lantern-use-for-su--y4k75xvbgb2fhj85
reopen_history:
  - at: '2026-05-12T10:00:00.000Z'
    reason: >-
      Yusuf Demir wants ray-traced sun shadows considered again as a PC ultra
      option now that PC has GPU time to spare.
    rejected_by: dec-use-cascaded-shadow-maps-with-four-cascades--s5c1y9jaf275afzr
---
Trace one shadow ray per pixel against the hardware acceleration structure, with denoising. Soft penumbrae through saltglass come for free. Skiff has no ray-tracing hardware, so Skiff would need a second technique anyway.
