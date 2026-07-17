import type { VFile } from 'vfile';
import type { EntryNode } from '../types';

export type RecordsByCollection = Record<string, EntryNode[]>;

export type FilesByCollection = Readonly<Record<string, readonly VFile[]>>;

export type PathClassification = Readonly<{
  collection: string;
  captures: Readonly<Record<string, string>>;
}>;

/**
 * Record production: transform already-classified, collection-grouped source
 * files into records, stamping source context last.
 *
 * For every file, select the transformer registered for the file's exact
 * `VFile.extname` (leading dot included; later-configured transformers win a
 * duplicated extension, as today). Call its `parse`, then overwrite `_path`
 * with `file.path` and `_filename` with `file.basename` — core is
 * authoritative for those two fields; transformer output and `file.data`
 * cannot override them. All other parser output is preserved, including
 * source capture data a transformer copied from `file.data`.
 *
 * Preserves input collection keys and file order. Throws
 * `no transformer found for <file.path>` when no matching transformer/parse
 * exists. When `config.transformer` is empty, returns files cast as entries
 * (current no-transform behavior). Performs NO id or reference validation and
 * must not classify paths or mutate `VFile.data`.
 */
export { produceRecords } from './produce';

/**
 * Validate a COMPLETE collection→records mapping (a full graph or a full
 * proposed replacement — reference validation needs every target collection
 * present). Runs identifier validation first, then reference validation
 * against the same unmodified record set; never partially returns after
 * either fails. Preserves the exact existing aggregate, sorted diagnostic
 * text of both validators byte-for-byte (validation snapshot tests depend on
 * it). Returns the records narrowed to ContentNode for resolver/index use.
 */
export { validateRecords } from './validate';

/**
 * THE single path→Collection matcher. Stable interface — a later watch
 * coordinator consumes it to classify watcher events.
 *
 * `path` and configured `content[].path` may be absolute or relative; both
 * are resolved from `process.cwd()` before comparison. Segment matching is
 * case-sensitive after that normalization; extension allowlisting is
 * case-insensitive and INCLUDED here (candidate extension, lowercased, with
 * leading dot, must appear in `config.loaded.extensions` under the same
 * normalization) — callers do not pre-filter. Returns `undefined` for an
 * excluded extension or no match; never reads disk.
 *
 * A plain configured directory owns every descendant file. A configured
 * pattern containing `[name]`, `*`, or `**` is matched against the COMPLETE
 * path (no extra trailing descendants): `[name]suffix` captures the segment
 * value minus the literal `suffix` (which must match); `*` consumes one
 * segment without capturing; a whole `**` segment consumes zero or more
 * segments without capturing. `captures` contains only named `[name]`
 * values; a repeated name is overwritten by the later segment (current
 * behavior). The first matching `content` entry in configuration order wins.
 */
export { classifyPath } from './classify';
