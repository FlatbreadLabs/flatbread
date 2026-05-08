---
id: post-missing-author
title: Post With Ghost Author
authors:
  - known-author
  - ghost-author
---

The second entry in `authors` points at an Author record that does not exist in
the fixture tree, so the missing-ref validator must surface it before schema use.
