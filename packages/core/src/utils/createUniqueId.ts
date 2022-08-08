import { customAlphabet } from 'nanoid';
import { lowercase, numbers } from 'nanoid-dictionary';

const nanoid = customAlphabet(lowercase + numbers);

export function createUniqueId() {
  // only use lower case to avoid issues with windows ignoring case on filenames
  return nanoid();
}
