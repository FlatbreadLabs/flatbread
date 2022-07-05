import { ApolloServer } from 'apollo-server-express';
import { ApolloServerPluginDrainHttpServer } from 'apollo-server-core';
import { InMemoryLRUCache } from '@apollo/utils.keyvaluecache';
import express from 'express';
import http from 'http';
import generateSchema from '@flatbread/core';
import { getConfig } from '../utils/getSchema';
import { GraphQLSchema } from 'graphql';

const config = await getConfig();
const schema = await generateSchema(config);

const port = Number(process.env.FLATBREAD_PORT) || 5050;

startApolloServer(schema, { port });

async function startApolloServer(schema: GraphQLSchema, { port = 5050 } = {}) {
  const app = express();
  const httpServer = http.createServer(app);
  const server = new ApolloServer({
    schema,
    // Prevents an unbounded cache from growing infinitely and causing memory issues.
    cache: new InMemoryLRUCache({
      // ~100MiB
      maxSize: Math.pow(2, 20) * 100,
    }),
    plugins: [
      // Apollo Server will drain your HTTP server when you call the stop() method (which is also called for you when the SIGTERM and SIGINT signals are received)
      // @see https://www.apollographql.com/docs/apollo-server/api/plugin/drain-http-server/
      ApolloServerPluginDrainHttpServer({ httpServer }),
    ],
  });
  await server.start();
  server.applyMiddleware({ app });
  await new Promise<void>((resolve) => httpServer.listen({ port }, resolve));

  communicateReadiness();
}

function communicateReadiness() {
  /**
   * If the process was spawned with an IPC channel, send a message to the parent process that the server is ready.
   * This allows the parent process to wait for the server to be ready before continuing, like when you want the GraphQL server to be ready before starting the build process.
   * @see https://nodejs.org/api/process.html#processsendmessage-sendhandle-options-callback
   */
  process.send && process.send('flatbread-gql-ready');
}
