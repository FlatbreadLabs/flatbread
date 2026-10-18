---
id: fnd-world-core-state-at-alpha--tkbsm4867h65jqq8
effort: eff-kestrel-world-streaming-and-simulation-core--3evfpn88ghjnnfk4
title: World core state at alpha
kind: compaction
created_at: '2026-03-06T16:00:00Z'
created_by: Rhea Valdés
derives_from:
  - con-streaming-pool-budget--632bkbs79bwj4cr5
  - dec-compile-gull-to-bytecode-for-a-register-vm--jrqje646fpevp5f3
  - dec-evict-cells-by-distance-and-tide-forecast--fyp1jp366pjjzxcg
  - dec-group-archetype-chunks-by-tide-band-to-cut-fragm--qxnkv5bxqz1r7afv
  - dec-hot-reload-gull-functions-by-swapping-bytecode-a--8dxnkg6h8vmcsr42
  - dec-partition-the-world-into-128-m-cells--372b6czbjf29ymaw
  - dec-run-engine-jobs-on-fibers-and-pin-gull-scripts-t--rw28cbqfd07rd9te
  - dec-run-the-tide-simulation-in-32-32-fixed-point--c5rjfcnmhne4h05e
  - dec-save-player-changes-as-deltas-keyed-to-the-tide--1qxvc9985c8pzke8
  - dec-shrink-kelp-s-dictionary-to-1-mb-for-streamed-as--yh8hktfqnyqhepew
supersedes:
  - fnd-world-core-state-before-the-vertical-slice--rbpesp345hf8mesp
superseded_by:
  - fnd-world-core-state-after-beta--v9mfhngtx7m2bdkk
invalidated_by:
  - fnd-hot-reload-drops-suspended-gull-coroutines--va0fn0svryzwbzws
covers:
  - con-archetype-changes-happen-only-at-frame-sync-poin--kcsrz5g8g8yndwnx@live
  - con-cell-load-deadline--m20x64m5eh7q2bh6@live
  - con-gull-script-tick-budget--4p9jp4dj1njf7q9m@live
  - con-no-runtime-code-generation-on-consoles--6cf25zqmsvqkdd73@live
  - con-streaming-i-o-budget--vhc7mrmpqv9qcfdc@live
  - con-streaming-pool-budget--632bkbs79bwj4cr5@live
  - con-tide-state-must-be-bit-identical-on-every-peer--zrpnp8qjyxzkas7t@live
  - dec-compile-gull-to-bytecode-for-a-register-vm--jrqje646fpevp5f3@accepted
  - dec-compress-streamed-assets-with-kelp--ezwc5p1tgsgm7v8m@accepted
  - dec-evict-cells-by-distance-and-tide-forecast--fyp1jp366pjjzxcg@accepted
  - >-
    dec-group-archetype-chunks-by-tide-band-to-cut-fragm--qxnkv5bxqz1r7afv@accepted
  - >-
    dec-hot-reload-gull-functions-by-swapping-bytecode-a--8dxnkg6h8vmcsr42@accepted
  - dec-partition-the-world-into-128-m-cells--372b6czbjf29ymaw@accepted
  - >-
    dec-read-streamed-assets-through-one-async-request-q--rd5c8rxr5pwz50ds@accepted
  - >-
    dec-run-engine-jobs-on-fibers-and-pin-gull-scripts-t--rw28cbqfd07rd9te@accepted
  - dec-run-the-tide-simulation-in-32-32-fixed-point--c5rjfcnmhne4h05e@accepted
  - >-
    dec-save-player-changes-as-deltas-keyed-to-the-tide--1qxvc9985c8pzke8@accepted
  - >-
    dec-shrink-kelp-s-dictionary-to-1-mb-for-streamed-as--yh8hktfqnyqhepew@accepted
  - >-
    dec-store-components-in-archetype-tables-and-volatil--yxsjd26wcaz6fgx9@accepted
  - >-
    dec-wrap-the-tide-phase-accumulator-at-each-40-minut--hx88m4hbg27n0xwy@accepted
  - fnd-128-m-cells-should-add-only-40-mb-of-per-cell-ov--ape0tgv597x77p6z@live
  - fnd-a-falling-tide-reloads-18-cells-at-410-mb-s-peak--tjz5vscfrdtazcms@live
  - fnd-a-full-world-snapshot-save-is-310-mb--2c7a78gjb54ygkj4@live
  - fnd-alpha-content-needs-6-2-ms-of-gull-time-per-fram--4mekgdpsdv5nk085@live
  - fnd-archetype-iteration-takes-3-4-ms-in-the-alpha-wo--dawb9m0pa999mhpe@live
  - fnd-bytecode-swap-at-frame-boundaries-reloads-94-of--rqrk03vvef5jgv2x@live
  - fnd-cell-size-sweep-for-the-768-m-streaming-radius--q3qfh6cp8a0k0f7g@live
  - fnd-deltas-saved-at-low-tide-replay-wrongly-at-high--25b4vwytarw8ej50@live
  - fnd-fibers-hide-waits-but-need-custom-stacks-and-deb--0ynync38mj13w03k@live
  - fnd-field-captures-show-forecast-eviction-cuts-reloa--ee6m7fwv4798jdmv@live
  - fnd-fixed-point-tide-step-costs-0-3-ms-on-meridian--jzxe4pa936rxawns@live
  - fnd-fixed-point-tide-step-costs-0-9-ms-on-skiff--mfc73bg9wwaxtfra@live
  - fnd-fixed-point-tides-match-bit-for-bit-across-all-p--kb3ssw5190e93r4m@live
  - fnd-float-tides-drift-apart-between-machines-within--znd0wy18bfw2prss@live
  - fnd-gull-s-tree-walking-interpreter-spends-1-8-ms-on--bj1ge76d3wy5aqq3@live
  - fnd-kelp-decodes-at-1-1-gb-s-on-skiff-with-a-cold-ca--vef244qjn2mjf07x@live
  - fnd-kelp-with-a-1-mb-dictionary-decodes-at-2-2-gb-s--vkt1dgk99x2xrmbs@live
  - fnd-lru-eviction-thrashes-during-tide-turns--0tvj4hmg42jy5d3f@live
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
  - rsk-fiber-stacks-may-make-crash-dumps-unreadable--b7c1mkn9ygvmsy57@open
  - rsk-hot-reload-may-corrupt-live-script-state--ec2ht2r1sq6h56ew@open
  - >-
    rsk-kelp-s-4-mb-dictionary-may-thrash-the-skiff-cach--rv7ac1hedneqkp0v@realized
  - rsk-ports-may-need-to-shrink-the-streaming-pool-for--1gtjkygrtkb5kgww@open
  - >-
    rsk-queries-that-join-tables-with-sparse-tags-may-lo--2h5br5crhfn1nb8c@realized
---
Engine jobs run on fibers, and Gull scripts are pinned to two dedicated threads after fiber migration broke the VM's thread-local state. Cells stay 128 m. Kelp keeps streaming with a 1 MB dictionary, after a cold-cache rerun showed the 4 MB dictionary losing to Zstandard on Skiff. Gull now compiles to bytecode for a register VM, 4.1x faster than the interpreter, and hot reload swaps bytecode at frame boundaries, which applies 94% of edits. Saves key each delta to the tide phase. The 2.0 GB pool evicts by distance and tide forecast. ECS chunks are grouped by tide band.
