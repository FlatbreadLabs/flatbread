/**
 * A generic, functional utility for mapping over an object of keyed-arrays.
 *
 * @param keyedArray The object of keyed-arrays to map over.
 * @param callback The callback to call for each keyed-array.
 * @returns The object of keyed-arrays with the callback applied.
 */
export function map<KeyedArray, A, B>(
  keyedArray: KeyedArray,
  callback: (node: A) => B
) {
  return Object.fromEntries(
    Object.entries(keyedArray).map(([key, array]) => [
      key,
      array.map((node: A): B => callback(node)),
    ])
  );
}
