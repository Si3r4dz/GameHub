import { useState, useEffect } from 'react';
import type { Socket } from 'socket.io-client';
import { HUB_EVENTS } from '@gamehub/core';
import type { HubMode, GameHistoryEntry } from '@gamehub/core';

export interface HubPlayerClient {
  id: string;
  name: string;
  connected: boolean;
}

export interface HubState {
  hubId: string;
  mode: HubMode;
  players: HubPlayerClient[];
  activeGameId: string | null;
  gameHistory: GameHistoryEntry[];
  isHost: boolean;
}

const initialState: HubState = {
  hubId: '',
  mode: 'multiplayer',
  players: [],
  activeGameId: null,
  gameHistory: [],
  isHost: false,
};

export function useHubState(socket: Socket, hubId: string | undefined) {
  const [state, setState] = useState<HubState>(initialState);

  useEffect(() => {
    if (!hubId) return;

    const onState = (data: HubState) => {
      setState(data);
    };

    const onPlayerJoined = ({ playerId, name }: { playerId: string; name: string }) => {
      setState((prev) => ({
        ...prev,
        players: [...prev.players, { id: playerId, name, connected: true }],
      }));
    };

    const onPlayerStatus = ({ playerId, connected }: { playerId: string; connected: boolean }) => {
      setState((prev) => ({
        ...prev,
        players: prev.players.map((p) =>
          p.id === playerId ? { ...p, connected } : p,
        ),
      }));
    };

    const onPlayerRemoved = ({ playerId }: { playerId: string }) => {
      setState((prev) => ({
        ...prev,
        players: prev.players.filter((p) => p.id !== playerId),
      }));
    };

    const onGameCreated = ({ gameId, gameType, config }: { gameId: string; gameType: string; config?: Record<string, unknown> }) => {
      setState((prev) => ({ ...prev, activeGameId: gameId }));
      // Dispatch custom event so pages can react to navigation
      window.dispatchEvent(
        new CustomEvent('gamehub:hub-game-created', {
          detail: { gameId, gameType, config },
        }),
      );
    };

    const onGameFinished = ({ gameId }: { gameId: string }) => {
      setState((prev) => ({ ...prev, activeGameId: null }));
      window.dispatchEvent(
        new CustomEvent('gamehub:hub-game-finished', { detail: { gameId } }),
      );
    };

    socket.on(HUB_EVENTS.HUB_STATE, onState);
    socket.on(HUB_EVENTS.HUB_PLAYER_JOINED, onPlayerJoined);
    socket.on(HUB_EVENTS.HUB_PLAYER_STATUS, onPlayerStatus);
    socket.on(HUB_EVENTS.HUB_PLAYER_REMOVED, onPlayerRemoved);
    socket.on(HUB_EVENTS.HUB_GAME_CREATED, onGameCreated);
    socket.on(HUB_EVENTS.HUB_GAME_FINISHED, onGameFinished);

    return () => {
      socket.off(HUB_EVENTS.HUB_STATE, onState);
      socket.off(HUB_EVENTS.HUB_PLAYER_JOINED, onPlayerJoined);
      socket.off(HUB_EVENTS.HUB_PLAYER_STATUS, onPlayerStatus);
      socket.off(HUB_EVENTS.HUB_PLAYER_REMOVED, onPlayerRemoved);
      socket.off(HUB_EVENTS.HUB_GAME_CREATED, onGameCreated);
      socket.off(HUB_EVENTS.HUB_GAME_FINISHED, onGameFinished);
    };
  }, [socket, hubId]);

  return state;
}
