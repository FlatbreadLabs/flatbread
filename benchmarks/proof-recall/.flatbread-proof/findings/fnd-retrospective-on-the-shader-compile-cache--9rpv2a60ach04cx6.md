---
id: fnd-retrospective-on-the-shader-compile-cache--9rpv2a60ach04cx6
effort: eff-shader-compile-cache-and-build-farm--6xeac11zxvwwarkn
title: Retrospective on the shader compile cache
kind: retrospective
created_at: '2026-04-28T15:00:00Z'
created_by: Liam O'Connell
derives_from:
  - dec-turn-the-shader-compile-cache-on-for-every-farm--4rr3b12b4sasdmaj
  - fnd-shader-cache-hit-rate-climbs-steadily-after-the--2d268h587na645rx
  - iss-developer-workstations-cannot-read-the-farm-shad--q2xw0f7fze6z55nj
  - rsk-shader-cache-storage-could-outgrow-the-4-tb-farm--76y9649mwrx7aavd
---
The cache has run on every farm build for five weeks. What went well and what did not:

- The content-addressed design held up. Two key changes were needed before the cache could be trusted: the first after stale headers, the second after the compiler hotfix build.
- Remote execution made cold builds tolerable inside the 12-agent limit.
- We lost about three weeks blaming the network for the flaky nightly builds. The real cause was memory on agents 7 and 11.
- The byte-compare sample caught real problems twice and never fired falsely.

Numbers at the end of the Effort:

- Steady-state hit rate: 94%.
- Storage used: 1.9 TB of the 4 TB volume, growing about 210 GB a month, which leaves roughly ten months of headroom.

Dara Whitlock and Liam O'Connell agreed not to build cache eviction before release; storage growth is accepted as it stands.
Workstation access to the cache is deferred until after release; it needs a VPN change nobody has time for.

Final clean rebuild time with a warm cache: 6 min 40 s, down from 47 minutes.
