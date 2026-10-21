// createEditor(): the one entry point. Everything a user or a plugin author
// can do goes through the object it returns.

import { createIdSource } from './util/ids.ts';
import { Document } from './model/document.ts';
import { createNode } from './model/factory.ts';
import type { NodeType, SceneNode } from './model/types.ts';
import { Selection } from './selection/selection.ts';
import { normalizeSelection } from './selection/rules.ts';
import type {
  Command,
  DispatchOptions,
  EditorContext,
} from './commands/types.ts';
import { createRegistry } from './commands/registry.ts';
import { History } from './commands/history.ts';
import { CommandBus } from './commands/bus.ts';
import { batch } from './commands/batch.ts';
import { createGestureSource } from './commands/coalesce.ts';
import { createPalette } from './commands/palette.ts';
import { PropertiesPanel } from './panel/properties.ts';
import { LayersPanel } from './layers/layers.ts';
import { createDispatcher } from './keys/dispatcher.ts';
import type { Scope } from './keys/scopes.ts';
import { DEFAULT_KEYMAP } from './keys/keymap.ts';
import type { ViewState } from './persist/viewstate.ts';
import {
  defaultViewState,
  parseViewState,
  serializeViewState,
} from './persist/viewstate.ts';
import { serializeDocument } from './persist/serialize.ts';
import { parseFile } from './persist/deserialize.ts';
import { PluginHost } from './plugin/host.ts';
import type { PluginManifest } from './plugin/api.ts';
import { Viewport } from './canvas/viewport.ts';
import { CanvasGestures } from './canvas/gestures.ts';
import type { Modifiers } from './canvas/gestures.ts';
import type { Point } from './model/geometry.ts';

export interface EditorOptions {
  /** Milliseconds; history entries record it. Defaults to Date.now. */
  clock?: () => number;
}

export interface CreateOptions {
  parent?: string | null;
  index?: number;
}

export function createEditor(options: EditorOptions = {}) {
  const ids = createIdSource();
  const doc = new Document();
  const selection = new Selection();
  const registry = createRegistry();
  const history = new History();
  const bus = new CommandBus(doc, selection, registry, history, options.clock);
  const gestures = createGestureSource();
  let viewState: ViewState = defaultViewState();

  const ctx: EditorContext = {
    doc,
    selection,
    ids,
    dispatch: (c: Command, o?: DispatchOptions) => bus.dispatch(c, o),
    batch: (label: string, run: () => void) => batch(bus, label, run),
    newGesture: () => gestures.next(),
    undo: () => bus.undo(),
    redo: () => bus.redo(),
  };

  const palette = createPalette(ctx);
  const panel = new PropertiesPanel(ctx, () => viewState);
  const layers = new LayersPanel(ctx);
  const keys = createDispatcher({ ...ctx, palette, layers });
  const viewport = new Viewport(() => viewState);
  const canvas = new CanvasGestures(ctx, viewport);

  const plugins = new PluginHost({
    selection: () => selection.ids(),
    runCommand: (title) => palette.run(title),
    listCommands: () => palette.list(),
    shortcuts: () => DEFAULT_KEYMAP,
    saveDocument: () => serializeDocument(doc),
  });
  doc.events.on('change', ({ ids: changed }) =>
    plugins.emit(
      'documentchange',
      Object.freeze({ ids: Object.freeze([...changed]) })
    )
  );
  doc.events.on('load', ({ name }) =>
    plugins.emit('documentload', Object.freeze({ name }))
  );
  history.events.on('change', ({ canUndo, canRedo }) =>
    plugins.emit('historychange', Object.freeze({ canUndo, canRedo }))
  );

  const files = {
    /** The document as a file string. */
    save: (): string => serializeDocument(doc),
    load(text: string, savedViewState?: string | ViewState): void {
      const data = parseFile(text);
      selection.clear();
      history.clear();
      doc.replace(data);
      ids.reserve(doc.ids());
      viewState = parseViewState(savedViewState ?? null);
    },
    viewState: (): ViewState => structuredClone(viewState),
    saveViewState: (): string => serializeViewState(viewState),
  };

  return {
    doc,
    selection: {
      ids: () => selection.ids(),
      set: (next: string[]) => selection.set(normalizeSelection(doc, next)),
      add: (id: string) => selection.add(id),
      clear: () => selection.clear(),
      has: (id: string) => selection.has(id),
      on: selection.events.on.bind(selection.events),
    },
    history: {
      undo: () => bus.undo(),
      redo: () => bus.redo(),
      get canUndo() {
        return history.canUndo;
      },
      get canRedo() {
        return history.canRedo;
      },
      get size() {
        return history.size;
      },
      entries: () => history.entries(),
      clear: () => history.clear(),
    },
    commands: {
      dispatch: (c: Command, o?: DispatchOptions) => bus.dispatch(c, o),
      replay: (list: readonly Command[]) => bus.replay(list),
      types: () => registry.types(),
      on: bus.events.on.bind(bus.events),
    },
    panel,
    layers,
    keys: {
      press: (chord: string) => keys.press(chord),
      down: (chord: string, o?: { repeat?: boolean }) => keys.down(chord, o),
      up: (chord: string) => keys.up(chord),
      focus: (scope: Scope) => keys.focus.focus(scope),
      get scope(): Scope {
        return keys.focus.current;
      },
    },
    palette: {
      run: (title: string, input?: string) => palette.run(title, input),
      list: () => palette.list(),
      has: (title: string) => palette.has(title),
    },
    plugins: {
      load: (manifest: PluginManifest) => plugins.load(manifest),
      unload: (name: string) => plugins.unload(name),
      loaded: () => plugins.loaded(),
      errors: () => [...plugins.sandbox.errors],
    },
    files,
    canvas: {
      down: (p: Point, m?: Modifiers) => canvas.down(p, m),
      move: (p: Point, m?: Modifiers) => canvas.move(p, m),
      up: (p: Point, m?: Modifiers) => canvas.up(p, m),
      click: (p: Point, m?: Modifiers) => canvas.click(p, m),
      drag: (from: Point, to: Point, m?: Modifiers) =>
        canvas.dragPath(from, to, m),
      get zoom() {
        return viewport.zoom;
      },
      setZoom: (zoom: number) => viewport.setZoom(zoom),
    },
    /** Adds a node directly, with no history entry. For building documents in tests and fixtures. */
    create(
      type: NodeType,
      props: Partial<SceneNode> = {},
      where: CreateOptions = {}
    ): string {
      const node = createNode(ids, type, props);
      doc.insert(node, where.parent ?? null, where.index);
      return node.id;
    },
  };
}

export type Editor = ReturnType<typeof createEditor>;
