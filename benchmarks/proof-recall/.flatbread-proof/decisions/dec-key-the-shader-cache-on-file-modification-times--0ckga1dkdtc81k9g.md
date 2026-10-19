---
id: dec-key-the-shader-cache-on-file-modification-times--0ckga1dkdtc81k9g
effort: eff-shader-compile-cache-and-build-farm--6xeac11zxvwwarkn
title: Key the shader cache on file modification times
state: rejected
created_at: '2025-09-22T11:30:00Z'
created_by: Tomasz Brandt
derives_from:
  - iss-what-should-the-shader-compile-cache-key-hash--y1ja5t3r75r63s28
rejected_by: dec-key-the-shader-cache-on-raw-source-text-and-comp--hp6awmx3gq5rn9nc
---
Use the newest modification time of the shader and its includes. Nearly free to compute, but Git checkouts reset modification times, so every fresh agent would see a cold cache.
