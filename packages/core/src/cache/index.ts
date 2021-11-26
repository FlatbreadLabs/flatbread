// This file is not yet used, but may be used in the future to improve performance.
import LRU from 'lru-cache';
import crypto from 'crypto';

const cache = new LRU(1000);

export function getCache() {
  return cache;
}

export function addToCache(key: string, value: any) {
  cache.set(key, value);
}

export function getFromCache(key: string) {
  return cache.get(key);
}

export function createCacheKey(
  attribute: string,
  nodeType: string,
  uid: string
) {
  // This should include serialized node contents to ensure that we don't hit old cache entries
  const key = `${nodeType}:${uid}:${attribute}`;

  return crypto.createHash('md5').update(key).digest('hex');
}
