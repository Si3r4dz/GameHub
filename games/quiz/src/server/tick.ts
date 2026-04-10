import type { GameSession } from '@gamehub/core';
import { PLATFORM_EVENTS } from '@gamehub/core';
import type { QuizState } from './state.js';
import { RESULTS_DISPLAY_TIME, calculateScore } from './state.js';

/**
 * Called every second by the platform.
 * Returns true when a full state refresh is needed (phase transitions).
 */
export function onTick(
  session: GameSession,
  broadcastToRoom: (event: string, data: unknown) => void,
): boolean {
  const state = session.gameState as QuizState;

  if (state.phase === 'question' && state.timeRemaining > 0) {
    state.timeRemaining -= 1;

    // Broadcast timer tick for smooth client countdown
    broadcastToRoom(PLATFORM_EVENTS.GAME_STATE_PATCH, {
      type: 'quiz:timer-tick',
      timeRemaining: state.timeRemaining,
    });

    if (state.timeRemaining <= 0) {
      // Time's up — calculate scores and advance to results
      const question = state.questions[state.currentQuestionIndex];
      const playerCount = session.players.length;
      const questionScores: Record<number, number> = {};

      for (let i = 0; i < playerCount; i++) {
        const answer = state.answers[i];
        if (!answer) {
          questionScores[i] = 0;
          continue;
        }
        const correct = answer.optionIndex === question.correctIndex;
        const timeWhenAnswered = state.timeLimit - Math.floor(
          (Date.now() - answer.answeredAt) / 1000,
        );
        const effectiveTime = Math.max(0, Math.min(state.timeLimit, timeWhenAnswered));
        questionScores[i] = calculateScore(effectiveTime, state.timeLimit, correct);
      }

      for (const [idx, pts] of Object.entries(questionScores)) {
        state.scores[parseInt(idx, 10)] =
          (state.scores[parseInt(idx, 10)] || 0) + pts;
      }

      state.questionResults.push({
        questionIndex: state.currentQuestionIndex,
        answers: { ...state.answers },
        scores: questionScores,
      });

      state.phase = 'results';
      state.resultsTimeRemaining = RESULTS_DISPLAY_TIME;

      return true; // full state refresh needed
    }
    return false;
  }

  if (state.phase === 'results' && state.resultsTimeRemaining > 0) {
    state.resultsTimeRemaining -= 1;

    if (state.resultsTimeRemaining <= 0) {
      const nextIndex = state.currentQuestionIndex + 1;

      if (nextIndex >= state.questions.length) {
        state.phase = 'final';
        session.phase = 'finished'; // platform phase → triggers SummaryView
      } else {
        state.currentQuestionIndex = nextIndex;
        state.timeRemaining = state.timeLimit;
        state.resultsTimeRemaining = 0;
        state.answers = {};
        state.phase = 'question';
      }

      return true; // full state refresh needed
    }
    return false;
  }

  return false;
}
