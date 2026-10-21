# Plan: review comments

1. Data. A `Comment` is `{ id, author, at, text }`; a `Thread` is `{ id, anchor, comments, resolved }`, where the anchor is a canvas point or a layer id with an offset from the layer's top left.
2. Saving. Threads are part of the document, so they go in the file: `DocumentData` gains `threads`, `serializeDocument` writes them after `nodes`, and a new v5→v6 migration step adds `threads: []` to older files. Shipped steps stay as they are.
3. Commands. `add-thread`, `add-reply`, `set-resolved` and `delete-thread` are new commands on the bus with plain JSON payloads naming the thread id. AGENTS.md asks every document change to go through a command, so each comment action is undoable, and the history labels read "Add comment", "Resolve thread".
4. Layers. A thread pinned to a layer follows it as it moves (its point is the layer's position plus the offset). When the layer is deleted, the delete command also removes its threads in the same entry, so one Undo restores both.
5. Plugins. A new `commentadd` event, `{ threadId, text, author }`, emitted from the bus's `executed` event; no new member on the v1 API, since events may be added.
6. Tests: threads round-trip through save and load, older files migrate, undo of a reply, deleting a layer removes its threads.
