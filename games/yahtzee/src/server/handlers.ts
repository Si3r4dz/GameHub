import type { GameActionContext } from '@gamehub/core';
import { PLATFORM_EVENTS } from '@gamehub/core';
import type { YahtzeeState } from './state.js';
import { isRoundComplete, freezeRound } from './state.js';

export function handleAction(
  ctx: GameActionContext,
  action: string,
  payload: unknown,
): void {
  if (action === 'score:update') {
    const { category, playerIndex, value } = payload as {
      category: string;
      playerIndex: number;
      value: string;
    };

    ctx.updateState((state: unknown) => {
      const s = state as YahtzeeState;
      if (!s.values[category]) s.values[category] = {};
      s.values[category][playerIndex] = value;
      return s;
    });

    ctx.broadcastToOthers(PLATFORM_EVENTS.GAME_STATE_PATCH, {
      type: 'score:changed',
      category,
      playerIndex,
      value,
    });
    return;
  }

  if (action === 'game:reset') {
    ctx.updateState((state: unknown) => {
      const s = state as YahtzeeState;
      return { ...s, values: {} };
    });
    ctx.broadcastToOthers(PLATFORM_EVENTS.GAME_STATE_PATCH, {
      type: 'reset',
    });
    return;
  }

  if (action === 'configure') {
    // Called at game start to set totalRounds
    const { totalRounds } = payload as { totalRounds: number };
    ctx.updateState((state: unknown) => {
      const s = state as YahtzeeState;
      return { ...s, totalRounds: Math.max(1, Math.min(10, totalRounds)) };
    });
    return;
  }

  if (action === 'next-round') {
    const state = ctx.session.gameState as YahtzeeState;
    const playerCount = ctx.session.players.length;

    if (!isRoundComplete(state, playerCount)) return;

    const isLastRound = state.currentRound >= state.totalRounds - 1;

    ctx.updateState((_state: unknown) => {
      const s = _state as YahtzeeState;
      const roundData = freezeRound(s, playerCount);

      if (isLastRound) {
        // Last round — freeze but don't clear
        return {
          ...s,
          rounds: [...s.rounds, roundData],
        };
      }

      // More rounds to go — freeze current, clear values, advance
      return {
        ...s,
        rounds: [...s.rounds, roundData],
        values: {},
        currentRound: s.currentRound + 1,
      };
    });

    // Broadcast — for last round, signal game end
    ctx.broadcastToRoom(PLATFORM_EVENTS.GAME_STATE_PATCH, {
      type: isLastRound ? 'game-finished' : 'round-advanced',
    });
    return;
  }
}

export function validateAction(
  action: string,
  payload: unknown,
  _session: unknown,
  playerIndex: number | null,
  isHost: boolean,
): string | null {
  if (action === 'score:update') {
    const { playerIndex: targetIdx } = payload as { playerIndex: number };
    if (!isHost && playerIndex !== targetIdx) {
      return 'Brak uprawnień do edycji tej kolumny';
    }
  }

  if (action === 'game:reset' && !isHost) {
    return 'Tylko host może resetować grę';
  }

  if (action === 'next-round' && !isHost) {
    return 'Tylko host może przejść do następnej rundy';
  }

  if (action === 'configure' && !isHost) {
    return 'Tylko host może konfigurować grę';
  }

  return null;
}
