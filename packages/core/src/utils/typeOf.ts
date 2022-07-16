/**
 * A more advanced typeof wrapper that resolves primitive types like `object` into their true types.
 *
 * @param obj The object to resolve.
 * @returns The true type of the object, or `undefined` if it can't be resolved.
 */
export default function typeOf<T>(obj?: T) {
  if (obj == null) {
    return (obj + ``).toLowerCase();
  } // implicit toString() conversion

  const deepType = Object.prototype.toString.call(obj).slice(8, -1).toLowerCase();
  if (deepType === `generatorfunction`) {
    return `function`;
  }

  // Prevent overspecificity (for example, [object HTMLDivElement], etc).
  // Account for functionish Regexp (Android <=2.3), functionish <object> element (Chrome <=57, Firefox <=52), etc.
  // String.prototype.match is universally supported.

  return deepType.match(
    /^(array|bigint|date|error|function|generator|regexp|symbol)$/
  )
    ? deepType
    : typeof obj === `object` || typeof obj === `function`
      ? `object`
      : typeof obj;
}
