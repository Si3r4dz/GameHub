import type { FastifyInstance } from 'fastify';
import type { Server as SocketIOServer } from 'socket.io';
import type { GameServerPlugin } from '@gamehub/core';
import type { GameStore } from '../store.js';

export function registerGameRoutes(
  app: FastifyInstance,
  store: GameStore,
  plugins: Map<string, GameServerPlugin>,
  io: SocketIOServer,
): void {
  // List available game types
  app.get('/api/game-types', async () => {
    return [...plugins.values()].map((p) => p.config);
  });

  // Create game
  app.post<{ Body: { gameType: string } }>('/api/games', async (req, reply) => {
    const { gameType } = req.body;
    const plugin = plugins.get(gameType);
    if (!plugin) {
      return reply.status(400).send({ error: 'error.unknownGameType' });
    }

    const initialState = plugin.createInitialState();
    const session = store.create(gameType, initialState);
    return { gameId: session.id, hostToken: session.hostToken };
  });

  // Join game
  app.post<{ Params: { gameId: string }; Body: { name: string } }>(
    '/api/games/:gameId/join',
    async (req, reply) => {
      const session = store.get(req.params.gameId);
      if (!session) return reply.status(404).send({ error: 'error.gameNotFound' });

      const plugin = plugins.get(session.gameType);
      const maxPlayers = plugin?.config.maxPlayers ?? 8;

      const result = store.addPlayer(req.params.gameId, req.body.name, maxPlayers);
      if ('error' in result) {
        return reply.status(400).send({ error: result.error });
      }

      // Notify room
      io.to(session.id).emit('player:joined', {
        playerIndex: result.playerIndex,
        name: req.body.name.trim(),
      });

      return {
        playerIndex: result.playerIndex,
        playerToken: result.playerToken,
        gameId: session.id,
      };
    },
  );

  // Get game state
  app.get<{ Params: { gameId: string }; Querystring: { token: string } }>(
    '/api/games/:gameId',
    async (req, reply) => {
      const session = store.get(req.params.gameId);
      if (!session) return reply.status(404).send({ error: 'error.gameNotFound' });

      const token = req.query.token;
      if (!token) return reply.status(401).send({ error: 'error.noToken' });

      const isHost = session.hostToken === token;
      const player = session.players.find((p) => p.token === token);
      if (!isHost && !player) {
        return reply.status(403).send({ error: 'error.invalidToken' });
      }

      const plugin = plugins.get(session.gameType);
      const clientState = plugin
        ? plugin.serializeForClient(
            session.gameState,
            isHost,
            player?.index ?? null,
          )
        : session.gameState;

      return {
        gameId: session.id,
        gameType: session.gameType,
        players: session.players.map((p) => ({
          index: p.index,
          name: p.name,
          connected: p.connected,
        })),
        gameState: clientState,
        isHost,
        playerIndex: player?.index ?? null,
        phase: session.phase,
      };
    },
  );
}
