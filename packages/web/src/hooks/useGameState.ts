import { useState, useEffect, useCallback, useRef } from 'react';
import type { Socket } from 'socket.io-client';
import type { Player, GamePhase, ClientGameState } from '@gamehub/core';
import { PLATFORM_EVENTS } from '@gamehub/core';

export interface GameState {
  players: Player[];
  gameState: unknown;
  gameType: string;
  isHost: boolean;
  playerIndex: number | null;
  phase: GamePhase;
}

const initialState: GameState = {
  players: [],
  gameState: null,
  gameType: '',
  isHost: false,
  playerIndex: null,
  phase: 'lobby',
};

export type PatchHandler = (state: unknown, patch: unknown) => unknown;

export function useGameState(
  socket: Socket,
  gameId: string | undefined,
  patchHandler?: PatchHandler,
) {
  const [state, setState] = useState<GameState>(initialState);
  const patchHandlerRef = useRef(patchHandler);
  patchHandlerRef.current = patchHandler;

  useEffect(() => {
    if (!gameId) return;

    const onState = (data: ClientGameState) => {
      setState({
        players: data.players,
        gameState: data.gameState,
        gameType: data.gameType,
        isHost: data.isHost,
        playerIndex: data.playerIndex,
        phase: data.phase,
      });
    };

    const onPatch = (patch: unknown) => {
      // Dispatch custom event for host flash animations
      window.dispatchEvent(
        new CustomEvent('gamehub:patch', { detail: patch }),
      );

      // Apply patch to state
      setState((prev) => {
        if (patchHandlerRef.current) {
          return {
            ...prev,
            gameState: patchHandlerRef.current(prev.gameState, patch),
          };
        }
        return prev;
      });
    };

    const onPlayerJoined = ({
      playerIndex,
      name,
    }: {
      playerIndex: number;
      name: string;
    }) => {
      setState((prev) => ({
        ...prev,
        players: [
          ...prev.players,
          { index: playerIndex, name, connected: false },
        ],
      }));
    };

    const onPlayerStatus = ({
      playerIndex,
      connected,
    }: {
      playerIndex: number;
      connected: boolean;
    }) => {
      setState((prev) => ({
        ...prev,
        players: prev.players.map((p) =>
          p.index === playerIndex ? { ...p, connected } : p,
        ),
      }));
    };

    socket.on(PLATFORM_EVENTS.GAME_STATE, onState);
    socket.on(PLATFORM_EVENTS.GAME_STATE_PATCH, onPatch);
    socket.on(PLATFORM_EVENTS.PLAYER_JOINED, onPlayerJoined);
    socket.on(PLATFORM_EVENTS.PLAYER_STATUS, onPlayerStatus);

    return () => {
      socket.off(PLATFORM_EVENTS.GAME_STATE, onState);
      socket.off(PLATFORM_EVENTS.GAME_STATE_PATCH, onPatch);
      socket.off(PLATFORM_EVENTS.PLAYER_JOINED, onPlayerJoined);
      socket.off(PLATFORM_EVENTS.PLAYER_STATUS, onPlayerStatus);
    };
  }, [socket, gameId]);

  const sendAction = useCallback(
    (action: string, payload: unknown) => {
      socket.emit(PLATFORM_EVENTS.GAME_ACTION, { action, payload });

      // Optimistic local update — apply the same patch locally
      // so the acting client sees sums/badges update immediately
      if (patchHandlerRef.current) {
        let patch: unknown = null;
        if (action === 'score:update') {
          const p = payload as { category: string; playerIndex: number; value: string };
          patch = { type: 'score:changed', ...p };
        } else if (action === 'game:reset') {
          patch = { type: 'reset' };
        } else if (action === 'answer') {
          patch = { type: 'quiz:my-answer', ...(payload as Record<string, unknown>) };
        }
        if (patch) {
          setState((prev) => ({
            ...prev,
            gameState: patchHandlerRef.current!(prev.gameState, patch),
          }));
        }
      }
    },
    [socket],
  );

  return { ...state, sendAction };
}
