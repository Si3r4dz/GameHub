import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import { Server as SocketIOServer } from 'socket.io';
import { createServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { GameStore } from './store.js';
import { HubStore } from './hub-store.js';
import { loadPlugins } from './plugin-loader.js';
import { registerGameRoutes } from './routes/games.js';
import { registerHubRoutes } from './routes/hub.js';
import { registerServerInfoRoutes } from './routes/server-info.js';
import { createSocketHandler } from './socket.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function createApp(port: number) {
  const fastify = Fastify({
    logger: true,
    serverFactory: (handler) => {
      const server = createServer(handler);
      return server;
    },
  });

  const store = new GameStore();
  const hubStore = new HubStore();
  const plugins = await loadPlugins();

  console.log(
    `Loaded game plugins: ${[...plugins.keys()].join(', ') || '(none)'}`,
  );

  // Socket.io on the same HTTP server
  const io = new SocketIOServer(fastify.server, {
    cors: { origin: '*' },
  });

  // Static files — serve Vite build output in production
  const webDistPath = path.resolve(__dirname, '../../web/dist');
  const { existsSync } = await import('fs');
  if (existsSync(webDistPath)) {
    await fastify.register(fastifyStatic, {
      root: webDistPath,
      wildcard: false,
    });
  } else {
    console.warn(`Static dir not found: ${webDistPath} — skipping (use Vite dev server)`);
  }

  // REST routes
  registerServerInfoRoutes(fastify, port);
  registerGameRoutes(fastify, store, plugins, io);
  registerHubRoutes(fastify, hubStore, store, plugins, io);

  // SPA fallback — serve index.html for client-side routes (only in production)
  if (existsSync(webDistPath)) {
    fastify.setNotFoundHandler(async (_req, reply) => {
      return reply.sendFile('index.html');
    });
  }

  // Socket.io handlers
  createSocketHandler(io, store, hubStore, plugins);

  return fastify;
}
