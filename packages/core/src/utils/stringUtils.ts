/**
 * Converts any value to a string. Stringifies functions, RegExp, and objects for hashing.
 *
 * @param valueToConvert The value to convert
 */
export function anyToString(valueToConvert: unknown): string {
  return JSON.stringify(valueToConvert, replaceAnyToString);
}

/**
 * Replacer function for `JSON.stringify` that converts functions, RegExp, and objects to strings.
 */
export function replaceAnyToString(_: string, value: unknown) {
  if (value === undefined) {
    return 'undefined';
  }

  return typeof value === 'function' ||
    (value instanceof RegExp && value.constructor === RegExp)
    ? value.toString()
    : value;
}
