import { EntryNode } from '../types';
import { get } from 'lodash-es';
import deepEntries from './deepEntries';
import reduceBooleans from './reduceBooleans';
import { isMatch as isWildcardMatch } from 'matcher';

/**
 * Return a callable sifting function that can be used to filter an array of objects with the given filter object.
 *
 * The generated function accepts a single object and returns a boolean.
 *
 * @param filterArgs The filter object.
 * @returns A callable sift function.
 */
const createFilterFunction = (
  filterArgs: Readonly<SiftArgs>,
  filterSetManifest?: TargetAndComparator
) => {
  return (node: EntryNode) => {
    // If there are no filter args, return the original array.
    if (!filterArgs) {
      return node;
    }

    // If a filter set manifest is not given, generate one
    // Filter args transformed to logical expressions.
    filterSetManifest ??= generateFilterSetManifest(filterArgs);

    let evaluatedFilterSet: boolean[] = [];

    for (let { path, comparator } of filterSetManifest) {
      // Retrieve the value of interest from the node.
      const needle = get(node, path, undefined);
      // Compare the value of interest to the target value, and store the result of the evaluated expression.
      evaluatedFilterSet.push(generateComparisonFunction(comparator)(needle));
    }

    // Combine the filter set results with the union operation.
    return reduceBooleans(evaluatedFilterSet, 'and');
  };
};
export default createFilterFunction;

/**
 * Generate a comparison function that can be used to compare a variable `a` (the field in each node) to a constant value `value` (target value in filter argument).
 *
 * @param comparator The comparator object that contains the operation and the target value.
 * @returns A function that can be used to compare a value to the target value.
 */
function generateComparisonFunction(
  comparator: Comparator
): CompareValueAgainstConstant {
  const { operation, value } = comparator;
  switch (operation) {
    case 'eq':
      return (a: any) => a === value;
    case 'ne':
      return (a: any) => a !== value;
    case 'lt':
      return (a: any) => a < value;
    case 'lte':
      return (a: any) => a <= value;
    case 'gt':
      return (a: any) => a > value;
    case 'gte':
      return (a: any) => a >= value;
    case 'in':
      return (a: any) => isArrayElseThrow(value) && value.includes(a);
    case 'nin':
      return (a: any) => isArrayElseThrow(value) && !value.includes(a);
    case 'includes':
      return (a: any) => isArrayElseThrow(a) && a.includes(value);
    case 'excludes':
      return (a: any) => isArrayElseThrow(a) && !a.includes(value);
    case 'regex':
      return (a: any) => value.test(a);
    case 'wildcard':
      return (a: any) => isWildcardMatch(a, value);
    case 'exists':
      return (a: any) => (value ? a != undefined : a == undefined);
    case 'strictlyExists':
      return (a: any) => (value ? a !== undefined : a === undefined);
    default:
      throw new Error(`Unsupported operation: ${operation}`);
  }
}

function isArrayElseThrow(value: any): value is any[] {
  if (Array.isArray(value)) {
    return true;
  }
  throw new Error(`Expected array, got: ${value}`);
}

/**
 * Seperate the filter args into an array of target and comparator objects.
 *
 * @param filterArgs The filter argument object.
 * @returns
 */
export const generateFilterSetManifest = (
  filterArgs: SiftArgs
): TargetAndComparator => {
  return deepEntries(filterArgs).map(([path, value]) => {
    const operation = path.pop();

    return {
      path,
      comparator: {
        operation,
        value,
      },
    };
  });
};

/**
 * The filter argument object using a MongoDB-like syntax, inspired by how Gatsby does it.
 *
 * @see [Gatsby's query filters](https://github.com/gatsbyjs/gatsby/blob/d56c1f12ad2b3e7fa245f4ff9a74e81d0585b79e/docs/docs/query-filters.md) for API details.
 */
type SiftArgs = Record<string, any>;

/**
 * An array of target and comparator objects
 */
export type TargetAndComparator = { path: string[]; comparator: Comparator }[];

/**
 * Consists of a comparison operation label and the value to compare against.
 */
type Comparator = {
  operation: ComparatorOperation;
  value: any;
};

/**
 * Supported comparison operations:
 *
 * @example
 * ```
 * 'eq' - Equal
 * 'ne' - Not equal
 * 'lt' - Less than
 * 'lte' - Less than or equal
 * 'gt' - Greater than
 * 'gte' - Greater than or equal
 * 'in' - In
 * 'nin' - Not in
 * 'includes' - Includes in array field
 * 'excludes' - Excludes from array field
 * 'regex' - Regular expression
 * 'wildcard' - loose string matching
 * 'exists' - Exists (checks against `undefined | null`)
 * 'strictlyExists' - Strictly exists (checks against `undefined`)
 * ```
 */
type ComparatorOperation =
  | 'eq'
  | 'ne'
  | 'lt'
  | 'lte'
  | 'gt'
  | 'gte'
  | 'in'
  | 'nin'
  | 'includes'
  | 'excludes'
  | 'regex'
  | 'wildcard'
  | 'exists'
  | 'strictlyExists';

/**
 * Compare a value to a constant target value.
 */
type CompareValueAgainstConstant = (a: any) => boolean;
