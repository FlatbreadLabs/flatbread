/** Return an empty root path or one leading slash with no trailing slash. */
export function normalizeBasePath(value) {
  const path = value?.replace(/^\/+|\/+$/g, '') ?? '';
  return path ? `/${path}` : '';
}
