# Plan: review comments

1. Add a `comments` array to the document data beside `top` and `nodes`, and a `comments` list on each node for layer pins. Bump the schema to version 6 with a migration step that adds empty lists.
2. Each comment action is a command (`add-comment`, `reply`, `resolve`, `delete-comment`) dispatched through the bus, so Undo and Redo work for comments like for any other edit.
3. Deleting a layer deletes its comments with it, since they live on the node.
4. Plugins get a `commentadd` event with the full comment text, and a new `api.getComments()` method on the v1 API.
