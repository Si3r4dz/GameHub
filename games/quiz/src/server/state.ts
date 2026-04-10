export interface Question {
  id: string;
  text: string;
  options: [string, string, string, string];
  correctIndex: number; // 0-3
}

export interface PlayerAnswer {
  optionIndex: number;
  answeredAt: number; // Date.now() on server
}

export interface QuestionResult {
  questionIndex: number;
  answers: Record<number, PlayerAnswer>;
  scores: Record<number, number>; // points earned this question
}

export type QuizPhase = 'lobby-edit' | 'question' | 'results' | 'final';

export interface QuizState {
  phase: QuizPhase;
  questions: Question[];
  currentQuestionIndex: number;
  timeLimit: number; // seconds per question
  timeRemaining: number;
  resultsTimeRemaining: number; // countdown during results phase
  answers: Record<number, PlayerAnswer>;
  scores: Record<number, number>; // cumulative
  questionResults: QuestionResult[];
}

const RESULTS_DISPLAY_TIME = 5; // seconds to show results before next question

export function createInitialState(): QuizState {
  return {
    phase: 'lobby-edit',
    questions: [],
    currentQuestionIndex: 0,
    timeLimit: 20,
    timeRemaining: 0,
    resultsTimeRemaining: 0,
    answers: {},
    scores: {},
    questionResults: [],
  };
}

export function calculateScore(
  timeRemaining: number,
  timeLimit: number,
  correct: boolean,
): number {
  if (!correct) return 0;
  // Base 500 points for correct answer + up to 500 bonus for speed
  return 500 + Math.round(500 * timeRemaining / timeLimit);
}

export function serializeForClient(
  gameState: unknown,
  isHost: boolean,
  playerIndex: number | null,
): unknown {
  const state = gameState as QuizState;

  // During question phase: hide correctIndex and other players' answers
  if (state.phase === 'question') {
    const sanitizedQuestions = state.questions.map((q, i) => {
      if (i === state.currentQuestionIndex) {
        return isHost ? q : { ...q, correctIndex: -1 }; // hide answer
      }
      return q;
    });

    const myAnswer =
      playerIndex !== null ? state.answers[playerIndex] : undefined;

    return {
      ...state,
      questions: sanitizedQuestions,
      answers: isHost
        ? state.answers
        : myAnswer
          ? { [playerIndex!]: myAnswer }
          : {},
    };
  }

  // During results/final: show everything
  return state;
}

export function reindexState(
  state: unknown,
  removedIndex: number,
): QuizState {
  const s = state as QuizState;

  const reindexRecord = <T>(rec: Record<number, T>): Record<number, T> => {
    const result: Record<number, T> = {};
    for (const [idxStr, val] of Object.entries(rec)) {
      const idx = parseInt(idxStr, 10);
      if (idx < removedIndex) result[idx] = val;
      else if (idx > removedIndex) result[idx - 1] = val;
    }
    return result;
  };

  return {
    ...s,
    answers: reindexRecord(s.answers),
    scores: reindexRecord(s.scores),
    questionResults: s.questionResults.map((qr) => ({
      ...qr,
      answers: reindexRecord(qr.answers),
      scores: reindexRecord(qr.scores),
    })),
  };
}

export { RESULTS_DISPLAY_TIME };
