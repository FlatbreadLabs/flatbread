---
id: fnd-shader-compile-cache-where-things-stand-in-febru--xnwv3jqqg71tb370
effort: eff-shader-compile-cache-and-build-farm--6xeac11zxvwwarkn
title: 'Shader compile cache: where things stand in February'
kind: compaction
created_at: '2026-02-10T16:00:00Z'
created_by: Liam O'Connell
derives_from:
  - dec-build-a-content-addressed-shader-compile-cache-s--e65rq9439k7xz5zh
  - dec-fan-shader-cache-misses-out-to-every-farm-agent--pwrf9w720rf4hd27
  - dec-key-the-shader-cache-on-preprocessed-source-defi--3a05ff0r954vxh30
  - dec-raise-the-shader-cache-fetch-timeout-from-5-seco--4sgdf42ajyct6gt6
  - fnd-flaky-nightly-builds-trace-to-cache-server-fetch--v4wsxzj1x72zz8rs
  - fnd-shader-cache-hit-rate-climbs-steadily-after-the--2d268h587na645rx
  - iss-full-shader-rebuilds-take-47-minutes-on-the-buil--4bnh1e17snf5y3h6
  - iss-nightly-builds-fail-about-1-in-9-runs-with-shade--ka2xgkfgaepemgbh
  - rsk-shader-cache-storage-could-outgrow-the-4-tb-farm--76y9649mwrx7aavd
covers:
  - con-a-cache-hit-must-give-the-same-bytes-as-a-fresh--3gmcswztxzpmpz83@live
  - con-the-build-farm-stays-at-12-agents-until-alpha--w7e1xfex9z2ycpx1@live
  - >-
    dec-build-a-content-addressed-shader-compile-cache-s--e65rq9439k7xz5zh@accepted
  - >-
    dec-fan-shader-cache-misses-out-to-every-farm-agent--pwrf9w720rf4hd27@accepted
  - >-
    dec-key-the-shader-cache-on-preprocessed-source-defi--3a05ff0r954vxh30@accepted
  - >-
    dec-raise-the-shader-cache-fetch-timeout-from-5-seco--4sgdf42ajyct6gt6@accepted
  - >-
    dec-recompile-a-1-in-50-sample-of-cache-hits-and-com--9n176hnc9w0tax3s@accepted
  - fnd-flaky-nightly-builds-trace-to-cache-server-fetch--v4wsxzj1x72zz8rs@live
  - fnd-most-shader-compile-time-on-the-farm-repeats-ide--n7mr2yxxxtzpak35@live
  - fnd-raw-source-cache-keys-served-stale-shaders-after--f32vyjth0qtmr6wb@live
  - fnd-remote-execution-spreads-cache-misses-across-all--120mx6z98n6qfmwh@live
  - fnd-shader-cache-hit-rate-climbs-steadily-after-the--2d268h587na645rx@live
  - fnd-two-compiler-builds-with-the-same-version-string--gmgr4ha0ndxqmcn9@live
  - iss-full-shader-rebuilds-take-47-minutes-on-the-buil--4bnh1e17snf5y3h6@open
  - iss-nightly-builds-fail-about-1-in-9-runs-with-shade--ka2xgkfgaepemgbh@open
  - rsk-shader-cache-storage-could-outgrow-the-4-tb-farm--76y9649mwrx7aavd@open
---
The farm shader compile cache is live on nightly builds. Remote execution spreads cache misses across all 12 agents. The current key hashes preprocessed source, defines, target and the compiler binary; hit rate reached the low 90s. Flaky nightly builds are still open. The working diagnosis is cache server fetch timeouts during the 02:00 burst, and the fix in place is the 30-second fetch timeout. Storage growth is an open Risk. Next: turn the cache on for every build, then close the Effort before alpha.
