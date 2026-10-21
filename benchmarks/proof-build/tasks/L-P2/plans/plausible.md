# Plan: version history

1. Store. A `VersionStore` holds `{ id, name, createdAt, snapshot }`. `snapshot` is the output of `files.save()`, which is stable text, so two identical documents give identical snapshots.
2. Saving versions. An interval timer saves an automatic version every five minutes when the document changed since the last one. A "Save version…" palette command takes a name.
3. Where they live. The simplest thing that survives reopening is a `versions` array next to `top` and `nodes` in the saved file. `serializeDocument` writes it and `parseFile` reads it back, with a default of `[]` in `withDefaults`-style code for files that have none. Each version also keeps the zoom it was saved at, so viewing it opens where the user was.
4. Viewing. `files.load` into a second, read-only editor instance (palette and panel edits disabled) shows an old version without touching the current one.
5. Restoring. A `restore-version` command replaces the document's nodes with the snapshot's. Its inverse holds the current document's JSON (`doc.toJSON()`), so Undo brings it back. It runs through the bus, so it is one history entry.
6. Tests: autosave timing with an injected clock, named save, view without changes, restore and undo, a file with versions round-trips.
