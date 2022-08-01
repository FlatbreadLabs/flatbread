/**
 * Wraps the value within an array if it is not an array.
 */
export function arrayify(value: unknown): any[] {
  return Array.isArray(value) ? value : [value];
}
