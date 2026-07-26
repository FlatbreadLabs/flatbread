import { randomBytes as cryptoRandomBytes } from 'node:crypto';
import type { PrimitiveKind } from './types.js';
const alphabet = '0123456789abcdefghjkmnpqrstvwxyz';
export const KIND_PREFIX: Record<PrimitiveKind, string> = {
  effort: 'eff',
  issue: 'iss',
  finding: 'fnd',
  decision: 'dec',
  constraint: 'con',
  risk: 'rsk',
  blob: 'blb',
  citation: 'cit',
};
export const KIND_DIRECTORY: Record<PrimitiveKind, string> = {
  effort: 'efforts',
  issue: 'issues',
  finding: 'findings',
  decision: 'decisions',
  constraint: 'constraints',
  risk: 'risks',
  blob: 'blobs',
  citation: 'citations',
};
export const PREFIX_KIND = Object.fromEntries(
  Object.entries(KIND_PREFIX).map(([k, v]) => [v, k])
) as Record<string, PrimitiveKind>;
export function slugify(value: string): string {
  const s = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
    .replace(/-+$/g, '');
  return s || 'untitled';
}
function suffix(bytes: Uint8Array): string {
  let n = 0n;
  for (const b of bytes) n = (n << 8n) | BigInt(b);
  let out = '';
  for (let i = 0; i < 16; i++) {
    out = alphabet[Number(n & 31n)] + out;
    n >>= 5n;
  }
  return out;
}
export function generateArtifactId(
  kind: PrimitiveKind,
  title: string,
  randomBytes: (length: number) => Uint8Array = cryptoRandomBytes
): string {
  return `${KIND_PREFIX[kind]}-${slugify(title)}--${suffix(randomBytes(10))}`;
}
export function validateArtifactId(
  id: string,
  expectedKind?: PrimitiveKind
): boolean {
  const m =
    /^([a-z]{3})-[a-z0-9]+(?:-[a-z0-9]+)*--([0123456789abcdefghjkmnpqrstvwxyz]{16})$/.exec(
      id
    );
  return (
    !!m &&
    !!PREFIX_KIND[m[1]] &&
    (!expectedKind || PREFIX_KIND[m[1]] === expectedKind)
  );
}
