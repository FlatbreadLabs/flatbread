---
id: fnd-world-core-state-before-the-vertical-slice--rbpesp345hf8mesp
effort: eff-kestrel-world-streaming-and-simulation-core--3evfpn88ghjnnfk4
title: World core state before the vertical slice
kind: compaction
created_at: '2025-12-12T16:00:00Z'
created_by: Rhea Valdés
derives_from:
  - con-streaming-pool-budget--632bkbs79bwj4cr5
  - dec-compress-streamed-assets-with-kelp--ezwc5p1tgsgm7v8m
  - dec-evict-the-least-recently-used-cells-first--4eap3mr9tkafxy2p
  - dec-keep-gull-on-the-tree-walking-interpreter--br1kgzfmw57xmm9m
  - dec-move-engine-jobs-to-fibers--qjkgnm8cex8ydzfq
  - dec-partition-the-world-into-128-m-cells--372b6czbjf29ymaw
  - dec-read-streamed-assets-through-one-async-request-q--rd5c8rxr5pwz50ds
  - dec-run-the-tide-simulation-in-32-32-fixed-point--c5rjfcnmhne4h05e
  - dec-save-player-changes-as-deltas-against-the-tide-f--n38scy1yaarsr8cw
  - dec-store-components-in-archetype-tables-and-volatil--yxsjd26wcaz6fgx9
superseded_by:
  - fnd-world-core-state-at-alpha--tkbsm4867h65jqq8
covers:
  - con-archetype-changes-happen-only-at-frame-sync-poin--kcsrz5g8g8yndwnx@live
  - con-cell-load-deadline--m20x64m5eh7q2bh6@live
  - con-gull-script-tick-budget--4p9jp4dj1njf7q9m@live
  - con-no-runtime-code-generation-on-consoles--6cf25zqmsvqkdd73@live
  - con-streaming-i-o-budget--a99y4h0e7xmhp5qk@live
  - con-streaming-pool-budget--632bkbs79bwj4cr5@live
  - con-tide-state-must-be-bit-identical-on-every-peer--zrpnp8qjyxzkas7t@live
  - dec-compress-streamed-assets-with-kelp--ezwc5p1tgsgm7v8m@accepted
  - dec-evict-the-least-recently-used-cells-first--4eap3mr9tkafxy2p@accepted
  - dec-keep-gull-on-the-tree-walking-interpreter--br1kgzfmw57xmm9m@accepted
  - dec-move-engine-jobs-to-fibers--qjkgnm8cex8ydzfq@accepted
  - dec-partition-the-world-into-128-m-cells--372b6czbjf29ymaw@accepted
  - >-
    dec-read-streamed-assets-through-one-async-request-q--rd5c8rxr5pwz50ds@accepted
  - dec-run-the-tide-simulation-in-32-32-fixed-point--c5rjfcnmhne4h05e@accepted
  - >-
    dec-save-player-changes-as-deltas-against-the-tide-f--n38scy1yaarsr8cw@accepted
  - >-
    dec-store-components-in-archetype-tables-and-volatil--yxsjd26wcaz6fgx9@accepted
  - >-
    dec-wrap-the-tide-phase-accumulator-at-each-40-minut--hx88m4hbg27n0xwy@accepted
  - fnd-128-m-cells-should-add-only-40-mb-of-per-cell-ov--ape0tgv597x77p6z@live
  - fnd-a-falling-tide-reloads-18-cells-at-410-mb-s-peak--tjz5vscfrdtazcms@live
  - fnd-a-full-world-snapshot-save-is-310-mb--2c7a78gjb54ygkj4@live
  - fnd-archetype-tables-iterate-transforms-2-4x-faster--3xtpgtqs17zzq6v3@live
  - fnd-cell-size-sweep-for-the-768-m-streaming-radius--q3qfh6cp8a0k0f7g@live
  - fnd-fibers-hide-waits-but-need-custom-stacks-and-deb--0ynync38mj13w03k@live
  - fnd-fixed-point-tide-step-costs-0-3-ms-on-meridian--jzxe4pa936rxawns@live
  - fnd-fixed-point-tide-step-costs-0-9-ms-on-skiff--mfc73bg9wwaxtfra@live
  - fnd-fixed-point-tides-match-bit-for-bit-across-all-p--kb3ssw5190e93r4m@live
  - fnd-float-tides-drift-apart-between-machines-within--znd0wy18bfw2prss@live
  - fnd-gull-s-tree-walking-interpreter-spends-1-8-ms-on--bj1ge76d3wy5aqq3@live
  - fnd-kelp-decodes-streamed-assets-at-2-9-gb-s-per-cor--32tjx83v8ky28sz4@live
  - fnd-priority-lanes-still-leave-workers-28-idle-durin--fhswesk5c086dk1y@live
  - fnd-shipping-entity-names-costs-57-mb-at-full-popula--6w7gjvy7wdmdx9qx@live
  - fnd-skiff-s-file-system-cannot-memory-map-packed-arc--00ecsf304vk38ajb@live
  - fnd-skiff-streaming-reads-sustain-260-mb-s--s1gkt975grre2ewr@live
  - fnd-streaming-jobs-block-workers-while-waiting-on-re--sn2bmfdgjeqwkk3p@live
  - fnd-streaming-tide-heights-costs-46-kb-s-per-peer--knxqtyqh6xcz1tp9@live
  - fnd-strict-float-mode-still-diverges-because-skiff-s--z811r28v0a1wzb13@live
  - fnd-tide-turns-toggle-the-submerged-tag-on-40-000-en--a95p39zkd5ckmg5y@live
  - rsk-fiber-stacks-may-make-crash-dumps-unreadable--b7c1mkn9ygvmsy57@open
  - rsk-kelp-s-4-mb-dictionary-may-thrash-the-skiff-cach--rv7ac1hedneqkp0v@open
  - rsk-queries-that-join-tables-with-sparse-tags-may-lo--2h5br5crhfn1nb8c@open
---
Components live in archetype tables, with volatile tide tags in sparse sets. Engine jobs run on fibers (160 fibers, 64 KB stacks) after two thread-pool versions left workers idle on waits. The world is partitioned into 128 m cells, halved from 256 m because falling tides forced whole-cell reloads. The tide simulation runs in 32.32 fixed point and matches bit for bit across platforms. Streamed assets use Kelp, read through one async request queue per platform, inside a 2.0 GB streaming pool with LRU eviction. Gull stays on its tree-walking interpreter until alpha content lands. Saves store player deltas against the tide-free baseline.
