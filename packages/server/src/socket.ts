import type { Server as SocketIOServer, Socket } from 'socket.io';
import type { GameServerPlugin, GameActionContext } from '@gamehub/core';
import { PLATFORM_EVENTS, HUB_EVENTS } from '@gamehub/core';
import type { GameStore } from './store.js';
import type { HubStore } from './hub-store.js';

function serializePlayers(
  players: Array<{ index: number; name: string; connected: boolean }>,
) {
  return players.map((p) => ({
    index: p.index,
    name: p.name,
    connected: p.connected,
  }));
}

export function createSocketHandler(
  io: SocketIOServer,
  store: GameStore,
  hubStore: HubStore,
  plugins: Map<string, GameServerPlugin>,
): void {
  // Tick intervals for games that use onTick (timers, auto-advance)
  const tickIntervals = new Map<string, ReturnType<typeof setInterval>>();

  function startTick(gameId: string, plugin: GameServerPlugin) {
    if (!plugin.onTick || tickIntervals.has(gameId)) return;
    const interval = setInterval(() => {
      const session = store.get(gameId);
      if (!session || session.phase === 'finished') {
        clearInterval(interval);
        tickIntervals.delete(gameId);
        return;
      }
      const needsRefresh = plugin.onTick!(session, (event, data) => io.to(gameId).emit(event, data));
      if (needsRefresh) {
        sendStateToRoom(io, session, plugin);
      }
      // onTick may have caused game to finish (plugin sets session.phase directly)
      if ((session.phase as string) === 'finished') {
        stopTick(gameId);
        notifyHubGameFinished(io, hubStore, session, plugins);
      }
    }, 1000);
    tickIntervals.set(gameId, interval);
  }

  function stopTick(gameId: string) {
    const interval = tickIntervals.get(gameId);
    if (interval) {
      clearInterval(interval);
      tickIntervals.delete(gameId);
    }
  }

  io.on('connection', (socket: Socket) => {
    // --- Hub connection ---
    socket.on(
      HUB_EVENTS.HUB_CONNECT,
      ({ hubId, token }: { hubId: string; token: string }) => {
        const hub = hubStore.get(hubId);
        if (!hub) {
          return socket.emit(HUB_EVENTS.HUB_ERROR, { error: 'Hub nie istnieje' });
        }

        const isHost = hub.hostToken === token;
        const player = hub.players.find((p) => p.token === token);

        if (!isHost && !player) {
          return socket.emit(HUB_EVENTS.HUB_ERROR, { error: 'Nieprawidłowy token' });
        }

        const hubRoom = `hub:${hubId}`;
        socket.join(hubRoom);
        socket.data.hubId = hubId;
        socket.data.hubToken = token;

        if (isHost) {
          hub.hostSocketId = socket.id;
          hub.hostConnected = true;
        } else if (player) {
          player.socketId = socket.id;
          player.connected = true;
          io.to(hubRoom).emit(HUB_EVENTS.HUB_PLAYER_STATUS, {
            playerId: player.id,
            connected: true,
          });
        }

        // Send full hub state
        socket.emit(HUB_EVENTS.HUB_STATE, {
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
        });
      },
    );

    // --- Game connection ---
    socket.on(
      PLATFORM_EVENTS.GAME_CONNECT,
      ({ gameId, token }: { gameId: string; token: string }) => {
        const session = store.get(gameId);
        if (!session) {
          return socket.emit(PLATFORM_EVENTS.GAME_ERROR, {
            error: 'Gra nie istnieje',
          });
        }

        const isHost = session.hostToken === token;
        const player = session.players.find((p) => p.token === token);

        if (!isHost && !player) {
          return socket.emit(PLATFORM_EVENTS.GAME_ERROR, {
            error: 'Nieprawidłowy token',
          });
        }

        // Leave any previous game rooms (but keep hub room)
        for (const room of socket.rooms) {
          if (room !== socket.id && !room.startsWith('hub:')) {
            socket.leave(room);
          }
        }

        socket.join(gameId);
        socket.data.gameId = gameId;
        socket.data.token = token;
        socket.data.isHost = isHost;
        socket.data.playerIndex = player?.index ?? null;

        if (isHost) {
          session.hostSocketId = socket.id;
          session.hostConnected = true;
        } else if (player) {
          player.socketId = socket.id;
          player.connected = true;
          io.to(gameId).emit(PLATFORM_EVENTS.PLAYER_STATUS, {
            playerIndex: player.index,
            connected: true,
          });
        }

        // Send full state with correct identity
        const plugin = plugins.get(session.gameType);
        const clientState = plugin
          ? plugin.serializeForClient(
              session.gameState,
              isHost,
              player?.index ?? null,
            )
          : session.gameState;

        socket.emit(PLATFORM_EVENTS.GAME_STATE, {
          gameId: session.id,
          gameType: session.gameType,
          players: serializePlayers(session.players),
          gameState: clientState,
          isHost,
          playerIndex: player?.index ?? null,
          phase: session.phase,
        });

        // Start tick if game is already playing (e.g., hub-created game)
        if (session.phase === 'playing' && plugin?.onTick) {
          startTick(gameId, plugin);
        }
      },
    );

    socket.on(
      PLATFORM_EVENTS.GAME_ACTION,
      ({ action, payload }: { action: string; payload: unknown }) => {
        const { gameId, isHost, playerIndex } = socket.data as {
          gameId: string;
          token: string;
          isHost: boolean;
          playerIndex: number | null;
        };
        if (!gameId) return;

        const session = store.get(gameId);
        if (!session) return;

        const plugin = plugins.get(session.gameType);

        // Platform-level: start game
        if (action === 'start' && isHost) {
          // Let plugin configure itself from start payload
          if (plugin?.onGameStart) {
            plugin.onGameStart(payload, session);
          }
          store.setPhase(gameId, 'playing');
          if (plugin) startTick(gameId, plugin);
          sendStateToRoom(io, session, plugin);
          return;
        }

        // Platform-level: finish game
        if (action === 'finish-game' && isHost) {
          store.setPhase(gameId, 'finished');
          stopTick(gameId);
          sendStateToRoom(io, session, plugin);
          notifyHubGameFinished(io, hubStore, session, plugins);
          return;
        }

        // Platform-level: remove player
        if (action === 'remove-player' && isHost) {
          const { playerIndex: targetIdx } = payload as {
            playerIndex: number;
          };
          const targetPlayer = session.players[targetIdx];
          if (!targetPlayer) return;

          if (targetPlayer.socketId) {
            const targetSocket = io.sockets.sockets.get(
              targetPlayer.socketId,
            );
            if (targetSocket) targetSocket.disconnect(true);
          }

          store.removePlayer(
            gameId,
            targetIdx,
            plugin?.reindexState?.bind(plugin),
          );

          // Update playerIndex on remaining sockets in the room
          const room = io.sockets.adapter.rooms.get(gameId);
          if (room) {
            for (const sid of room) {
              const sock = io.sockets.sockets.get(sid);
              if (!sock || sock.data.isHost) continue;
              const pi = sock.data.playerIndex as number | null;
              if (pi !== null && pi > targetIdx) {
                sock.data.playerIndex = pi - 1;
              } else if (pi === targetIdx) {
                // This socket's player was removed — will be disconnected above
                sock.data.playerIndex = null;
              }
            }
          }

          sendStateToRoom(io, session, plugin);
          return;
        }

        // Game-specific actions that need full state refresh after
        const needsFullRefresh =
          action === 'next-round' ||
          action === 'start-quiz' ||
          action === 'skip-question' ||
          action === 'next-question' ||
          action === 'configure';

        // Game-specific validation (blocks before handleAction)
        if (plugin?.validateAction) {
          const err = plugin.validateAction(
            action,
            payload,
            session,
            playerIndex,
            isHost,
          );
          if (err) {
            socket.emit(PLATFORM_EVENTS.GAME_ERROR, { error: err });
            return;
          }
        }

        // Delegate to plugin's handleAction
        if (plugin) {
          const ctx: GameActionContext = {
            session,
            updateState: (mutator) => {
              store.updateGameState(gameId, mutator);
            },
            broadcastToRoom: (event, data) => io.to(gameId).emit(event, data),
            broadcastToOthers: (event, data) =>
              socket.to(gameId).emit(event, data),
            isHost,
            playerIndex,
          };
          const phaseBefore = (session.gameState as Record<string, unknown>)?.phase;
          plugin.handleAction(ctx, action, payload);
          const phaseAfter = (session.gameState as Record<string, unknown>)?.phase;

          // Send full state to all clients after actions that change phase or structure
          if (needsFullRefresh || phaseBefore !== phaseAfter) {
            sendStateToRoom(io, session, plugin);
          }

          // If game just finished (plugin set session.phase), notify hub
          if (session.phase === 'finished') {
            stopTick(gameId);
            notifyHubGameFinished(io, hubStore, session, plugins);
          }
        }
      },
    );

    socket.on('disconnect', () => {
      // Game disconnect
      const { gameId, token } = socket.data as {
        gameId?: string;
        token?: string;
      };
      if (gameId) {
        const session = store.get(gameId);
        if (session) {
          if (session.hostToken === token) {
            if (session.hostSocketId === socket.id) {
              session.hostSocketId = null;
              session.hostConnected = false;
            }
          } else {
            const player = session.players.find((p) => p.token === token);
            if (player && player.socketId === socket.id) {
              player.socketId = null;
              player.connected = false;
              io.to(gameId).emit(PLATFORM_EVENTS.PLAYER_STATUS, {
                playerIndex: player.index,
                connected: false,
              });
            }
          }
        }
      }

      // Hub disconnect
      const { hubId, hubToken } = socket.data as {
        hubId?: string;
        hubToken?: string;
      };
      if (hubId) {
        const hub = hubStore.get(hubId);
        if (hub) {
          if (hub.hostToken === hubToken) {
            if (hub.hostSocketId === socket.id) {
              hub.hostSocketId = null;
              hub.hostConnected = false;
            }
          } else {
            const player = hub.players.find((p) => p.token === hubToken);
            if (player && player.socketId === socket.id) {
              player.socketId = null;
              player.connected = false;
              io.to(`hub:${hubId}`).emit(HUB_EVENTS.HUB_PLAYER_STATUS, {
                playerId: player.id,
                connected: false,
              });
            }
          }
        }
      }
    });
  });
}

/** Notify hub that a game finished and clear activeGameId */
function notifyHubGameFinished(
  io: SocketIOServer,
  hubStore: HubStore,
  session: { hubId?: string; id: string; gameType: string; players: Array<{ name: string }> },
  plugins: Map<string, GameServerPlugin>,
): void {
  if (!session.hubId) return;
  const hub = hubStore.get(session.hubId);
  if (!hub) return;

  hubStore.setActiveGame(session.hubId, null);
  const plugin = plugins.get(session.gameType);
  hubStore.addToHistory(session.hubId, {
    gameId: session.id,
    gameType: session.gameType,
    gameName: plugin?.config.name ?? session.gameType,
    finishedAt: new Date(),
    playerNames: session.players.map((p) => p.name),
  });

  io.to(`hub:${session.hubId}`).emit(HUB_EVENTS.HUB_GAME_FINISHED, {
    gameId: session.id,
  });
}

/** Send correct per-socket state to every socket in the room */
function sendStateToRoom(
  io: SocketIOServer,
  session: ReturnType<GameStore['get']> & object,
  plugin: GameServerPlugin | undefined,
): void {
  const room = io.sockets.adapter.rooms.get(session.id);
  if (!room) return;

  for (const socketId of room) {
    const sock = io.sockets.sockets.get(socketId);
    if (!sock) continue;

    const sockIsHost = sock.data.isHost as boolean;
    const sockPlayerIndex = sock.data.playerIndex as number | null;

    const clientState = plugin
      ? plugin.serializeForClient(
          session.gameState,
          sockIsHost,
          sockPlayerIndex,
        )
      : session.gameState;

    sock.emit(PLATFORM_EVENTS.GAME_STATE, {
      gameId: session.id,
      gameType: session.gameType,
      players: serializePlayers(session.players),
      gameState: clientState,
      isHost: sockIsHost,
      playerIndex: sockPlayerIndex,
      phase: session.phase,
    });
  }
}
