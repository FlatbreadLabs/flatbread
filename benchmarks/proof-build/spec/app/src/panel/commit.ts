import type { EditorContext } from '../commands/types.ts';
import type { FieldDescriptor } from './schema.ts';
import { clampField, parseFieldInput } from './fields.ts';

export type CommitResult =
  | { ok: true; changed: number }
  | { ok: false; error: string };

/** Commits typed text to one field for every selected node it applies to. */
export function commitField(
  ctx: EditorContext,
  field: FieldDescriptor,
  text: string
): CommitResult {
  if (field.readonly)
    return { ok: false, error: `${field.label} is read-only` };
  const parsed = parseFieldInput(field.kind, text);
  if (parsed === null)
    return { ok: false, error: `cannot read "${text}" as ${field.kind}` };
  const value = clampField(field, parsed);
  const nodes = ctx.selection
    .ids()
    .map((id) => ctx.doc.require(id))
    .filter((node) => field.appliesTo(node));
  if (!nodes.length)
    return {
      ok: false,
      error: `${field.label} does not apply to the selection`,
    };
  const gesture = ctx.newGesture();
  let changed = 0;
  for (const node of nodes)
    for (const c of field.write(node, value, ctx.doc)) {
      ctx.dispatch(c, { label: `Set ${field.label}`, gesture });
      changed += 1;
    }
  return { ok: true, changed };
}
