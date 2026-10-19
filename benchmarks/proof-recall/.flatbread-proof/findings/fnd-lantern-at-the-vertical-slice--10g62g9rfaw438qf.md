---
id: fnd-lantern-at-the-vertical-slice--10g62g9rfaw438qf
effort: eff-lantern-renderer-overhaul--qwgke408pte4k0ar
title: Lantern at the vertical slice
kind: compaction
created_at: '2025-12-18T10:00:00Z'
created_by: Ines Okafor
derives_from:
  - dec-drop-the-far-sdf-gi-cascade-for-the-vertical-sli--0af6sjseeftc621j
  - dec-move-to-gpu-driven-two-phase-occlusion-culling--6dre481mabxsw6ee
  - dec-ship-tern-as-lantern-s-only-upscaler--fmreq35nzyjc7k4e
  - dec-splat-caustic-photons-from-a-sun-space-map--gz19gensacx2zh1w
  - dec-use-64-vertex-meshlets-with-up-to-124-triangles--67xmt2c2hkv7tr4h
  - dec-use-cascaded-shadow-maps-with-four-cascades--s5c1y9jaf275afzr
  - dec-use-screen-space-refraction-for-saltglass--vknzksgdrgr7zkg6
  - dec-use-signed-distance-field-gi--yn366zmp3k7snd9w
  - dec-use-the-stock-filmic-tonemapping-curve--wefzd9091kztq0wb
  - dec-visibility-buffer-for-opaque-geometry-foliage-an--gvnvp04jgm7kbfh9
superseded_by:
  - fnd-lantern-at-alpha--ckpd9ecvdjqbcr7c
covers:
  - con-frame-budget--f5qxxq5572878wrp@live
  - con-meridian-hdr-certification-requirements--nx9pmkwjjvxy1smf@live
  - con-one-upscaler-path-on-every-platform--f91bgj6n66kwc5d3@live
  - con-render-target-memory-on-meridian--q4szajxse9c1csdv@live
  - con-saltglass-must-read-at-2-km--65a67jbwhr7r73qw@live
  - con-skiff-has-no-mesh-shader-support--zz4xpaqy1n0zzrj7@live
  - con-ui-composites-at-a-fixed-203-nits-in-hdr--de6aft7cvhdezn5s@live
  - >-
    dec-capture-the-cliffs-and-dunes-benchmarks-on-every--3pqyr66yh4v6q676@accepted
  - >-
    dec-drop-the-far-sdf-gi-cascade-for-the-vertical-sli--0af6sjseeftc621j@accepted
  - >-
    dec-expand-meshlets-to-index-buffers-in-compute-on-s--bpbtr54dgzgsjgme@accepted
  - >-
    dec-hard-code-hdr-paper-white-at-200-nits-on-meridia--k481dkkr69gf77rr@accepted
  - >-
    dec-move-to-gpu-driven-two-phase-occlusion-culling--6dre481mabxsw6ee@accepted
  - >-
    dec-resolve-materials-with-one-uber-shader-over-bind--s9nbq2qn05mk5j6r@accepted
  - dec-ship-tern-as-lantern-s-only-upscaler--fmreq35nzyjc7k4e@accepted
  - dec-splat-caustic-photons-from-a-sun-space-map--gz19gensacx2zh1w@accepted
  - >-
    dec-use-64-vertex-meshlets-with-up-to-124-triangles--67xmt2c2hkv7tr4h@accepted
  - dec-use-a-cached-shadow-atlas-for-local-lights--8p6f2v774he38t5j@accepted
  - dec-use-cascaded-shadow-maps-with-four-cascades--s5c1y9jaf275afzr@accepted
  - dec-use-screen-space-refraction-for-saltglass--vknzksgdrgr7zkg6@invalidated
  - dec-use-signed-distance-field-gi--yn366zmp3k7snd9w@accepted
  - dec-use-the-stock-filmic-tonemapping-curve--wefzd9091kztq0wb@accepted
  - >-
    dec-visibility-buffer-for-opaque-geometry-foliage-an--gvnvp04jgm7kbfh9@accepted
  - fnd-32-bit-visibility-ids-overflow-on-the-dunes-benc--eyjs4sekprhhtddp@live
  - fnd-alpha-tested-foliage-costs-2-1-ms-in-the-visibil--f3g34x2k6fs367eb@live
  - fnd-cpu-culling-and-draw-submission-cost-3-2-ms-on-t--1y0j1b9p0zjh0n1g@live
  - fnd-forward-overdraw-on-saltglass-cliffs--q9n76frhz7a7ssnp@live
  - fnd-gi-takes-13-percent-of-the-quality-mode-frame--afshqnfm209zrae9@live
  - fnd-halcyon-vendor-upscaler-quality-and-platform-cov--xz7hp3e1m1mh44v4@live
  - fnd-meshlet-size-sweep-on-the-cliffs-benchmark--zeg5q7pn92jd42x3@live
  - fnd-photon-caustics-cost-1-1-ms-from-a-512-by-512-su--2rg1xq89re42cgaj@live
  - fnd-probe-grid-leaks-light-through-thin-saltglass-wa--h2hdqdfj92mnmkbj@live
  - fnd-projected-caustic-textures-tile-visibly-past-600--dkyy65zqqh5gx04x@live
  - fnd-refraction-cost-screen-space-0-9-ms-ray-marched--pr6bzy3tvstaptdc@live
  - fnd-screen-space-refraction-halos-around-the-player--6ytj9mvh0v1bfsdf@live
  - fnd-screen-space-refraction-loses-off-screen-content--k8zvmmdee7wg2fjy@live
  - fnd-sdf-gi-costs-2-2-ms-on-meridian--r7t7zy97nwxxxctd@live
  - fnd-tern-cost-at-4k-output-on-meridian-after-fp16-pa--p4gcmzw2a4bvzjev@live
  - fnd-virtual-shadow-maps-cost-1-4-ms-on-meridian-with--mwpybda1vh0ac55e@live
  - fnd-visibility-buffer-prototype-timings--qcfzqvyxbxkf2spw@live
  - iss-cascade-seams-visible-through-saltglass-at-300-t--3590ssrc8xxa4ae6@open
  - iss-no-ray-traced-reflections-on-saltglass--pdcbm94d32f55fa0@open
  - rsk-compute-meshlet-expansion-is-too-slow-on-skiff--b1915sgdsr1bpwda@open
  - rsk-sdf-volumes-outgrow-the-render-target-memory-bud--xfd2pfztvskdcd2c@open
---
The vertical slice shipped on 2025-12-15. The dunes flyover ran at 16.1 ms on Meridian after the far SDF GI cascade was dropped for the slice build, so the 16.6 ms Frame budget held.

Opaque geometry renders through a visibility buffer, with foliage and saltglass in a forward pass after the resolve. Sun shadows use four cascaded shadow maps; virtual shadow maps were rejected on a 3.1 ms cost. GI is signed-distance-field GI at 2.2 ms. Saltglass refraction is screen-space, although a Finding has shown it loses off-screen content at grazing angles and a replacement is due in January. Caustics are photon splats. Tern is the only upscaler. Tonemapping uses the stock filmic curve. Culling is GPU-driven with 64-vertex meshlets.
