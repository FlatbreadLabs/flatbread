import { AnyContentNode, Filter, FilterOperation, FilterValue } from '../types';
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
const createFilterFunction = <T extends AnyContentNode>(
  filterArgs: Readonly<Filter<T>>,
  filterSetManifest?: TargetAndComparator<T>
) => {
  return (node: T): boolean => {
    // If there are no filter args, return true (include all)
    if (!filterArgs) {
      return true;
    }

    // If a filter set manifest is not given, generate one
    // Filter args transformed to logical expressions.
    filterSetManifest ??= generateFilterSetManifest(filterArgs);

    const evaluatedFilterSet: boolean[] = [];

    for (const { path, comparator } of filterSetManifest) {
      // Retrieve the value of interest from the node.
      const needle = get(unwrapNode(node), path, undefined);
      // Compare the value of interest to the target value, and store the result of the evaluated expression.
      evaluatedFilterSet.push(generateComparisonFunction(comparator)(needle));
    }

    // Combine the filter set results with the union operation.
    return reduceBooleans(evaluatedFilterSet, 'and');
  };
};
export default createFilterFunction;

/**
 * Generate a comparison function that can be used to compare a variable `value` (the field in each node)
 * to a constant target value (target value in filter argument).
 *
 * @param comparator The comparator object that contains the operation and the target value.
 * @returns A function that can be used to compare a value to the target value.
 */
function generateComparisonFunction<T>(
  comparator: Comparator<T>
): CompareValueAgainstConstant<T> {
  const { operation, value } = comparator;

  switch (operation) {
    case 'eq':
      return (a: T): boolean => a === value;
    case 'ne':
      return (a: T): boolean => a !== value;
    case 'lt':
      return (a: T): boolean => {
        const aVal = a as unknown;
        const bVal = value as unknown;
        return (typeof aVal === 'number' && typeof bVal === 'number') ||
          (typeof aVal === 'string' && typeof bVal === 'string')
          ? aVal < bVal
          : false;
      };
    case 'lte':
      return (a: T): boolean => {
        const aVal = a as unknown;
        const bVal = value as unknown;
        return (typeof aVal === 'number' && typeof bVal === 'number') ||
          (typeof aVal === 'string' && typeof bVal === 'string')
          ? aVal <= bVal
          : false;
      };
    case 'gt':
      return (a: T): boolean => {
        const aVal = a as unknown;
        const bVal = value as unknown;
        return (typeof aVal === 'number' && typeof bVal === 'number') ||
          (typeof aVal === 'string' && typeof bVal === 'string')
          ? aVal > bVal
          : false;
      };
    case 'gte':
      return (a: T): boolean => {
        const aVal = a as unknown;
        const bVal = value as unknown;
        return (typeof aVal === 'number' && typeof bVal === 'number') ||
          (typeof aVal === 'string' && typeof bVal === 'string')
          ? aVal >= bVal
          : false;
      };
    case 'in':
      return (a: T): boolean => Array.isArray(value) && value.includes(a);
    case 'nin':
      return (a: T): boolean => Array.isArray(value) && !value.includes(a);
    case 'includes':
      return (a: T): boolean => {
        if (Array.isArray(a)) {
          return a.includes(value as T & unknown[]);
        }
        if (typeof a === 'string' && typeof value === 'string') {
          return a.includes(value);
        }
        return false;
      };
    case 'excludes':
      return (a: T): boolean => {
        if (Array.isArray(a)) {
          return !a.includes(value as T & unknown[]);
        }
        if (typeof a === 'string' && typeof value === 'string') {
          return !a.includes(value);
        }
        return true;
      };
    case 'regex':
      return (a: T): boolean => {
        if (value instanceof RegExp && typeof a === 'string') {
          return value.test(a);
        }
        return false;
      };
    case 'wildcard':
      return (a: T): boolean => {
        if (typeof a === 'string' && typeof value === 'string') {
          return isWildcardMatch(a, value);
        }
        return false;
      };
    case 'exists':
      return (a: T): boolean => {
        if (typeof value === 'boolean') {
          return value ? a != undefined : a == undefined;
        }
        return false;
      };
    case 'strictlyExists':
      return (a: T): boolean => {
        if (typeof value === 'boolean') {
          return value ? a !== undefined : a === undefined;
        }
        return false;
      };
    default:
      throw new Error(`Unsupported operation: ${operation}`);
  }
}

/**
 * Some transformers return a validation wrapper. This util unwraps either
 * `{ success, data }` or returns the value untouched.
 */
function unwrapNode<T>(node: T | { success: boolean; data: T }): T {
  if (
    node &&
    typeof node === 'object' &&
    'success' in node &&
    (node as any).success === true &&
    'data' in node
  ) {
    return (node as any).data;
  }
  return node as T;
}

/**
 * Separate the filter args into an array of target and comparator objects.
 *
 * @param filterArgs The filter argument object.
 * @returns Array of path and comparator pairs
 */
export const generateFilterSetManifest = <T extends AnyContentNode>(
  filterArgs: Filter<T>
): TargetAndComparator<T> => {
  return deepEntries(filterArgs as Record<string, unknown>).map(
    ([path, value]) => {
      const operation = path.pop() as FilterOperation;

      return {
        path,
        comparator: {
          operation,
          value,
        },
      };
    }
  );
};

/**
 * An array of target and comparator objects
 */
export type TargetAndComparator<T extends AnyContentNode> = Array<{
  path: string[];
  comparator: Comparator<T>;
}>;

/**
 * Consists of a comparison operation label and the value to compare against.
 */
type Comparator<T> = {
  operation: FilterOperation;
  value: FilterValue<T, FilterOperation>;
};

/**
 * Compare a value to a constant target value with proper type constraints.
 */
type CompareValueAgainstConstant<T> = (a: T) => boolean;
