# Plan: version history

1. A version is `{ id, name, at, file }` where `file` is the text `files.save()` wrote at that moment. Versions live in a store beside the document, not in the document file.
2. Autosave adds a version on a timer; the shell's Save version command adds a named one. Nothing about zoom, collapsed panel sections or expanded layers goes into a version or the file; view state stays in its own sidecar.
3. Viewing a version parses its file into a separate read-only Document (through `parseFile`, so an older schema version goes through the normal step-by-step migrations). Viewing makes no history entries and leaves the current document's file alone.
4. Restoring dispatches one `replace-document` command whose payload is the version's file text and whose inverse holds the current file text: plain JSON, so it undoes, redoes and replays. Undo brings back the document and the exact selection.
5. If versions need new data in the file, that goes in a new migration step; shipped steps are not edited.
