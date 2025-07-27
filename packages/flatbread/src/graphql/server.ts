import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@as-integrations/express5';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import { InMemoryLRUCache } from '@apollo/utils.keyvaluecache';
import express from 'express';
import http from 'http';
import cors from 'cors';
import { generateSchema } from '@flatbread/core';
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

  // Add headers for private network access and other CORS requirements BEFORE other middleware
  app.use((req, res, next) => {
    // Required for Apollo Studio and other public sites accessing localhost
    res.header('Access-Control-Allow-Private-Network', 'true');
    // Set origin to the requesting origin (required when credentials are true)
    const origin = req.headers.origin || req.headers.referer || '*';
    res.header('Access-Control-Allow-Origin', origin);
    res.header(
      'Access-Control-Allow-Methods',
      'GET, POST, PUT, DELETE, OPTIONS'
    );
    res.header(
      'Access-Control-Allow-Headers',
      'Origin, X-Requested-With, Content-Type, Accept, Authorization, apollo-require-preflight'
    );
    res.header('Access-Control-Allow-Credentials', 'true');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      res.status(204).send();
      return;
    }

    next();
  });

  // Enable CORS for all routes
  app.use(
    cors({
      origin: true, // Allow all origins for development
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: [
        'Origin',
        'X-Requested-With',
        'Content-Type',
        'Accept',
        'Authorization',
        'apollo-require-preflight',
      ],
      preflightContinue: false,
      optionsSuccessStatus: 204,
    }),
    express.json(),
    expressMiddleware(server)
  );

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
