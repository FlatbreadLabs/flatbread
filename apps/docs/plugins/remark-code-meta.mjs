import { walk } from './walk.mjs';

/**
 * Carry a fenced block's info string onto the rendered `<code>` element.
 *
 * A fence written as ```` ```ts flatbread.config.js ```` keeps `ts` as the
 * language and hands `flatbread.config.js` to the code block frame as a label.
 */
export function remarkCodeMeta() {
  return (tree) => {
    walk(tree, (node) => {
      if (node.type !== 'code') return;
      const meta = (node.meta ?? '').trim();
      if (!meta) return;

      node.data = node.data ?? {};
      node.data.hProperties = {
        ...(node.data.hProperties ?? {}),
        'data-title': stripQuotes(meta),
      };
    });
  };
}

function stripQuotes(value) {
  const quoted = /^(?:title=)?["'](.+)["']$/.exec(value);
  return quoted ? quoted[1] : value;
}

export default remarkCodeMeta;
