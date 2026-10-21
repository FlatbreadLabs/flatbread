# Plan: review comments

1. Model. A thread is `{ id, documentKey, anchor, comments: [{ id, author, at, text }], resolved }`. The anchor is either a canvas point, or a layer id plus the point on the canvas where the pin sits.
2. Where they live. Threads go in a comment store of their own, keyed by the document, next to the view-state sidecar and never inside the document file. `files.save()` stays exactly as it is and the schema needs no new version: a delivered file never carries what reviewers wrote.
3. History. Adding a thread, replying, resolving, reopening and deleting are store operations, not commands on the bus, so they make no history entry and Undo never removes someone's comment. Each person deletes their own comment with an explicit delete.
4. Layers that go away. When a pinned layer is deleted the thread keeps its last canvas point and is marked detached; it is not deleted. If the delete is undone, the thread pins back to the layer, since the id comes back.
5. Plugins. A new `commentadd` event on the existing `on()`; plugin API v1 gains no member. Comment text counts as document content, so the payload `{ threadId, commentId, layerId, text }` carries `text` only to plugins with the `export` capability; the rest get the ids alone. Payloads are frozen copies.
6. Tests: the saved file is unchanged by comments; Undo after a reply leaves it; a deleted layer leaves a detached thread; a plugin without export never sees comment text.
