import { createGroup } from '../../model/factory.ts';
import {
  commonParent,
  indexInParent,
  sortByPaintOrder,
  topmostOnly,
} from '../../model/tree.ts';
import type { EditorContext, Json } from '../types.ts';
import { command } from '../types.ts';

/**
 * Wraps `ids` in a new group placed where the frontmost of them was, then
 * selects the group. Returns the group's id, or null when nothing can be
 * grouped.
 */
export function groupNodes(
  ctx: EditorContext,
  ids: readonly string[]
): string | null {
  const { doc } = ctx;
  const members = sortByPaintOrder(
    doc,
    topmostOnly(
      doc,
      ids.filter((id) => doc.has(id))
    )
  );
  if (!members.length) return null;
  const parent = commonParent(doc, members);
  // Members not directly in `parent` are lifted out of their own containers.
  const front = members[members.length - 1];
  let anchor = front;
  while (doc.require(anchor).parent !== parent)
    anchor = doc.require(anchor).parent!;
  const group = createGroup(ctx.ids);
  const groupId = group.id;
  ctx.batch('Group selection', () => {
    ctx.dispatch(
      command('insert', {
        nodes: [group] as unknown as Json[],
        parent,
        index: indexInParent(doc, anchor) + 1,
      })
    );
    members.forEach((id, i) => {
      ctx.dispatch(command('reorder', { id, parent: groupId, index: i }), {
        select: i === members.length - 1 ? [groupId] : undefined,
      });
    });
  });
  return groupId;
}
