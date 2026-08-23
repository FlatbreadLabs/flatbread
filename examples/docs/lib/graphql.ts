/**
 * GraphQL client utilities for the Flatbread docs site.
 */

export interface GraphQLResponse<T = unknown> {
  data?: T;
  errors?: Array<{
    message: string;
    locations?: Array<{
      line: number;
      column: number;
    }>;
    path?: Array<string | number>;
  }>;
}

/**
 * Fetch data from the Flatbread GraphQL server. The endpoint defaults to the
 * port `flatbread start` listens on (5057).
 */
export async function graphqlFetch<T = unknown>(
  query: string,
  variables?: Record<string, unknown>,
  endpoint: string = 'http://localhost:5057/graphql'
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    signal: controller.signal,
    body: JSON.stringify({
      query,
      variables,
    }),
  }).finally(() => clearTimeout(timeout));

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const result: GraphQLResponse<T> = await response.json();

  if (result.errors) {
    throw new Error(result.errors.map((error) => error.message).join('\n'));
  }

  if (!result.data) {
    throw new Error('No data returned from GraphQL query');
  }

  return result.data;
}
