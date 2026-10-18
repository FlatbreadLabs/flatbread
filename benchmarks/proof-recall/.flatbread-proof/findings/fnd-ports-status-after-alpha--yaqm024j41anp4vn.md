---
id: fnd-ports-status-after-alpha--yaqm024j41anp4vn
effort: eff-meridian-and-skiff-ports--ns2t7htkafx7v3xx
title: Ports status after alpha
kind: compaction
created_at: '2026-03-10T17:00:00Z'
created_by: Priya Natarajan
derives_from:
  - con-frame-budget--br0qszfg8fys908n
  - con-skiff-memory-budget--nf7qbhsnmcn6v479
  - dec-load-skiff-fast-travel-without-a-loading-screen--v4qft5znysjv5f24
  - dec-offer-a-40-hz-mode-on-skiff-alongside-30-hz--xhcgs101g1stnf05
  - dec-raise-the-skiff-dynamic-resolution-floor-to-576p--fep9q7m08pp9f0bb
  - dec-run-tern-on-skiff-at-the-performance-preset--74eqayfa83ybqpe3
  - dec-ship-prebuilt-pipeline-blobs-in-the-skiff-packag--3vjysjgy9qkvzebn
  - dec-use-kelp-s-high-ratio-mode-for-skiff-textures--ztsejzpkp6nn13s5
  - iss-no-skiff-dev-kits-on-firmware-1-2--3qkawq17a60504j7
  - rsk-skiff-runs-out-of-memory-in-dense-districts--p5pv42sgezzjhpfz
superseded_by:
  - fnd-ports-status-after-beta--g265shcdqe263c44
covers:
  - con-frame-budget--br0qszfg8fys908n@live
  - con-meridian-memory-budget--99q6099e423wdtqn@live
  - con-skiff-memory-budget--nf7qbhsnmcn6v479@live
  - >-
    dec-load-skiff-fast-travel-without-a-loading-screen--v4qft5znysjv5f24@accepted
  - dec-offer-a-40-hz-mode-on-skiff-alongside-30-hz--xhcgs101g1stnf05@accepted
  - >-
    dec-raise-the-skiff-dynamic-resolution-floor-to-576p--fep9q7m08pp9f0bb@accepted
  - dec-run-tern-on-skiff-at-the-performance-preset--74eqayfa83ybqpe3@accepted
  - >-
    dec-ship-prebuilt-pipeline-blobs-in-the-skiff-packag--3vjysjgy9qkvzebn@accepted
  - dec-stream-skiff-world-tiles-in-2-mb-reads--3jz9w9gvhhc7eppw@accepted
  - dec-use-kelp-s-high-ratio-mode-for-skiff-textures--ztsejzpkp6nn13s5@accepted
  - fnd-harbor-district-needs-1-460-pipelines-on-skiff--dwd5ry1wqaeacmpn@live
  - fnd-harbor-district-peaks-at-8-6-gb-on-skiff--vccxye8jy3mkba2v@live
  - fnd-kelp-high-ratio-textures-bring-the-skiff-harbor--rnzeng8fj363pr75@live
  - fnd-prebuilt-pipeline-blobs-load-on-skiff-dev-firmwa--yzb10ygwr1q151e7@live
  - fnd-saltglass-caustics-shimmer-at-the-540p-floor--0aa8sts89vhq1s6q@live
  - fnd-skiff-40-hz-playtest-9-of-12-testers-preferred-4--8jbe1vyf06rzdcek@live
  - fnd-skiff-dev-kit-gives-the-game-9-gb--e6h71skfna4ttpd0@live
  - fnd-skiff-microsd-sustains-92-mb-s--xr1fsyjd45y2tqcx@live
  - fnd-skiff-sdk-1-2-takes-1-gb-back-from-games--a0ybdgjzw64hwfqa@live
  - fnd-tern-costs-3-9-ms-at-quality-and-2-1-ms-at-perfo--dkbskbqfgfwtryq0@live
  - iss-first-visit-hitches-of-45-to-190-ms-on-skiff--jcraqy468yw51kpf@open
  - iss-no-skiff-dev-kits-on-firmware-1-2--3qkawq17a60504j7@open
  - iss-skiff-fast-travel-has-no-load-time-plan--8xqtfd6x0mfvbkts@open
  - rsk-pipeline-compiles-hitch-skiff-on-first-visits--6sq225m8dx36aefs@open
  - rsk-skiff-runs-out-of-memory-in-dense-districts--p5pv42sgezzjhpfz@realized
  - rsk-skiff-throttles-the-gpu-in-long-handheld-session--1nwtqw8gyc9x4h1b@open
  - rsk-tide-streaming-outruns-skiff-storage--6q8s3b383z2tyeyb@open
---
Skiff memory budget is 8 GB from firmware 1.2. The harbor district overran it at 8.6 GB; Kelp high-ratio textures brought it to 7.7 GB. The out-of-memory risk is marked realized.

Frame budget: Skiff 30 Hz at 33.3 ms, plus an optional 40 Hz mode at 25 ms. Dynamic resolution floor is 576p. Tern runs at the Performance preset on Skiff.

Pipeline compiles are handled by shipping prebuilt blobs in the package. Fast travel on Skiff loads with no loading screen. Waiting on firmware 1.2 dev kits.
