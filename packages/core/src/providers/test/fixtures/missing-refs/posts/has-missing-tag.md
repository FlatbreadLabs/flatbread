---
id: post-missing-tag
title: Post With Ghost Tag
authors:
  - known-author
tags:
  - known-tag
  - ghost-tag
---

This fixture exercises the "tag is a relation, not a facet" case from the
glossary: `tags` is configured as a `Tag` collection ref so the validator
should report `ghost-tag` as missing.
