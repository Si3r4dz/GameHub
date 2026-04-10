export interface Question {
  id: string;
  text: string;
  options: [string, string, string, string];
  correctIndex: number; // -1 when hidden from player during question phase
}

export interface PlayerAnswer {
  optionIndex: number;
  answeredAt: number;
}

export interface QuestionResult {
  questionIndex: number;
  answers: Record<number, PlayerAnswer>;
  scores: Record<number, number>;
}

export type QuizPhase = 'lobby-edit' | 'question' | 'results' | 'final';

export interface QuizState {
  phase: QuizPhase;
  questions: Question[];
  currentQuestionIndex: number;
  timeLimit: number;
  timeRemaining: number;
  resultsTimeRemaining: number;
  answers: Record<number, PlayerAnswer>;
  scores: Record<number, number>;
  questionResults: QuestionResult[];
}
