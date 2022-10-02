import { anyToString } from './stringUtils';
import { createHash } from 'crypto';

/**
 * Returns a SHA-256 hash string for any given input.
 */
export function createShaHash(content: unknown): string {
  return createHash('sha256').update(anyToString(content)).digest('hex');
}
