---
id: dec-use-a-probe-grid-for-the-far-field-and-sdf-traci--sk8asp26gxtq5tdd
effort: eff-lantern-renderer-overhaul--qwgke408pte4k0ar
title: Use a probe grid for the far field and SDF tracing near the camera
state: rejected
created_at: '2025-10-20T15:00:00Z'
created_by: Ines Okafor
derives_from:
  - iss-how-should-lantern-do-global-illumination--3hs82xftkrdhk3f7
rejected_by: dec-use-signed-distance-field-gi--yn366zmp3k7snd9w
---
Trace the distance field within 64 m of the camera and fall back to the relit probe grid beyond it. More code than either option alone, but each half does what it is good at.
