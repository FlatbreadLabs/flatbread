# Plan: components

1. Model. A frame gets `component: { id }` when it becomes a main component; an instance is a frame with `instanceOf: <main id>` and `overrides: { [childPath]: { text?, fill? } }`. Instance children are ordinary nodes kept in step with the main.
2. Commands. New commands `make-component`, `place-instance`, `set-override` and `sync-instances`, each with a plain JSON payload naming nodes by id, each returning its inverse. No payload holds a node object, so the commands undo, redo and replay like the rest.
3. History. Making a component, placing an instance and editing an override are one entry each. An edit to the main component runs its own commands and then `sync-instances` for every instance inside the same batch (or with the edit's gesture id), so one Undo takes back the edit and every instance update together.
4. Files. Schema version 6 with a new v5→v6 step that adds empty component fields. The shipped steps stay as they are.
5. Plugins. Plugin API v1 keeps its members. A new `instancechange` event carries ids, and the component/instance data a plugin gets is a deep-frozen copy made when the event fires, never a live node. Anything more waits for a v2 API.
6. Tests: undo counts for each gesture, replay of a recorded log, migration of a v5 file, frozen plugin payloads.
