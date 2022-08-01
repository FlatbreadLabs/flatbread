/**
 * Converts any value to a string. Stringifies functions and objects, making them ripe for hashing.
 *
 * Credit to Michael Wallace https://stackoverflow.com/a/59422590/12368615
 *
 * @param valueToConvert The value to convert
 */
export function anyToString(valueToConvert: unknown): string {
  if (valueToConvert === undefined || valueToConvert === null) {
    return valueToConvert === undefined ? 'undefined' : 'null';
  }
  if (typeof valueToConvert === 'string') {
    return `'${valueToConvert}'`;
  }
  if (
    typeof valueToConvert === 'number' ||
    typeof valueToConvert === 'boolean' ||
    typeof valueToConvert === 'function'
  ) {
    return valueToConvert.toString();
  }
  if (valueToConvert instanceof Array) {
    const stringfiedArray = valueToConvert
      .map((property) => anyToString(property))
      .join(',');
    return `[${stringfiedArray}]`;
  }
  if (typeof valueToConvert === 'object') {
    const stringfiedObject = Object.entries(valueToConvert)
      .map((entry: [string, unknown]) => {
        return `${entry[0]}: ${anyToString(entry[1])}`;
      })
      .join(',');
    return `{${stringfiedObject}}`;
  }
  return JSON.stringify(valueToConvert);
}
