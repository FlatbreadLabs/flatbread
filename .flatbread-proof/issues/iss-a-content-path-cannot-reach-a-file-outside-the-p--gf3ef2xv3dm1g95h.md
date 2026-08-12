---
id: iss-a-content-path-cannot-reach-a-file-outside-the-p--gf3ef2xv3dm1g95h
effort: eff-relational-content-foundation--8a8332x4cazgf2k0
title: A content path cannot reach a file outside the project directory
kind: gap
status: open
created_at: '2026-08-12T23:05:30.208Z'
derives_from:
  - fnd-building-the-docs-site-on-flatbread-found-six-li--tabacz23jq6jk545
---

`path: '../../packages/[id]/README.md'` matches nothing. A project that wants to read files kept beside it — a monorepo package README, a sibling content directory, a shared folder — has to leave a symlink in its own tree instead.

The docs site does exactly that: `apps/docs/content/reference/core.md` is a symlink to `packages/core/README.md`. It works, and the symlink's own name conveniently supplies the record id. But it is a workaround a newcomer has to be told about, and it does not survive on a filesystem without symlinks.

Two questions worth settling before changing anything. Is the restriction deliberate — a sandbox around what a config may read — or is it an accident of how paths are resolved against `process.cwd()`? If it is deliberate, say so in an error message, because today the collection simply comes back empty. If it is not, allowing a path to resolve above the project root would remove the need for symlinks in every monorepo.
