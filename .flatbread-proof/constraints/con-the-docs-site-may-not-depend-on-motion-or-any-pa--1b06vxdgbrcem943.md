---
id: con-the-docs-site-may-not-depend-on-motion-or-any-pa--1b06vxdgbrcem943
effort: eff-relational-content-foundation--8a8332x4cazgf2k0
title: The docs site may not depend on Motion+ or any paid private registry
kind: hard
created_at: '2026-08-12T23:05:41.717Z'
---

Motion's `splitText` — the documented way to break a string into characters for animation — ships in Motion+, a paid membership installed from a private registry at `api.motion.dev` with a secret access token.

A public repository cannot hold that token, and a contributor without a membership could not install dependencies or build the site. The same reasoning rules out any other component behind a private registry.

The docs site therefore splits text itself, in `apps/docs/app/components/motion/SplitText.tsx`. It is about thirty lines. Two details are easy to get wrong and are handled there: the whole string stays in `aria-label` so a screen reader hears a sentence rather than a stream of letters, and every piece is `inline-block`, because transforms do nothing to an inline element.

If someone with a Motion+ token later wants the official utility, the component is a drop-in swap — but it must stay optional.
