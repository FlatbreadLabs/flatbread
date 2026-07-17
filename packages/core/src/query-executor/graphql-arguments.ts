/**
 * Generates the accepted arguments for an 'All' query on a content type.
 *
 * @param pluralType plural name of the content type
 */
export function generateArgsForAllItemQuery(
  pluralType: string
): Record<string, unknown> {
  return {
    ...skip(),
    ...limit(pluralType),
    ...order(pluralType, 'ASC'),
    ...sortBy(pluralType),
    ...filter(pluralType),
  };
}

/**
 * Generates the accepted arguments for a 'many-item' query on a content type.
 *
 * @param pluralType plural name of the content type
 */
export function generateArgsForManyItemQuery(
  pluralType: string
): Record<string, unknown> {
  return {
    ids: {
      type: '[ID]',
    },
    ...skip(),
    ...limit(pluralType),
    ...order(pluralType, 'ASC'),
    ...sortBy(pluralType),
  };
}

/**
 * Generates the accepted arguments for a 'single-item' query on a content type.
 */
export function generateArgsForSingleItemQuery(): Record<string, unknown> {
  return {
    id: {
      type: 'ID',
    },
  };
}

/**
 * Argument for skipping the first `n` items from the query results.
 */
function skip(): Record<string, unknown> {
  return {
    skip: {
      description: 'Skip the first `n` results',
      type: 'Int',
    },
  };
}

/**
 * Argument for limiting the maximum number of items in the query results.
 *
 * @param pluralType plural name of the content type
 */
function limit(pluralType: string): Record<string, unknown> {
  return {
    limit: {
      description: `The maximum number of ${pluralType} to return`,
      type: 'Int',
    },
  };
}

/**
 * Argument for ordering the direction of sorting items in the query results.
 *
 * @param pluralType plural name of the content type
 * @param defaultValue default order to use if not explicitly specified in the query
 */
function order(
  pluralType: string,
  defaultValue: 'ASC' | 'DESC' = 'ASC'
): Record<string, unknown> {
  return {
    order: {
      description: `Which order to return ${pluralType} in`,
      type: `enum Order { ASC DESC }`,
      defaultValue,
    },
  };
}

/**
 * Argument for the field to sort items by in the query.
 *
 * @param pluralType plural name of the content type
 */
function sortBy(pluralType: string): Record<string, unknown> {
  return {
    sortBy: {
      description: `The field to sort ${pluralType} by`,
      type: 'String',
    },
  };
}

/**
 * Argument for the deep filter to apply to items in the query results.
 *
 * @param pluralType plural name of the content type
 */
function filter(pluralType: string): Record<string, unknown> {
  return {
    filter: {
      description: `Filter ${pluralType} by a JSON object`,
      type: 'JSON',
    },
  };
}
