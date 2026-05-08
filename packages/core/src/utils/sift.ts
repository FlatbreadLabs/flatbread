import { EntryNode } from '../types';
import { get } from 'lodash-es';
import deepEntries from './deepEntries';
import reduceBooleans from './reduceBooleans';
import { isMatch as isWildcardMatch } from 'matcher';
import { normalizeIdentifier } from './ids';

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
      const comparisonNeedle = shouldNormalizeIdComparator(path, comparator)
        ? normalizeSiftId(needle, 'filter id value', true)
        : needle;
      const comparisonComparator = shouldNormalizeIdComparator(path, comparator)
        ? normalizeIdComparator(comparator)
        : comparator;
      // Compare the value of interest to the target value, and store the result of the evaluated expression.
      evaluatedFilterSet.push(
        generateComparisonFunction(comparisonComparator)(comparisonNeedle)
      );
    }

    // Combine the filter set results with the union operation.
    return reduceBooleans(evaluatedFilterSet, 'and');
  };
};
export default createFilterFunction;

function normalizeSiftId(
  value: unknown,
  context: string,
  allowMissing = false
): unknown {
  if (allowMissing && (value === null || value === undefined)) {
    return value;
  }

  return normalizeIdentifier(value, context);
}

function normalizeIdComparator(comparator: Comparator): Comparator {
  const { operation, value } = comparator;

  if (operation === 'exists' || operation === 'strictlyExists') {
    return comparator;
  }

  if (Array.isArray(value)) {
    return {
      operation,
      value: value.map((item) =>
        normalizeSiftId(item, `filter id comparator "${operation}"`)
      ),
    };
  }

  return {
    operation,
    value: normalizeSiftId(value, `filter id comparator "${operation}"`),
  };
}

function assertArrayComparator(
  value: unknown,
  operation: ComparatorOperation
): readonly unknown[] {
  if (!Array.isArray(value)) {
    throw new Error(`Comparator "${operation}" requires an array value.`);
  }

  return value;
}

function assertRegExpComparator(
  value: unknown,
  operation: ComparatorOperation
): RegExp {
  if (!(value instanceof RegExp)) {
    throw new Error(`Comparator "${operation}" requires a RegExp value.`);
  }

  return value;
}

function assertStringComparator(
  value: unknown,
  operation: ComparatorOperation
): string {
  if (typeof value !== 'string') {
    throw new Error(`Comparator "${operation}" requires a string value.`);
  }

  return value;
}

function includesValue(
  source: unknown,
  value: unknown,
  operation: ComparatorOperation
): boolean {
  if (Array.isArray(source)) {
    return source.includes(value);
  }

  if (typeof source === 'string') {
    return source.includes(assertStringComparator(value, operation));
  }

  throw new Error(
    `Comparator "${operation}" requires an array or string field.`
  );
}

function matchesRegExp(source: unknown, value: RegExp): boolean {
  if (typeof source === 'string') {
    return value.test(source);
  }

  if (Array.isArray(source)) {
    return source.some((item) => typeof item === 'string' && value.test(item));
  }

  throw new Error('Comparator "regex" requires an array or string field.');
}

function matchesWildcard(source: unknown, value: string): boolean {
  if (typeof source === 'string') {
    return isWildcardMatch(source, value);
  }

  if (Array.isArray(source)) {
    return source.some(
      (item) => typeof item === 'string' && isWildcardMatch(item, value)
    );
  }

  throw new Error('Comparator "wildcard" requires an array or string field.');
}

function shouldNormalizeIdComparator(
  path: string[],
  comparator: Comparator
): boolean {
  if (path.length !== 1 || path[0] !== 'id') {
    return false;
  }

  return ['eq', 'ne', 'in', 'nin'].includes(comparator.operation);
}

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
      return (a: unknown) => a === value;
    case 'ne':
      return (a: unknown) => a !== value;
    case 'lt':
      return (a: unknown) =>
        (a as string | number | boolean) < (value as string | number | boolean);
    case 'lte':
      return (a: unknown) =>
        (a as string | number | boolean) <=
        (value as string | number | boolean);
    case 'gt':
      return (a: unknown) =>
        (a as string | number | boolean) > (value as string | number | boolean);
    case 'gte':
      return (a: unknown) =>
        (a as string | number | boolean) >=
        (value as string | number | boolean);
    case 'in':
      return (a: unknown) =>
        (value as { includes: (item: unknown) => boolean }).includes(a);
    case 'nin':
      return (a: unknown) =>
        !(value as { includes: (item: unknown) => boolean }).includes(a);
    case 'includes':
      return (a: unknown) =>
        (a as { includes: (item: unknown) => boolean }).includes(value);
    case 'excludes':
      return (a: unknown) =>
        !(a as { includes: (item: unknown) => boolean }).includes(value);
    case 'regex':
      return (a: unknown) =>
        (value as { test: (item: unknown) => boolean }).test(a);
    case 'wildcard':
      return (a: unknown) =>
        isWildcardMatch(
          a as string | readonly string[],
          value as string | readonly string[]
        );
    case 'exists':
      return (a: unknown) => (value ? a != undefined : a == undefined);
    case 'strictlyExists':
      return (a: unknown) => (value ? a !== undefined : a === undefined);
    default:
      throw new Error(`Unsupported operation: ${operation}`);
  }
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
    if (!isComparatorOperation(operation)) {
      throw new Error(`Unsupported operation: ${String(operation)}`);
    }

    return {
      path,
      comparator: {
        operation,
        value,
      },
    };
  });
};

function isComparatorOperation(
  operation: unknown
): operation is ComparatorOperation {
  return (
    typeof operation === 'string' &&
    [
      'eq',
      'ne',
      'lt',
      'lte',
      'gt',
      'gte',
      'in',
      'nin',
      'includes',
      'excludes',
      'regex',
      'wildcard',
      'exists',
      'strictlyExists',
    ].includes(operation)
  );
}

/**
 * The filter argument object using a MongoDB-like syntax, inspired by how Gatsby does it.
 *
 * @see [Gatsby's query filters](https://github.com/gatsbyjs/gatsby/blob/d56c1f12ad2b3e7fa245f4ff9a74e81d0585b79e/docs/docs/query-filters.md) for API details.
 */
type SiftArgs = Record<string, unknown>;

/**
 * An array of target and comparator objects
 */
export type TargetAndComparator = { path: string[]; comparator: Comparator }[];

/**
 * Consists of a comparison operation label and the value to compare against.
 */
type Comparator = {
  operation: ComparatorOperation;
  value: unknown;
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
type CompareValueAgainstConstant = (a: unknown) => boolean;

type Comparable = string | number | boolean;

function compareComparable(
  left: unknown,
  right: unknown,
  compare: (left: Comparable, right: Comparable) => boolean
): boolean {
  if (!isComparable(left) || !isComparable(right)) {
    throw new Error('Ordered comparators require comparable primitive values.');
  }

  if (typeof left !== typeof right) {
    throw new Error('Ordered comparators require matching value types.');
  }

  return compare(left, right);
}

function isComparable(value: unknown): value is Comparable {
  return (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  );
}
