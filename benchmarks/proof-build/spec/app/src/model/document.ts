import { Emitter } from '../util/emitter.ts';
import { assert, fail } from '../util/assert.ts';
import type { DocumentData, SceneNode } from './types.ts';
import { isContainer } from './types.ts';
import { fitGroup } from './geometry.ts';

export interface DocumentEvents extends Record<string, unknown> {
  change: { ids: string[] };
  load: { name: string };
}

/**
 * The live document. Every write goes through `insert`, `remove`, `place`
 * and `update`, which keep parent links, child lists and group bounds in
 * step and emit `change` with the ids that moved.
 */
export class Document {
  name: string;
  readonly events = new Emitter<DocumentEvents>();
  private nodes = new Map<string, SceneNode>();
  private top: string[] = [];

  constructor(name = 'Untitled') {
    this.name = name;
  }

  get(id: string): SceneNode | undefined {
    return this.nodes.get(id);
  }

  require(id: string): SceneNode {
    const node = this.nodes.get(id);
    if (!node) fail('missing-node', `no node ${id}`);
    return node;
  }

  has(id: string): boolean {
    return this.nodes.has(id);
  }

  get size(): number {
    return this.nodes.size;
  }

  /** Child ids of `parent` (null for the page), back to front. */
  children(parent: string | null): readonly string[] {
    if (parent === null) return this.top;
    const node = this.require(parent);
    return isContainer(node) ? node.children : [];
  }

  ids(): string[] {
    return [...this.nodes.keys()];
  }

  all(): SceneNode[] {
    return [...this.nodes.values()];
  }

  /** Adds `node` (with no children yet) under `parent` at `index`. */
  insert(node: SceneNode, parent: string | null, index?: number): void {
    assert(!this.nodes.has(node.id), `duplicate id ${node.id}`, 'duplicate-id');
    if (parent !== null)
      assert(
        isContainer(this.require(parent)),
        `${parent} cannot hold children`,
        'not-container'
      );
    const copy = { ...node, parent } as SceneNode;
    if (isContainer(copy)) copy.children = [...copy.children];
    this.nodes.set(copy.id, copy);
    const list = this.mutableChildren(parent);
    list.splice(index ?? list.length, 0, copy.id);
    this.refreshGroups(parent);
    this.events.emit('change', { ids: [copy.id] });
  }

  /** Removes `id` and its subtree. Returns the removed nodes, parents first. */
  remove(id: string): SceneNode[] {
    const node = this.require(id);
    const removed: SceneNode[] = [];
    const walk = (current: SceneNode) => {
      removed.push(current);
      if (isContainer(current))
        for (const child of current.children) walk(this.require(child));
    };
    walk(node);
    const list = this.mutableChildren(node.parent);
    list.splice(list.indexOf(id), 1);
    for (const gone of removed) this.nodes.delete(gone.id);
    this.refreshGroups(node.parent);
    this.events.emit('change', { ids: removed.map((n) => n.id) });
    return removed;
  }

  /** Moves `id` to `parent` at `index` (an index in the new parent's list). */
  place(id: string, parent: string | null, index: number): void {
    const node = this.require(id);
    if (parent !== null) {
      assert(
        isContainer(this.require(parent)),
        `${parent} cannot hold children`,
        'not-container'
      );
      let cursor: string | null = parent;
      while (cursor !== null) {
        assert(cursor !== id, `cannot move ${id} into itself`, 'cycle');
        cursor = this.require(cursor).parent;
      }
    }
    const from = node.parent;
    const oldList = this.mutableChildren(from);
    oldList.splice(oldList.indexOf(id), 1);
    const newList = this.mutableChildren(parent);
    newList.splice(Math.max(0, Math.min(index, newList.length)), 0, id);
    node.parent = parent;
    this.refreshGroups(from);
    if (parent !== from) this.refreshGroups(parent);
    this.events.emit('change', { ids: [id] });
  }

  update(id: string, patch: Partial<SceneNode>): void {
    const node = this.require(id);
    assert(
      !('id' in patch) || patch.id === id,
      'cannot change an id',
      'bad-patch'
    );
    assert(!('parent' in patch), 'use place() to change a parent', 'bad-patch');
    assert(
      !('children' in patch),
      'use place() to change children',
      'bad-patch'
    );
    Object.assign(node, patch);
    this.refreshGroups(node.parent);
    this.events.emit('change', { ids: [id] });
  }

  /** Recomputes the bounds of every group from `start` up to the page. */
  private refreshGroups(start: string | null): void {
    let cursor = start;
    while (cursor !== null) {
      const node = this.require(cursor);
      if (node.type === 'group') {
        const kids = node.children.map((child) => this.require(child));
        Object.assign(node, fitGroup(kids, node));
      }
      cursor = node.parent;
    }
  }

  private mutableChildren(parent: string | null): string[] {
    if (parent === null) return this.top;
    const node = this.require(parent);
    assert(
      isContainer(node),
      `${parent} cannot hold children`,
      'not-container'
    );
    return node.children;
  }

  toJSON(): DocumentData {
    const nodes: Record<string, SceneNode> = {};
    for (const [id, node] of this.nodes) nodes[id] = structuredClone(node);
    return { name: this.name, top: [...this.top], nodes };
  }

  /** Replaces the whole document. Emits `load`, not `change`. */
  replace(data: DocumentData): void {
    this.name = data.name;
    this.nodes = new Map(Object.entries(structuredClone(data.nodes)));
    this.top = [...data.top];
    this.events.emit('load', { name: this.name });
  }

  static from(data: DocumentData): Document {
    const doc = new Document(data.name);
    doc.replace(data);
    return doc;
  }
}
