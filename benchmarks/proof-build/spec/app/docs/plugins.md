# Plugins

A plugin is a manifest with a `name`, optional `capabilities` and a `main`
function. The editor calls `main` once with the plugin's API object.

```ts
editor.plugins.load({
  name: 'counter',
  capabilities: ['export'],
  main(api) {
    api.on('documentchange', ({ ids }) => console.log(ids.length, 'changed'));
  },
});
```

## API v1

Plugin API v1 is frozen.

| Member              | Returns                                                     |
| ------------------- | ----------------------------------------------------------- |
| `version`           | `1`                                                         |
| `name`              | the plugin's name                                           |
| `on(event, fn)`     | listens to an event                                         |
| `off(event, fn)`    | stops listening                                             |
| `getSelection()`    | the selected layer ids                                      |
| `runCommand(title)` | runs a palette command; false when it is disabled           |
| `listCommands()`    | the palette titles that can run now                         |
| `shortcuts()`       | the default shortcut table                                  |
| `export.document()` | the document as a saved file (with the `export` capability) |

## Events

| Event            | Payload                |
| ---------------- | ---------------------- |
| `documentchange` | `{ ids }`              |
| `documentload`   | `{ name }`             |
| `historychange`  | `{ canUndo, canRedo }` |

## Capabilities

| Capability | Grants       |
| ---------- | ------------ |
| `export`   | `api.export` |

A plugin that throws is logged and keeps running. After `unload`, every API
call throws.
