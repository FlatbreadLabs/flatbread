import { anyToString } from './stringUtils';
import { createHash as createHashRaw } from 'crypto';

export default function createHash(content: any) {
  return createHashRaw('sha256').update(anyToString(content)).digest('hex');
}
