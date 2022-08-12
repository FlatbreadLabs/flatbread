export function isObject<K extends string | number | symbol, T>(
  value: unknown
): value is Record<K, T> {
  return (
    !!value && typeof value === 'object' && value.constructor.name === 'Object'
  );
}
