---
id: con-the-docs-site-may-not-depend-on-motion-or-any-pa--1b06vxdgbrcem943
effort: eff-relational-content-foundation--8a8332x4cazgf2k0
title: The docs site may not use animation libraries or paid private packages
kind: hard
created_at: '2026-08-12T23:05:41.717Z'
---

The docs site keeps text, page changes, and layout stable while readers
navigate. It must not add Motion, Motion+, or another animation library.

Motion+ also comes from a paid private registry at `api.motion.dev`. A public
repository cannot hold its access token, and contributors without a membership
could not install dependencies or build the site.

Do not add a private package as an optional path. Every contributor and CI run
must install and build the same public dependency set.
