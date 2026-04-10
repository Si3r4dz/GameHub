import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { GameClientPlugin } from '@gamehub/core';
import { useSocket } from '../context/SocketContext';
import { useSocketConnection } from '../hooks/useSocketConnection';
import { useGameState } from '../hooks/useGameState';
import { useWakeLock } from '../hooks/useWakeLock';
import { ConnectionBar } from '../components/ConnectionBar';
import { getGamePlugin } from '../plugin-registry';

/** Generic patch handler that applies game:state-patch events to local state */
function defaultPatchHandler(state: unknown, patch: unknown): unknown {
  const p = patch as Record<string, unknown>;
  if (!p || !p.type) return state;

  // Yahtzee-specific patches
  if (p.type === 'score:changed') {
    const { category, playerIndex, value } = p as {
      category: string;
      playerIndex: number;
      value: string;
    };
    const s = (state as { values: Record<string, Record<number, string>> }) ?? {
      values: {},
    };
    return {
      ...s,
      values: {
        ...s.values,
        [category]: {
          ...s.values[category],
          [playerIndex]: value,
        },
      },
    };
  }

  if (p.type === 'reset') {
    const s = state as Record<string, unknown> ?? {};
    return { ...s, values: {} };
  }

  // Server sends full game:state for these — ignore patch
  if (
    p.type === 'round-advanced' ||
    p.type === 'game-finished' ||
    p.type === 'quiz:started' ||
    p.type === 'quiz:results' ||
    p.type === 'quiz:next-question' ||
    p.type === 'quiz:final'
  ) {
    return state;
  }

  // Quiz: timer tick — update timeRemaining locally
  if (p.type === 'quiz:timer-tick') {
    const s = state as Record<string, unknown> ?? {};
    return { ...s, timeRemaining: (p as { timeRemaining: number }).timeRemaining };
  }

  // Quiz: optimistic answer — immediately show selected option
  if (p.type === 'quiz:my-answer') {
    const { optionIndex } = p as { optionIndex: number };
    const s = state as { answers?: Record<number, unknown>; [k: string]: unknown } ?? {};
    // We don't know playerIndex here, so store it as a special key
    // The ControllerView reads from gameState.answers[playerIndex]
    // We'll use _myAnswer as a temporary local-only flag
    return { ...s, _myAnswer: { optionIndex } };
  }

  // Quiz: answer count — update on host screen
  if (p.type === 'quiz:answer-count') {
    const s = state as Record<string, unknown> ?? {};
    return { ...s, _answerCount: (p as { count: number }).count };
  }

  return state;
}

export function GamePage({ mode }: { mode: 'host' | 'controller' }) {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const socket = useSocket();
  const { status, connect } = useSocketConnection(socket);
  const game = useGameState(socket, gameId, defaultPatchHandler);
  const [plugin, setPlugin] = useState<GameClientPlugin | null>(null);
  useWakeLock();

  const hubId = sessionStorage.getItem('gamehub_hubId');

  // Connect with saved token
  useEffect(() => {
    if (!gameId) return;
    const tokenKey =
      mode === 'host' ? 'gamehub_token' : 'gamehub_ctrl_token';
    const token = sessionStorage.getItem(tokenKey);
    if (token) {
      connect(gameId, token);
    }
  }, [gameId, mode, connect]);

  // Load plugin when game type is known
  useEffect(() => {
    if (!game.gameType) return;
    getGamePlugin(game.gameType).then(setPlugin);
  }, [game.gameType]);

  if (!plugin) {
    return (
      <div style={{ textAlign: 'center', padding: 40 }}>Ładowanie gry...</div>
    );
  }

  // Show summary screen when game is finished
  if (game.phase === 'finished' && plugin.SummaryView) {
    const Summary = plugin.SummaryView;
    const returnToHub = hubId
      ? () => navigate(mode === 'host' ? `/hub/${hubId}` : `/hub/${hubId}/lobby`)
      : null;

    return (
      <div>
        <Summary
          gameId={gameId!}
          players={game.players}
          gameState={game.gameState}
          playerIndex={game.playerIndex}
          isHost={game.isHost}
          onAction={game.sendAction}
        />
        {returnToHub && (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <button
              className="btn-primary"
              onClick={returnToHub}
              style={{ padding: '12px 24px' }}
            >
              Wróć do GameHub
            </button>
          </div>
        )}
      </div>
    );
  }

  const ViewComponent =
    mode === 'host' ? plugin.HostView : plugin.ControllerView;

  return (
    <div>
      <ConnectionBar status={status} />
      <ViewComponent
        gameId={gameId!}
        players={game.players}
        gameState={game.gameState}
        playerIndex={game.playerIndex}
        isHost={game.isHost}
        onAction={game.sendAction}
      />
    </div>
  );
}
