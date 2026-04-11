import type { FastifyInstance } from 'fastify';
import type { Server as SocketIOServer } from 'socket.io';
import type { GameServerPlugin, HubMode } from '@gamehub/core';
import { HUB_EVENTS } from '@gamehub/core';
import type { HubStore } from '../hub-store.js';
import type { GameStore } from '../store.js';

export function registerHubRoutes(
  app: FastifyInstance,
  hubStore: HubStore,
  gameStore: GameStore,
  plugins: Map<string, GameServerPlugin>,
  io: SocketIOServer,
): void {
  // Create hub
  app.post<{ Body: { mode?: HubMode } }>('/api/hub', async (req) => {
    const mode = req.body?.mode ?? 'multiplayer';
    const hub = hubStore.create(mode);
    return { hubId: hub.id, hostToken: hub.hostToken };
  });

  // Join hub (player enters name)
  app.post<{ Params: { hubId: string }; Body: { name: string } }>(
    '/api/hub/:hubId/join',
    async (req, reply) => {
      const hub = hubStore.get(req.params.hubId);
      if (!hub) return reply.status(404).send({ error: 'error.hubNotFound' });

      const result = hubStore.addPlayer(req.params.hubId, req.body.name);
      if ('error' in result) {
        return reply.status(400).send({ error: result.error });
      }

      // Notify hub room
      io.to(`hub:${hub.id}`).emit(HUB_EVENTS.HUB_PLAYER_JOINED, {
        playerId: result.playerId,
        name: req.body.name.trim(),
      });

      return {
        playerId: result.playerId,
        playerToken: result.playerToken,
        hubId: hub.id,
      };
    },
  );

  // Remove player from hub
  app.delete<{ Params: { hubId: string; playerId: string }; Querystring: { token: string } }>(
    '/api/hub/:hubId/players/:playerId',
    async (req, reply) => {
      const hub = hubStore.get(req.params.hubId);
      if (!hub) return reply.status(404).send({ error: 'error.hubNotFound' });
      if (hub.hostToken !== req.query.token) {
        return reply.status(403).send({ error: 'error.hostOnlyRemove' });
      }

      const removed = hubStore.removePlayer(req.params.hubId, req.params.playerId);
      if (!removed) return reply.status(404).send({ error: 'error.playerNotFound' });

      io.to(`hub:${hub.id}`).emit(HUB_EVENTS.HUB_PLAYER_REMOVED, {
        playerId: req.params.playerId,
      });

      return { ok: true };
    },
  );

  // Get hub state
  app.get<{ Params: { hubId: string }; Querystring: { token: string } }>(
    '/api/hub/:hubId',
    async (req, reply) => {
      const hub = hubStore.get(req.params.hubId);
      if (!hub) return reply.status(404).send({ error: 'error.hubNotFound' });

      const token = req.query.token;
      if (!token) return reply.status(401).send({ error: 'error.noToken' });

      const isHost = hub.hostToken === token;
      const player = hub.players.find((p) => p.token === token);
      if (!isHost && !player) {
        return reply.status(403).send({ error: 'error.invalidToken' });
      }

      return {
        hubId: hub.id,
        mode: hub.mode,
        players: hub.players.map((p) => ({
          id: p.id,
          name: p.name,
          connected: p.connected,
        })),
        activeGameId: hub.activeGameId,
        gameHistory: hub.gameHistory,
        isHost,
      };
    },
  );

  // Create game from hub
  app.post<{
    Params: { hubId: string };
    Body: { gameType: string; playerIds?: string[]; config?: Record<string, unknown> };
  }>(
    '/api/hub/:hubId/games',
    async (req, reply) => {
      const hub = hubStore.get(req.params.hubId);
      if (!hub) return reply.status(404).send({ error: 'error.hubNotFound' });

      // Auth: must be host
      const token = req.headers['x-hub-token'] as string | undefined;
      if (token !== hub.hostToken) {
        return reply.status(403).send({ error: 'error.hostOnlyCreate' });
      }

      const { gameType, playerIds, config } = req.body;
      const plugin = plugins.get(gameType);
      if (!plugin) {
        return reply.status(400).send({ error: 'error.unknownGameType' });
      }

      if (hub.activeGameId) {
        return reply.status(400).send({ error: 'error.gameInProgress' });
      }

      // Select which hub players participate (default: all)
      const selectedPlayers = playerIds
        ? hub.players.filter((p) => playerIds.includes(p.id))
        : hub.players;

      if (selectedPlayers.length === 0) {
        return reply.status(400).send({ error: 'error.noPlayers' });
      }

      const initialState = plugin.createInitialState();
      const session = gameStore.createFromHub(
        gameType,
        initialState,
        hub.id,
        selectedPlayers.map((p) => ({ name: p.name, token: p.token })),
        hub.hostToken,
      );

      // Auto-start the game (skip lobby)
      if (plugin.onGameStart) {
        plugin.onGameStart(config ?? {}, session);
      }
      session.phase = 'playing';

      hubStore.setActiveGame(hub.id, session.id);

      // Start tick if plugin uses it (timers, auto-advance)
      // Note: tick is started when host connects via game:connect in socket.ts

      // Notify hub room — everyone navigates to the game
      io.to(`hub:${hub.id}`).emit(HUB_EVENTS.HUB_GAME_CREATED, {
        gameId: session.id,
        gameType,
        config: config ?? {},
      });

      return { gameId: session.id };
    },
  );
}
