import type { Document } from '../model/document.ts';
import type { SceneNode } from '../model/types.ts';
import type { Command } from '../commands/types.ts';

/**
 * How a field reads and writes its value:
 * - `length`: px, typed as an expression
 * - `angle`: stored in radians, shown and typed in degrees
 * - `percent`: a 0–1 share, shown and typed as a percentage
 * - `number`: a plain number, typed as an expression
 * - `color`: `#RRGGBB`
 * - `text`: any string
 */
export type FieldKind =
  | 'length'
  | 'angle'
  | 'percent'
  | 'number'
  | 'color'
  | 'text';

export type FieldValue = number | string;

export interface FieldDescriptor {
  /** The label the panel shows, and the name `panel.edit()` takes. */
  label: string;
  kind: FieldKind;
  readonly?: boolean;
  min?: number;
  max?: number;
  appliesTo(node: SceneNode): boolean;
  read(node: SceneNode, doc: Document): FieldValue;
  /** The commands that give `node` this value. */
  write(node: SceneNode, value: FieldValue, doc: Document): Command[];
}

export interface SectionDescriptor {
  name: string;
  title: string;
  fields: FieldDescriptor[];
}

export function field(descriptor: FieldDescriptor): FieldDescriptor {
  return descriptor;
}
