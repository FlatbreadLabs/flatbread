// Id minting. Ids are `<prefix>-<n>`, counted per editor, so a test that
// builds the same document twice gets the same ids.

export interface IdSource {
  next(prefix: string): string;
  /** Moves the counter past every id in `ids`, so loaded ids never repeat. */
  reserve(ids: Iterable<string>): void;
  peek(): number;
}

const ID_PATTERN = /^([a-z]+)-(\d+)$/;

export function createIdSource(start = 1): IdSource {
  let counter = start;
  return {
    next(prefix: string): string {
      if (!/^[a-z]+$/.test(prefix)) throw new Error(`bad id prefix ${prefix}`);
      return `${prefix}-${counter++}`;
    },
    reserve(ids: Iterable<string>): void {
      for (const id of ids) {
        const match = ID_PATTERN.exec(id);
        if (match) counter = Math.max(counter, Number(match[2]) + 1);
      }
    },
    peek(): number {
      return counter;
    },
  };
}

export function isId(value: unknown): value is string {
  return typeof value === 'string' && ID_PATTERN.test(value);
}

export function idPrefix(id: string): string {
  const match = ID_PATTERN.exec(id);
  return match ? match[1] : '';
}
