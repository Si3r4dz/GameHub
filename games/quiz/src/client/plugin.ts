import type { GameClientPlugin } from '@gamehub/core';
import { HostView } from './HostView';
import { ControllerView } from './ControllerView';
import { QuizSummary } from './QuizSummary';

export const clientPlugin: GameClientPlugin = {
  config: {
    id: 'quiz',
    name: 'Quiz',
    description: 'Quiz wielosobowy — odpowiadaj na czas!',
    minPlayers: 1,
    maxPlayers: 8,
    icon: '❓',
    color: '#8b5cf6',
  },
  HostView,
  ControllerView,
  SummaryView: QuizSummary,
};
