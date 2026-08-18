import type { TypedDocumentNode } from '@graphql-typed-document-node/core';
import { print } from 'graphql';

/**
 * Read from the Flatbread GraphQL server.
 *
 * The server only runs while the site is being built. `next build` reads every
 * record through here, writes plain files, and the server shuts down with the
 * build, so nothing calls this at run time.
 */
const graphqlOrigin =
  process.env.FLATBREAD_GRAPHQL_ENDPOINT ?? 'http://localhost:5057/graphql';

/**
 * A build reads each record once and writes the answer into the page, so the
 * fetch must be cacheable — an uncached fetch makes the route dynamic, and a
 * dynamic route cannot be exported as a file.
 *
 * Next writes those answers under `.next/cache/fetch-cache`, and that
 * directory outlives the build. The request URL carries a stamp computed once
 * when this module loads, so a new build never reads an older build's answers,
 * while identical queries within one build still hit the cache.
 *
 * `flatbread start --watch` is the opposite case: the point of the dev server
 * is that a saved file shows up straight away, so nothing is cached there. The
 * stamp goes on either way, since a `no-store` fetch ignores it.
 */
const endpoint = new URL(graphqlOrigin);
endpoint.searchParams.set('build', Date.now().toString(36));

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

  let result: GraphQLResponse<TData> | undefined;
  try {
    result = (await response.json()) as GraphQLResponse<TData>;
  } catch {
    // Some transport failures have an empty or non-JSON body. Keep the useful
    // status and endpoint in that case instead of replacing them with a JSON
    // parse error.
  }

  if (result?.errors?.length) {
    const details = result.errors.map((error) => error.message).join('\n');
    const status = response.ok
      ? ''
      : `Flatbread answered ${response.status} for a query:\n`;
    throw new Error(`${status}${details}`);
  }

  if (!response.ok) {
    throw new Error(
      `Flatbread answered ${response.status} for a query. Is \`flatbread start\` running on ${graphqlOrigin}?`
    );
  }

  if (!result?.data) {
    throw new Error('Flatbread returned no data.');
  }

  return result.data;
}
