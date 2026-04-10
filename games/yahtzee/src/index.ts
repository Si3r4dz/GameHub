import type { GameServerPlugin, GameConfig, GameSession } from '@gamehub/core';
import {
  createInitialState,
  serializeForClient,
  reindexState,
} from './server/state.js';
import type { YahtzeeState } from './server/state.js';
import {
  handleAction,
  validateAction,
} from './server/handlers.js';

const config: GameConfig = {
  id: 'yahtzee',
  name: 'Yahtzee',
  description: 'Klasyczna gra w kości — szkoła i figury',
  minPlayers: 1,
  maxPlayers: 8,
  icon: '🎲',
  color: '#2563eb',
};

export const serverPlugin: GameServerPlugin = {
  config,
  createInitialState,
  handleAction,
  serializeForClient,
  resetState: () => createInitialState(),
  onGameStart: (payload: unknown, session: GameSession) => {
    const { totalRounds } = (payload ?? {}) as { totalRounds?: number };
    if (totalRounds && totalRounds > 0) {
      const state = session.gameState as YahtzeeState;
      state.totalRounds = Math.max(1, Math.min(10, totalRounds));
    }
  },
  reindexState,
  validateAction,
};
