# Tessera core

The document model and editing core of Tessera, a design editor. It has no
DOM and no dependencies: the canvas, panels and plugins are view models that
a shell renders.

```ts
import { createEditor } from './src/editor.ts';

const editor = createEditor();
const card = editor.create('frame', { name: 'Card', width: 320, height: 200 });
editor.selection.set([card]);
editor.panel.edit('W', '360');
editor.history.undo();
```

## Layout

| Folder           | What it holds                                                        |
| ---------------- | -------------------------------------------------------------------- |
| `src/model/`     | nodes, the document tree, geometry, transforms, styles and text      |
| `src/units/`     | units, the field expression parser, display precision and formatting |
| `src/selection/` | the selection, hit testing and selection rules                       |
| `src/commands/`  | the command bus, history, the palette and the built-in commands      |
| `src/panel/`     | the properties panel                                                 |
| `src/layers/`    | the layers panel                                                     |
| `src/keys/`      | keyboard shortcuts and focus scopes                                  |
| `src/canvas/`    | pointer gestures and the viewport                                    |
| `src/persist/`   | saving, loading and file migrations                                  |
| `src/plugin/`    | the plugin host and API (see `docs/plugins.md`)                      |

`src/editor.ts` wires everything together; `createEditor()` is the entry
point for the shell and for tests.

## Tests

```sh
node --experimental-strip-types --test
```
