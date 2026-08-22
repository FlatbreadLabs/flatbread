---
id: dec-create-changelog-backed-github-releases-in-publi--fh6bsn7jr296q93d
effort: eff-proof-and-contributor-operating-system--ahhgtafvdhg4dfve
title: 'Create changelog-backed GitHub releases in publish:ci'
state: accepted
created_at: '2026-08-22T19:28:52.332Z'
derives_from:
  - con-public-npm-releases-use-one-lockstep-version--0c4eg8frxys4fv2s
---

## Context

The 1.0.1 packages reached npm without a GitHub release or release notes. A manual second step can be missed, can draft notes from a different source, and can leave npm and GitHub with different release records. The repository already keeps release notes in `CHANGELOG.md` and publishes all public packages at one lockstep version.

## Decision

Treat npm publication and its GitHub release as one operator step in `pnpm publish:ci`. Before npm publication, require a non-empty lockstep version section in `CHANGELOG.md`, verify GitHub access and the remote tag state, and format GitHub notes from that section. Publish every public package first. Then create and push the annotated `v<version>` tag and create the GitHub release from the prepared notes. A retry skips packages and a GitHub release only when the existing release body matches those notes, and it rejects a tag at another commit.

## Alternatives

We rejected manual `gh release create`, notes drafted in the GitHub UI, and a separate release job. Each option splits one release across two sources or two triggers and preserves the failure mode that left 1.0.1 without notes. We also rejected creating the remote tag or GitHub release before npm because that could announce a release whose packages did not publish.

## Consequences

`publish:ci` needs npm, git, and GitHub credentials. Its dry run must test the same hard gates without writing. A failure after npm may still need a retry, so the tag and release steps must be idempotent. `CHANGELOG.md` is the source for public release notes.

## Reversal criteria

Split the GitHub release into a separate job only if the release system can prove it runs once for every successful lockstep npm publication, consumes the same committed changelog section, checks the exact release commit, and exposes a failed or missing GitHub release as a blocking release error.
