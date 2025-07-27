/**
 * Generates the accepted arguments for an 'All' query on a content type.
 *
 * @param pluralType plural name of the content type
 */
export const generateArgsForAllItemQuery = (pluralType: string) => ({
  ...skip(),
  ...limit(pluralType),
  ...order(pluralType, 'ASC'),
  ...sortBy(pluralType),
  ...filter(pluralType),
});

/**
 * Generates the accepted arguments for a 'many-item' query on a content type.
 *
 * @param pluralType plural name of the content type
 */
export const generateArgsForManyItemQuery = (pluralType: string) => ({
  references: {
    type: '[String]',
  },
  ...skip(),
  ...limit(pluralType),
  ...order(pluralType, 'ASC'),
  ...sortBy(pluralType),
});

/**
 * Argument for skipping the first `n` items from the query results.
 */
export const skip = () => ({
  skip: {
    description: 'Skip the first `n` results',
    type: 'Int',
  },
});

/**
 * Argument for limiting the maximum number of items in the query results.
 *
 * @param pluralType plural name of the content type
 */
export const limit = (pluralType: string) => ({
  limit: {
    description: `The maximum number of ${pluralType} to return`,
    type: 'Int',
  },
});

/**
 * Argument for ordering the direction of sorting items in the query results.
 *
 * @param pluralType plural name of the content type
 * @param defaultValue default order to use if not explicitly specified in the query
 */
export const order = (
  pluralType: string,
  defaultValue: 'ASC' | 'DESC' = 'ASC'
) => ({
  order: {
    description: `Which order to return ${pluralType} in`,
    type: `enum Order { ASC DESC }`,
    defaultValue,
  },
});

/**
 * Argument for the field to sort items by in the query results.
 *
 * @param pluralType plural name of the content type
 */
export const sortBy = (pluralType: string) => ({
  sortBy: {
    description: `The field to sort ${pluralType} by`,
    type: 'String',
  },
});

/**
 * Argument for the deep filter to apply to items in the query results.
 *
 * @param pluralType plural name of the content type
 */
export const filter = (pluralType: string) => ({
  filter: {
    description: `Filter ${pluralType} by a JSON object`,
    type: 'JSON',
  },
});
