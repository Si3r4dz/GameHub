import type { GameClientPlugin, Player } from '@gamehub/core';
import { HostView } from './HostView';
import { ControllerView } from './ControllerView';
import { GameSummary } from './GameSummary';
import type { YahtzeeState } from './types';
import { calcSchoolSum, calcFigureSum, calcTotal } from './scoring';
import { pl } from './locales/pl';
import { en } from './locales/en';

export const clientPlugin: GameClientPlugin & { locales: Record<string, Record<string, string>> } = {
  locales: { pl, en },
  config: {
    id: 'yahtzee',
    name: 'Yahtzee',
    description: 'Klasyczna gra w kości — szkoła i figury',
    minPlayers: 1,
    maxPlayers: 8,
    icon: '🎲',
    color: '#2563eb',
  },
  HostView,
  ControllerView,
  SummaryView: GameSummary,
  getMiniScoreboardData: (gameState: unknown, players: Player[]) => {
    const state = gameState as YahtzeeState | null;
    const values = state?.values ?? {};
    return {
      rows: [
        {
          label: 'yahtzee.school',
          values: players.map((_, i) => calcSchoolSum(values, i)),
        },
        {
          label: 'yahtzee.figures',
          values: players.map((_, i) => calcFigureSum(values, i)),
        },
        {
          label: 'yahtzee.total',
          values: players.map((_, i) => calcTotal(values, i)),
          isTotal: true,
        },
      ],
    };
  },
};
