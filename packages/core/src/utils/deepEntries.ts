import typeOf from './typeOf';

/**
 * Recursively transforms a nested object into a multidimensional array of length-2, where the first item is an array of keys leading to the value and the second item is the value found at the end of the path.
 *
 * @param obj any Javascript object
 * @param path the path to a value in the object
 * @param stack a tuple with a path array and value which that path leads to
 * @returns a tuple with a path array and value which that path leads to
 */
const deepEntries = (
  obj: Record<string, any>,
  path: string[] = [],
  stack: any[] = []
): [string[], any] => {
  if (typeOf(obj) === 'object') {
    for (let [key, value] of Object.entries(obj)) {
      stack = deepEntries(value, [...path, key], stack);
    }
  } else {
    stack.push([path, obj]);
  }
  return stack as [string[], any];
};

export default deepEntries;
