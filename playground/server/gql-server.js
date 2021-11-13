import express from 'express';
import {
  getGraphQLParameters,
  processRequest,
  renderGraphiQL,
  sendResult,
  shouldRenderGraphiQL,
} from 'graphql-helix';
import { schema } from './schema.js';

const app = express();

app.use(express.json());

app.use('*', async (req, res) => {
  const request = {
    body: req.body,
    headers: req.headers,
    method: req.method,
    query: req.query,
  };

  if (shouldRenderGraphiQL(request)) {
    res.send(renderGraphiQL());
  } else {
    const { operationName, query, variables } = getGraphQLParameters(request);

    const result = await processRequest({
      operationName,
      query,
      variables,
      request,
      schema,
    });

    sendResult(result, res);
  }
});

const port = process.env.PORT || 5050;

app.listen(port, () => {
  const url = `http://localhost:${port}`;
  console.group();
  console.info('\n%cOyu GraphQL server\n', 'color: green');
  console.log('%cgraphql: ' + url, 'opacity: 0.5');
  console.groupEnd();
  /**
   * If the process was spawned with an IPC channel, send a message to the parent process that the server is ready.
   * This allows the parent process to wait for the server to be ready before continuing, like when you want the GraphQL server to be ready before starting the build process.
   * @see https://nodejs.org/api/process.html#processsendmessage-sendhandle-options-callback
   */
  process.send && process.send('oyu-gql-ready');
});
