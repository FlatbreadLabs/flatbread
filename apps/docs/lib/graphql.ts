import type { TypedDocumentNode } from '@graphql-typed-document-node/core';
import { print } from 'graphql';

/**
 * Read from the Flatbread GraphQL server.
 *
 * The server only runs while the site is being built. `next build` reads every
 * record through here, writes plain files, and the server shuts down with the
 * build, so nothing calls this at run time.
 */
const endpoint =
  process.env.FLATBREAD_GRAPHQL_ENDPOINT ?? 'http://localhost:5057/graphql';

/**
 * A build reads each record once and writes the answer into the page, so the
 * fetch must be cacheable — an uncached fetch makes the route dynamic, and a
 * dynamic route cannot be exported as a file.
 *
 * `flatbread start --watch` is the opposite case: the point of the dev server
 * is that a saved file shows up straight away, so nothing is cached there.
 */
const cache: RequestCache =
  process.env.NODE_ENV === 'production' ? 'force-cache' : 'no-store';

interface GraphQLResponse<TData> {
  data?: TData;
  errors?: Array<{ message: string }>;
}

export async function query<TData, TVariables>(
  document: TypedDocumentNode<TData, TVariables>,
  ...[variables]: TVariables extends Record<string, never>
    ? [variables?: TVariables]
    : [variables: TVariables]
): Promise<TData> {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: print(document), variables }),
    cache,
  });

  if (!response.ok) {
    throw new Error(
      `Flatbread answered ${response.status} for a query. Is \`flatbread start\` running on ${endpoint}?`
    );
  }

  const result = (await response.json()) as GraphQLResponse<TData>;

  if (result.errors?.length) {
    throw new Error(result.errors.map((error) => error.message).join('\n'));
  }

  if (!result.data) {
    throw new Error('Flatbread returned no data.');
  }

  return result.data;
}
