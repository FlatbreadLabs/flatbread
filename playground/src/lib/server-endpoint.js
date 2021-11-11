import {
  getGraphQLParameters,
  processRequest,
  renderGraphiQL,
  shouldRenderGraphiQL,
} from 'graphql-helix';
import { createSchema, defaultQuery } from './schema';
const schemaPromise = createSchema();
const respond = async (request) => {
  // Workaround for a bug with body parsing in SvelteKit
  if (typeof request.body === 'string') request.body = JSON.parse(request.body);
  if (shouldRenderGraphiQL(request))
    return {
      body: renderGraphiQL({
        defaultQuery,
      }),
      headers: { 'Content-Type': 'text/html' },
      status: 200,
    };
  const parameters = getGraphQLParameters(request);
  const result = await processRequest({
    ...parameters,
    // For example, auth information is put in context for the resolver
    contextFactory: () => ({
      authorization:
        request.headers['Authorization'] ?? request.headers['authorization'],
    }),
    request,
    schema: await schemaPromise,
  });
  if (result.type === 'RESPONSE') {
    const headers = {};
    for (const { name, value } of result.headers) {
      headers[name] = value;
    }
    return {
      body: result.payload,
      headers,
      status: result.status,
    };
  }
  return {
    // Think you could help? https://github.com/svelte-add/graphql/issues/1
    body: "svelte-add/graphql doesn't support multipart responses or event streams",
    headers: {},
    status: 501,
  };
};
export const del = ({ body, headers, query }) =>
  respond({ body, headers, method: 'DELETE', query });
export const get = ({ body, headers, query }) =>
  respond({ body, headers, method: 'GET', query });
export const head = ({ body, headers, query }) =>
  respond({ body, headers, method: 'HEAD', query });
export const post = ({ body, headers, query }) =>
  respond({ body, headers, method: 'POST', query });
export const put = ({ body, headers, query }) =>
  respond({ body, headers, method: 'PUT', query });
export default {
  del,
  get,
  head,
  post,
  put,
};
//# sourceMappingURL=server-endpoint.js.map
