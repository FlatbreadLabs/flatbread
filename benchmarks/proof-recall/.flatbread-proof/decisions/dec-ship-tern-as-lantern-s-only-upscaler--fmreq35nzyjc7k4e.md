---
id: dec-ship-tern-as-lantern-s-only-upscaler--fmreq35nzyjc7k4e
effort: eff-lantern-renderer-overhaul--qwgke408pte4k0ar
title: Ship Tern as Lantern's only upscaler
state: accepted
created_at: '2025-10-28T13:00:00Z'
created_by: Tomasz Brandt
derives_from:
  - con-one-upscaler-path-on-every-platform--f91bgj6n66kwc5d3
  - fnd-halcyon-vendor-upscaler-quality-and-platform-cov--xz7hp3e1m1mh44v4
  - fnd-tern-cost-at-4k-output-on-meridian--wycx6ek6sfme73k9
  - iss-which-upscaler-should-lantern-ship--g8c2y9tsr856tn2v
---
Tern is the only temporal upscaler Lantern ships, on PC, Meridian and Skiff. Halcyon has no Skiff build, and shipping it on two platforms would break the one-upscaler Constraint. Tern costs 0.7 ms more than Halcyon on Meridian today; Tomasz Brandt expects to recover most of that.

Owning the code matters more for saltglass than raw quality. Refraction moves light independently of geometry motion vectors, and the caustics change every frame. Both need upscaler changes the team can make the same week, not vendor tickets. There is no license to negotiate.

Other Efforts may pick a Tern preset per platform, but no Effort may add a second upscaler without reopening this Decision. Tern's history buffer is stored as 16-bit float per channel, and every preset shares it.
