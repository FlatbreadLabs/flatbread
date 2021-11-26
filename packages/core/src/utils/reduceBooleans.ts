/**
 * Union an array of booleans to a single boolean with the given union type.
 *
 * @param array The array of booleans to reduce.
 * @param unionType
 * @returns The union boolean.
 */
const reduceBooleans = (
  array: Required<boolean[]>,
  unionType: Required<'and' | 'or'>
): boolean => {
  if (unionType === 'and') {
    return array.reduce((acc, curr) => acc && curr, true);
  } else if (unionType === 'or') {
    return array.reduce((acc, curr) => acc || curr, false);
  }
  throw new Error(
    `Unsupported reduceBooleans() union type given: ${unionType}`
  );
};

export default reduceBooleans;
