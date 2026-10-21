// The expression parser behind every numeric panel field. It reads
// arithmetic on plain numbers: `12`, `12px`, `100 / 3`, `(8 + 4) * 2`,
// `-5`. A `px` suffix is allowed on any number and means nothing extra.

type Token =
  | { kind: 'num'; value: number }
  | { kind: 'op'; value: '+' | '-' | '*' | '/' }
  | { kind: 'paren'; value: '(' | ')' };

const NUMBER = /^(\d+(?:\.\d*)?|\.\d+)(?:\s*px)?/i;

function tokenize(text: string): Token[] | null {
  const tokens: Token[] = [];
  let rest = text.trim();
  while (rest.length) {
    const ch = rest[0];
    if (ch === ' ') {
      rest = rest.slice(1);
      continue;
    }
    if (ch === '+' || ch === '-' || ch === '*' || ch === '/') {
      tokens.push({ kind: 'op', value: ch });
      rest = rest.slice(1);
      continue;
    }
    if (ch === '(' || ch === ')') {
      tokens.push({ kind: 'paren', value: ch });
      rest = rest.slice(1);
      continue;
    }
    const match = NUMBER.exec(rest);
    if (!match) return null;
    tokens.push({ kind: 'num', value: Number(match[1]) });
    rest = rest.slice(match[0].length);
  }
  return tokens;
}

/** Recursive descent: expr = term (('+'|'-') term)*; term = unary (('*'|'/') unary)*. */
class Parser {
  private at = 0;
  private tokens: Token[];
  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  parse(): number | null {
    const value = this.expr();
    return value !== null && this.at === this.tokens.length ? value : null;
  }

  private peek(): Token | undefined {
    return this.tokens[this.at];
  }

  private expr(): number | null {
    let left = this.term();
    while (left !== null) {
      const t = this.peek();
      if (!t || t.kind !== 'op' || (t.value !== '+' && t.value !== '-')) break;
      this.at++;
      const right = this.term();
      if (right === null) return null;
      left = t.value === '+' ? left + right : left - right;
    }
    return left;
  }

  private term(): number | null {
    let left = this.unary();
    while (left !== null) {
      const t = this.peek();
      if (!t || t.kind !== 'op' || (t.value !== '*' && t.value !== '/')) break;
      this.at++;
      const right = this.unary();
      if (right === null) return null;
      if (t.value === '/' && right === 0) return null;
      left = t.value === '*' ? left * right : left / right;
    }
    return left;
  }

  private unary(): number | null {
    const t = this.peek();
    if (t && t.kind === 'op' && (t.value === '-' || t.value === '+')) {
      this.at++;
      const value = this.unary();
      return value === null ? null : t.value === '-' ? -value : value;
    }
    return this.atom();
  }

  private atom(): number | null {
    const t = this.peek();
    if (!t) return null;
    if (t.kind === 'num') {
      this.at++;
      return t.value;
    }
    if (t.kind === 'paren' && t.value === '(') {
      this.at++;
      const value = this.expr();
      const close = this.peek();
      if (
        value === null ||
        !close ||
        close.kind !== 'paren' ||
        close.value !== ')'
      )
        return null;
      this.at++;
      return value;
    }
    return null;
  }
}

/** Evaluates a typed field value. Returns null for anything it cannot read. */
export function parseExpression(text: string): number | null {
  const tokens = tokenize(text);
  if (!tokens || !tokens.length) return null;
  const value = new Parser(tokens).parse();
  return value !== null && Number.isFinite(value) ? value : null;
}
