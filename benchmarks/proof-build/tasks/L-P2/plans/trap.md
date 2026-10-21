# Plan: version history

1. Keep an array of versions in memory, each holding the live `Document` object and a reference to the current nodes, so restoring is instant.
2. Store versions in the document file under a `versions` key, together with the zoom and collapsed sections at that time so the view comes back too.
3. Add a `versionMeta` field to the v4→v5 migration step for older files.
4. Restore by calling `doc.replace(version.doc.toJSON())` directly.
