import type { GameActionContext } from '@gamehub/core';
import { PLATFORM_EVENTS } from '@gamehub/core';
import type { QuizState, Question } from './state.js';
import { calculateScore } from './state.js';

export function handleAction(
  ctx: GameActionContext,
  action: string,
  payload: unknown,
): void {
  const state = ctx.session.gameState as QuizState;

  if (action === 'configure') {
    const { questions, timeLimit } = payload as {
      questions: Question[];
      timeLimit: number;
    };
    ctx.updateState((_s: unknown) => {
      const s = _s as QuizState;
      return {
        ...s,
        questions,
        timeLimit: Math.max(5, Math.min(60, timeLimit)),
      };
    });
    return;
  }

  if (action === 'start-quiz') {
    if (state.questions.length === 0) return;
    ctx.updateState((_s: unknown) => {
      const s = _s as QuizState;
      return {
        ...s,
        phase: 'question',
        currentQuestionIndex: 0,
        timeRemaining: s.timeLimit,
        answers: {},
        scores: initScores(ctx.session.players.length),
        questionResults: [],
      };
    });
    ctx.broadcastToRoom(PLATFORM_EVENTS.GAME_STATE_PATCH, {
      type: 'quiz:started',
    });
    return;
  }

  if (action === 'answer') {
    if (state.phase !== 'question') return;
    const { optionIndex } = payload as { optionIndex: number };
    const pi = ctx.playerIndex;
    if (pi === null) return;
    // Can't answer twice
    if (state.answers[pi]) return;

    ctx.updateState((_s: unknown) => {
      const s = _s as QuizState;
      return {
        ...s,
        answers: {
          ...s.answers,
          [pi]: { optionIndex, answeredAt: Date.now() },
        },
      };
    });

    // Notify others that someone answered (count only)
    const updatedState = ctx.session.gameState as QuizState;
    const answerCount = Object.keys(updatedState.answers).length;
    ctx.broadcastToRoom(PLATFORM_EVENTS.GAME_STATE_PATCH, {
      type: 'quiz:answer-count',
      count: answerCount,
    });

    // All players answered → skip to results immediately
    if (answerCount >= ctx.session.players.length) {
      advanceToResults(ctx);
    }
    return;
  }

  if (action === 'skip-question') {
    if (state.phase !== 'question') return;
    advanceToResults(ctx);
    return;
  }

  if (action === 'next-question') {
    if (state.phase !== 'results') return;
    advanceToNextQuestion(ctx);
    return;
  }
}

function advanceToResults(ctx: GameActionContext) {
  const state = ctx.session.gameState as QuizState;
  const question = state.questions[state.currentQuestionIndex];
  const playerCount = ctx.session.players.length;

  // Calculate scores for this question
  const questionScores: Record<number, number> = {};
  for (let i = 0; i < playerCount; i++) {
    const answer = state.answers[i];
    if (!answer) {
      questionScores[i] = 0;
      continue;
    }
    const correct = answer.optionIndex === question.correctIndex;
    // Use the time remaining when they answered (approximate from server timestamp)
    const answerTime = (answer.answeredAt - (Date.now() - state.timeLimit * 1000 + state.timeRemaining * 1000)) / 1000;
    const effectiveTimeRemaining = Math.max(0, Math.min(state.timeLimit, answerTime));
    questionScores[i] = calculateScore(effectiveTimeRemaining, state.timeLimit, correct);
  }

  ctx.updateState((_s: unknown) => {
    const s = _s as QuizState;
    const newScores = { ...s.scores };
    for (const [idx, pts] of Object.entries(questionScores)) {
      newScores[parseInt(idx, 10)] = (newScores[parseInt(idx, 10)] || 0) + pts;
    }

    return {
      ...s,
      phase: 'results' as const,
      timeRemaining: 0,
      resultsTimeRemaining: 5,
      questionResults: [
        ...s.questionResults,
        {
          questionIndex: s.currentQuestionIndex,
          answers: { ...s.answers },
          scores: questionScores,
        },
      ],
      scores: newScores,
    };
  });

  ctx.broadcastToRoom(PLATFORM_EVENTS.GAME_STATE_PATCH, { type: 'quiz:results' });
}

function advanceToNextQuestion(ctx: GameActionContext) {
  const state = ctx.session.gameState as QuizState;
  const nextIndex = state.currentQuestionIndex + 1;

  if (nextIndex >= state.questions.length) {
    // Game over
    ctx.session.phase = 'finished'; // platform phase → triggers SummaryView
    ctx.updateState((_s: unknown) => {
      const s = _s as QuizState;
      return { ...s, phase: 'final' as const, resultsTimeRemaining: 0 };
    });
    ctx.broadcastToRoom(PLATFORM_EVENTS.GAME_STATE_PATCH, { type: 'quiz:final' });
    return;
  }

  ctx.updateState((_s: unknown) => {
    const s = _s as QuizState;
    return {
      ...s,
      phase: 'question' as const,
      currentQuestionIndex: nextIndex,
      timeRemaining: s.timeLimit,
      resultsTimeRemaining: 0,
      answers: {},
    };
  });

  ctx.broadcastToRoom(PLATFORM_EVENTS.GAME_STATE_PATCH, { type: 'quiz:next-question' });
}

function initScores(playerCount: number): Record<number, number> {
  const scores: Record<number, number> = {};
  for (let i = 0; i < playerCount; i++) scores[i] = 0;
  return scores;
}

export function validateAction(
  action: string,
  _payload: unknown,
  _session: unknown,
  playerIndex: number | null,
  isHost: boolean,
): string | null {
  if (action === 'configure' && !isHost) return 'Tylko host może konfigurować quiz';
  if (action === 'start-quiz' && !isHost) return 'Tylko host może rozpocząć quiz';
  if (action === 'skip-question' && !isHost) return 'Tylko host może pominąć pytanie';
  if (action === 'next-question' && !isHost) return 'Tylko host może przejść dalej';
  if (action === 'answer' && playerIndex === null && !isHost) return 'Musisz być graczem';
  return null;
}

export { advanceToResults, advanceToNextQuestion };
