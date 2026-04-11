import type { GameClientPlugin } from '@gamehub/core';
import { HostView } from './HostView';
import { ControllerView } from './ControllerView';
import { QuizSummary } from './QuizSummary';
import { pl } from './locales/pl';
import { en } from './locales/en';

export const clientPlugin: GameClientPlugin & { locales: Record<string, Record<string, string>> } = {
  locales: { pl, en },
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
