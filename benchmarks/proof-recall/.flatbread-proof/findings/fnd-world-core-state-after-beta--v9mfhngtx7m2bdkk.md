---
id: fnd-world-core-state-after-beta--v9mfhngtx7m2bdkk
effort: eff-kestrel-world-streaming-and-simulation-core--3evfpn88ghjnnfk4
title: World core state after beta
kind: compaction
created_at: '2026-06-10T16:00:00Z'
created_by: Rhea Valdés
derives_from:
  - con-streaming-pool-budget--kca88sgh2j6sxvd5
  - dec-compile-gull-to-bytecode-for-a-register-vm--jrqje646fpevp5f3
  - dec-evict-cells-by-distance-and-tide-forecast--fyp1jp366pjjzxcg
  - dec-give-reads-for-tide-exposed-cells-top-priority--8ftkvqhawbdf5djh
  - dec-partition-the-world-into-192-m-cells--bk9r1c5jwb6fh8tc
  - dec-return-engine-jobs-to-a-thread-pool-with-continu--1zkc1v2x97taf50h
  - dec-run-the-tide-simulation-in-32-32-fixed-point--c5rjfcnmhne4h05e
  - dec-save-player-changes-as-deltas-keyed-to-the-tide--1qxvc9985c8pzke8
  - dec-shrink-kelp-s-dictionary-to-1-mb-for-streamed-as--yh8hktfqnyqhepew
  - dec-stamp-each-save-with-a-schema-version-and-upgrad--nbg1h8g1bhn2ks8w
supersedes:
  - fnd-world-core-state-at-alpha--tkbsm4867h65jqq8
superseded_by:
  - fnd-world-core-state-before-content-lock--15jbzxzr0wj9gsd2
covers:
  - con-archetype-changes-happen-only-at-frame-sync-poin--kcsrz5g8g8yndwnx@live
  - con-cell-load-deadline--m20x64m5eh7q2bh6@live
  - con-gull-script-tick-budget--4p9jp4dj1njf7q9m@live
  - con-no-runtime-code-generation-on-consoles--6cf25zqmsvqkdd73@live
  - con-saves-from-beta-onward-must-load-in-every-later--v6z856sxtgc5sb09@live
  - con-streaming-i-o-budget--vhc7mrmpqv9qcfdc@live
  - con-streaming-pool-budget--kca88sgh2j6sxvd5@live
  - con-tide-state-must-be-bit-identical-on-every-peer--zrpnp8qjyxzkas7t@live
  - dec-compile-gull-to-bytecode-for-a-register-vm--jrqje646fpevp5f3@accepted
  - dec-compress-streamed-assets-with-kelp--ezwc5p1tgsgm7v8m@accepted
  - >-
    dec-cut-navigation-tiles-to-64-m-so-three-fit-along--snvepk8ygeb3qsjs@accepted
  - dec-delay-autosaves-until-the-tide-turn-finishes--4agcgjjj70djdv6b@accepted
  - dec-evict-cells-by-distance-and-tide-forecast--fyp1jp366pjjzxcg@accepted
  - >-
    dec-give-reads-for-tide-exposed-cells-top-priority--8ftkvqhawbdf5djh@accepted
  - >-
    dec-group-archetype-chunks-by-tide-band-to-cut-fragm--qxnkv5bxqz1r7afv@accepted
  - >-
    dec-hot-reload-gull-functions-by-swapping-bytecode-a--8dxnkg6h8vmcsr42@accepted
  - dec-partition-the-world-into-192-m-cells--bk9r1c5jwb6fh8tc@accepted
  - >-
    dec-read-streamed-assets-through-one-async-request-q--rd5c8rxr5pwz50ds@accepted
  - >-
    dec-return-engine-jobs-to-a-thread-pool-with-continu--1zkc1v2x97taf50h@accepted
  - dec-run-the-tide-simulation-in-32-32-fixed-point--c5rjfcnmhne4h05e@accepted
  - >-
    dec-save-player-changes-as-deltas-keyed-to-the-tide--1qxvc9985c8pzke8@accepted
  - >-
    dec-shrink-kelp-s-dictionary-to-1-mb-for-streamed-as--yh8hktfqnyqhepew@accepted
  - >-
    dec-stamp-each-save-with-a-schema-version-and-upgrad--nbg1h8g1bhn2ks8w@accepted
  - >-
    dec-store-components-in-archetype-tables-and-volatil--yxsjd26wcaz6fgx9@accepted
  - >-
    dec-wrap-the-tide-phase-accumulator-at-each-40-minut--hx88m4hbg27n0xwy@accepted
  - fnd-128-m-cells-cost-216-mb-of-per-cell-overhead-on--05dnx4k8a0wjtzdw@live
  - fnd-3-of-200-saves-taken-mid-turn-fail-to-load--4j1kafsdeq0wedhf@live
  - fnd-41-of-alpha-crash-reports-have-no-usable-stack--35a50b07ferhf13m@live
  - fnd-a-falling-tide-reloads-18-cells-at-410-mb-s-peak--tjz5vscfrdtazcms@live
  - fnd-a-full-world-snapshot-save-is-310-mb--2c7a78gjb54ygkj4@live
  - fnd-a-thread-pool-with-continuation-waits-keeps-work--3nryg6kq6w7236ae@live
  - fnd-alpha-content-needs-6-2-ms-of-gull-time-per-fram--4mekgdpsdv5nk085@live
  - fnd-archetype-iteration-takes-3-4-ms-in-the-alpha-wo--dawb9m0pa999mhpe@live
  - fnd-cell-size-sweep-for-the-768-m-streaming-radius--q3qfh6cp8a0k0f7g@live
  - fnd-cross-platform-cloud-saves-need-platform-agreeme--4qgfc1a4nq4padvz@live
  - fnd-delta-saves-reach-6-2-mb-after-40-hours--8g1j04z0vhjwrkyn@live
  - fnd-deltas-saved-at-low-tide-replay-wrongly-at-high--25b4vwytarw8ej50@live
  - fnd-each-save-upgrade-step-costs-under-5-ms--qs1rweqqgj7kweem@live
  - fnd-fibers-hide-waits-but-need-custom-stacks-and-deb--0ynync38mj13w03k@live
  - fnd-field-captures-show-forecast-eviction-cuts-reloa--ee6m7fwv4798jdmv@live
  - fnd-fixed-point-tide-step-costs-0-3-ms-on-meridian--jzxe4pa936rxawns@live
  - fnd-fixed-point-tide-step-costs-0-9-ms-on-skiff--mfc73bg9wwaxtfra@live
  - fnd-fixed-point-tides-match-bit-for-bit-across-all-p--kb3ssw5190e93r4m@live
  - fnd-float-tides-drift-apart-between-machines-within--znd0wy18bfw2prss@live
  - fnd-gull-s-tree-walking-interpreter-spends-1-8-ms-on--bj1ge76d3wy5aqq3@live
  - fnd-hot-reload-drops-suspended-gull-coroutines--va0fn0svryzwbzws@live
  - fnd-kelp-decodes-at-1-1-gb-s-on-skiff-with-a-cold-ca--vef244qjn2mjf07x@live
  - fnd-kelp-with-a-1-mb-dictionary-decodes-at-2-2-gb-s--vkt1dgk99x2xrmbs@live
  - fnd-lru-eviction-thrashes-during-tide-turns--0tvj4hmg42jy5d3f@live
  - fnd-ports-cut-the-skiff-memory-total-and-streaming-m--1p8b10ttb07jkznx@live
  - fnd-priority-lanes-still-leave-workers-28-idle-durin--fhswesk5c086dk1y@live
  - fnd-register-vm-prototype-runs-the-crab-herd-4-1x-fa--1eb9hfat7611jksr@live
  - fnd-retail-skiff-units-sustain-only-190-mb-s-of-stre--485sdcmm3gweevvn@live
  - fnd-shipping-entity-names-costs-57-mb-at-full-popula--6w7gjvy7wdmdx9qx@live
  - fnd-skiff-s-file-system-cannot-memory-map-packed-arc--00ecsf304vk38ajb@live
  - fnd-streaming-jobs-block-workers-while-waiting-on-re--sn2bmfdgjeqwkk3p@live
  - fnd-streaming-tide-heights-costs-46-kb-s-per-peer--knxqtyqh6xcz1tp9@live
  - fnd-strict-float-mode-still-diverges-because-skiff-s--z811r28v0a1wzb13@live
  - fnd-the-gull-vm-reads-thread-local-registers-after-f--1qser43b9j8ac5pf@live
  - fnd-tide-turns-toggle-the-submerged-tag-on-40-000-en--a95p39zkd5ckmg5y@live
  - iss-gull-hot-reload-drops-suspended-coroutines--z7j2gmyny6gdxd07@open
  - rsk-fiber-stacks-may-make-crash-dumps-unreadable--b7c1mkn9ygvmsy57@realized
  - rsk-hot-reload-may-corrupt-live-script-state--ec2ht2r1sq6h56ew@open
  - >-
    rsk-kelp-s-4-mb-dictionary-may-thrash-the-skiff-cach--rv7ac1hedneqkp0v@realized
  - >-
    rsk-ports-may-need-to-shrink-the-streaming-pool-for--1gtjkygrtkb5kgww@realized
  - >-
    rsk-queries-that-join-tables-with-sparse-tags-may-lo--2h5br5crhfn1nb8c@realized
  - >-
    rsk-saving-during-a-tide-turn-may-record-a-half-appl--zezc1pxx8zp5b82m@realized
---
Engine jobs are back on a thread pool with continuation waits; fibers are gone, and Gull keeps two dedicated threads. Cells are 192 m, with 64 m navigation tiles. The streaming pool is 1.6 GB, cut from 2.0 GB to fit the Skiff memory budget. Reads for tide-exposed cells take top priority. Saves carry a schema version and upgrade step by step on load; beta saves must load in every later build. Hot reload drops suspended coroutines, so its real success rate is about 71%. The tide stays in 32.32 fixed point.
