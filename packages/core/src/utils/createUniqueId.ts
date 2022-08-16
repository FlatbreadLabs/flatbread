import { customAlphabet } from 'nanoid';

// only use lower case letters and numbers to avoid issues with windows ignoring case on filenames
const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789');

export function createUniqueId() {
  return nanoid();
}
