import { anyToString } from './stringUtils';
import { createHash } from 'crypto';

export default function createShaHash(content: any) {
  return createHash('sha256').update(anyToString(content)).digest('hex');
}
