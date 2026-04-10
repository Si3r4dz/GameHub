import type { GameServerPlugin, GameConfig, GameSession } from '@gamehub/core';
import {
  createInitialState,
  serializeForClient,
  reindexState,
} from './server/state.js';
import type { QuizState } from './server/state.js';
import { handleAction, validateAction } from './server/handlers.js';
import { onTick } from './server/tick.js';

const config: GameConfig = {
  id: 'quiz',
  name: 'Quiz',
  description: 'Quiz wielosobowy — odpowiadaj na czas!',
  minPlayers: 1,
  maxPlayers: 8,
  icon: '❓',
  color: '#8b5cf6',
};

export const serverPlugin: GameServerPlugin = {
  config,
  createInitialState,
  handleAction,
  serializeForClient,
  resetState: () => createInitialState(),
  onGameStart: (payload: unknown, session: GameSession) => {
    // Quiz starts in lobby-edit phase, actual quiz begins via 'start-quiz' action
    const state = session.gameState as QuizState;
    state.phase = 'lobby-edit';
  },
  onTick,
  reindexState,
  validateAction,
};
