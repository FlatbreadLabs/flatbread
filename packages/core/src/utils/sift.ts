import sift from 'sift';
import { cloneDeep } from 'lodash-es';

/**
 * Return a callable sift function that can be used to filter an array of objects with the given filter args transformed into a sift-compatible form.
 */
export default (filterArgs: SiftArgs) => {
  let mutableFilterArgs = cloneDeep(filterArgs);
  // Transform the filterArgs into a format that sift can understand
  recursiveReplace(mutableFilterArgs);
  return sift(mutableFilterArgs);
};

/**
 * Recursively replace GQL-compatible filter args with their sift-compatible analog.
 * @param filterArgs
 */
const recursiveReplace = (filterArgs: SiftArgs) => {
  const replacementKeySet = Object.keys(replacements);

  Object.entries(filterArgs).forEach(([key, value]) => {
    if (replacementKeySet.includes(key)) {
      // Rename the key
      filterArgs[replacements[key as keyof Replacements]] = value;
      // Delete the old key
      delete filterArgs[key];
    }
    if (value && typeof value === 'object') {
      recursiveReplace(value);
    }
  });
};

/**
 * A map of keys to replace in the filter args.
 */
const replacements: Replacements = {
  eq: '$eq',
  ne: '$ne',
  regex: '$regex',
  in: '$in',
  nin: '$nin',
  gt: '$gt',
  gte: '$gte',
  lt: '$lt',
  lte: '$lte',
  elmMatch: '$elmMatch',
  size: '$size',
};

type SiftArgs = Record<string, any>;
interface Replacements {
  eq: string;
  ne: string;
  regex: string;
  in: string;
  nin: string;
  gt: string;
  gte: string;
  lt: string;
  lte: string;
  elmMatch: string;
  size: string;
}
